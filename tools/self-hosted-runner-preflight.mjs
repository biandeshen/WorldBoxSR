import { accessSync, appendFileSync, chmodSync, constants, mkdirSync, writeFileSync } from 'node:fs';
import { platform, arch, homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const REQUIRED_COMMANDS = ['bash', 'curl', 'npm', 'node'];
const PROBE_TIMEOUT_MS = 3_000;
const MIN_NODE_MAJOR = 22;
const browserCandidates = process.platform === 'win32'
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
const commands = Object.fromEntries(REQUIRED_COMMANDS.map((command) => [command, commandVersion(command)]));
for (const [command, result] of Object.entries(commands)) {
  if (!result.available) failures.push(`missing or unresponsive required command: ${command}${result.error ? ` (${result.error})` : ''}`);
}

const nodeMajor = Number.parseInt(String(commands.node?.version ?? '').match(/v?(\d+)/u)?.[1] ?? '', 10);
if (!Number.isInteger(nodeMajor) || nodeMajor < MIN_NODE_MAJOR) {
  failures.push(`Node ${MIN_NODE_MAJOR}+ is required for the reusable runner; detected ${commands.node?.version || 'unknown'}`);
}

const browser = browserCandidates.filter(Boolean).find(isExecutableFile)
  ?? commandPath('google-chrome-stable')
  ?? commandPath('google-chrome')
  ?? commandPath('chromium')
  ?? commandPath('chromium-browser');
const browserProbe = browser ? executableVersion(browser) : null;
if (!browser) failures.push('Chrome/Chromium not found. Install a reusable system browser or set WORLDBOXSR_BROWSER.');
else if (!browserProbe?.available) failures.push(`Chrome/Chromium version probe failed for ${browser}: ${browserProbe?.error ?? 'unknown error'}`);

let browserShim = null;
if (browser && browserProbe?.available) {
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `WORLDBOXSR_BROWSER=${browser}\n`);
  browserShim = installBrowserShim(browser);
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
    probeTimeoutMs: PROBE_TIMEOUT_MS,
    browserEnvExported: Boolean(browser && process.env.GITHUB_ENV),
    browserShim
  },
  commands,
  browser: browser ? { path: browser, ...browserProbe } : null,
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

function commandVersion(command) {
  const probe = runProbe(command, ['--version']);
  return {
    available: probe.status === 0 && !probe.error,
    version: firstLine(probe.stdout || probe.stderr),
    path: commandPath(command),
    error: probeError(probe)
  };
}

function commandPath(command) {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const result = runProbe(locator, [command]);
  if (result.status !== 0 || result.error) return null;
  return firstLine(result.stdout) || null;
}

function executableVersion(file) {
  const result = runProbe(file, ['--version']);
  return {
    available: result.status === 0 && !result.error,
    version: firstLine(result.stdout || result.stderr),
    error: probeError(result)
  };
}

function installBrowserShim(file) {
  if (!process.env.RUNNER_TEMP || !process.env.GITHUB_PATH) return null;
  const shimDir = join(process.env.RUNNER_TEMP, 'worldboxsr-bin');
  const shimPath = join(shimDir, 'google-chrome-stable');
  mkdirSync(shimDir, { recursive: true });
  writeFileSync(shimPath, `#!/usr/bin/env node\nconst { spawnSync } = require('node:child_process');\nconst result = spawnSync(${JSON.stringify(file)}, process.argv.slice(2), { stdio: 'inherit', windowsHide: true });\nif (result.error) { console.error(result.error); process.exit(1); }\nprocess.exit(result.status ?? 1);\n`);
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

function probeError(result) {
  if (!result.error) return null;
  if (result.error.code === 'ETIMEDOUT') return `timed out after ${PROBE_TIMEOUT_MS}ms`;
  return result.error.code || result.error.message || String(result.error);
}

function isExecutableFile(file) {
  try {
    accessSync(file, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function firstLine(value) {
  return String(value ?? '').trim().split(/\r?\n/u)[0] ?? '';
}
