import {
  accessSync,
  appendFileSync,
  chmodSync,
  constants,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { platform, arch, homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROBE_TIMEOUT_MS = 3_000;
const BROWSER_SMOKE_TIMEOUT_MS = 12_000;
const MIN_NODE_MAJOR = 22;
const isWindows = process.platform === 'win32';

const bashCandidates = isWindows
  ? [
      process.env.WORLDBOXSR_BASH,
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe'
    ]
  : [process.env.WORLDBOXSR_BASH, commandPath('bash')];
const bash = bashCandidates.filter(Boolean).find(isExecutableFile) ?? null;

const commandExecutables = {
  bash,
  curl: isWindows ? 'curl.exe' : 'curl',
  npm: isWindows ? 'npm.cmd' : 'npm',
  node: isWindows ? 'node.exe' : 'node'
};

const browserCandidates = isWindows
  ? [
      process.env.WORLDBOXSR_BROWSER,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Chromium\\Application\\chrome.exe'
    ]
  : [
      process.env.WORLDBOXSR_BROWSER,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ];

const failures = [];
const commands = Object.fromEntries(Object.entries(commandExecutables).map(([name, executable]) => [name, commandVersion(name, executable)]));
for (const [command, result] of Object.entries(commands)) {
  if (!result.available) failures.push(`missing or unresponsive required command: ${command}${result.error ? ` (${result.error})` : ''}`);
}

const nodeMajor = Number.parseInt(String(commands.node?.version ?? '').match(/v?(\d+)/u)?.[1] ?? '', 10);
if (!Number.isInteger(nodeMajor) || nodeMajor < MIN_NODE_MAJOR) {
  failures.push(`Node ${MIN_NODE_MAJOR}+ is required for the reusable runner; detected ${commands.node?.version || 'unknown'}`);
}

if (bash && commands.bash?.available) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `WORLDBOXSR_BASH=${bash}\n`);
  if (process.env.GITHUB_PATH) appendFileSync(process.env.GITHUB_PATH, `${dirname(bash)}\n`);
}

const browser = browserCandidates.filter(Boolean).find(isExecutableFile)
  ?? commandPath('google-chrome-stable')
  ?? commandPath('google-chrome')
  ?? commandPath('chromium')
  ?? commandPath('chromium-browser');
const browserSmoke = browser ? probeHeadlessBrowser(browser) : null;
const browserVersion = browser ? optionalBrowserVersion(browser) : null;
if (!browser) {
  failures.push('Chrome/Chromium not found. Install a reusable system browser or set WORLDBOXSR_BROWSER.');
} else if (!browserSmoke?.available) {
  failures.push(`Chrome/Chromium could not complete a bounded headless smoke for ${browser}: ${browserSmoke?.error ?? 'unknown error'}`);
}

let browserShim = null;
if (browser && browserSmoke?.available) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `WORLDBOXSR_BROWSER=${browser}\n`);
  browserShim = installBrowserShim();
}

const report = {
  runner: {
    name: process.env.RUNNER_NAME ?? null,
    os: process.env.RUNNER_OS ?? platform(),
    arch: process.env.RUNNER_ARCH ?? arch(),
    environment: process.env.RUNNER_ENVIRONMENT ?? null,
    workspace: process.env.GITHUB_WORKSPACE ?? process.cwd(),
    temp: process.env.RUNNER_TEMP ?? null,
    home: homedir()
  },
  contract: {
    minimumNodeMajor: MIN_NODE_MAJOR,
    commandProbeTimeoutMs: PROBE_TIMEOUT_MS,
    browserSmokeTimeoutMs: BROWSER_SMOKE_TIMEOUT_MS,
    bashEnvExported: Boolean(bash && commands.bash?.available && process.env.GITHUB_ENV),
    browserEnvExported: Boolean(browser && browserSmoke?.available && process.env.GITHUB_ENV),
    browserShim
  },
  commands,
  browser: browser ? {
    path: browser,
    headlessSmoke: browserSmoke,
    versionProbe: browserVersion
  } : null,
  cache: {
    npm: process.env.npm_config_cache ?? null,
    githubWorkspace: process.env.GITHUB_WORKSPACE ?? null
  },
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) {
  console.error(`Self-hosted runner preflight failed:\n- ${failures.join('\n- ')}`);
  process.exit(2);
}

function commandVersion(name, executable) {
  if (!executable) {
    return { available: false, version: '', path: null, error: 'not found' };
  }
  const probe = runProbe(executable, ['--version']);
  return {
    available: probe.status === 0 && !probe.error,
    version: firstLine(probe.stdout || probe.stderr),
    path: isExecutableFile(executable) ? executable : commandPath(executable),
    error: probeError(probe, PROBE_TIMEOUT_MS)
  };
}

function commandPath(command) {
  const locator = isWindows ? 'where.exe' : 'which';
  const result = runProbe(locator, [command]);
  if (result.status !== 0 || result.error) return null;
  return firstLine(result.stdout) || null;
}

function optionalBrowserVersion(file) {
  if (isWindows) {
    return { available: false, version: null, error: 'not required on Windows; headless smoke is authoritative' };
  }
  const result = runProbe(file, ['--version']);
  return {
    available: result.status === 0 && !result.error,
    version: firstLine(result.stdout || result.stderr) || null,
    error: probeError(result, PROBE_TIMEOUT_MS)
  };
}

function probeHeadlessBrowser(file) {
  const profile = mkdtempSync(join(tmpdir(), 'worldboxsr-runner-browser-probe-'));
  try {
    const result = spawnSync(file, [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      `--user-data-dir=${profile}`,
      '--dump-dom',
      'data:text/html,<title>WorldBoxSRRunnerProbe</title><main>ok</main>'
    ], {
      encoding: 'utf8',
      timeout: BROWSER_SMOKE_TIMEOUT_MS,
      windowsHide: true
    });
    const output = String(result.stdout ?? '');
    const available = result.status === 0 && !result.error && output.includes('WorldBoxSRRunnerProbe');
    return {
      available,
      exitCode: result.status,
      markerFound: output.includes('WorldBoxSRRunnerProbe'),
      error: available ? null : probeError(result, BROWSER_SMOKE_TIMEOUT_MS) ?? firstLine(result.stderr) ?? 'headless marker missing'
    };
  } finally {
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
  }
}

function installBrowserShim() {
  if (!process.env.RUNNER_TEMP || !process.env.GITHUB_PATH) return null;
  const shimDir = join(process.env.RUNNER_TEMP, 'worldboxsr-bin');
  const shimPath = join(shimDir, 'google-chrome-stable');
  mkdirSync(shimDir, { recursive: true });
  writeFileSync(shimPath, '#!/usr/bin/env bash\nexec "$WORLDBOXSR_BROWSER" "$@"\n');
  try { chmodSync(shimPath, 0o755); } catch {}
  appendFileSync(process.env.GITHUB_PATH, `${shimDir}\n`);
  return shimPath;
}

function runProbe(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    timeout: PROBE_TIMEOUT_MS,
    windowsHide: true
  });
}

function probeError(result, timeoutMs) {
  if (!result.error) return null;
  if (result.error.code === 'ETIMEDOUT') return `timed out after ${timeoutMs}ms`;
  return result.error.code || result.error.message || String(result.error);
}

function isExecutableFile(file) {
  try {
    accessSync(file, isWindows ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function firstLine(value) {
  return String(value ?? '').trim().split(/\r?\n/u)[0] ?? '';
}
