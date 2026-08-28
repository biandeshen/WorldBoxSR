import { accessSync, constants } from 'node:fs';
import { platform, arch, homedir } from 'node:os';
import { spawnSync } from 'node:child_process';

const REQUIRED_COMMANDS = ['bash', 'curl', 'npm', 'node'];
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
  if (!result.available) failures.push(`missing required command: ${command}`);
}

const browser = browserCandidates.filter(Boolean).find(isExecutableFile) ?? commandPath('google-chrome-stable') ?? commandPath('google-chrome') ?? commandPath('chromium') ?? commandPath('chromium-browser');
if (!browser) failures.push('Chrome/Chromium not found. Set WORLDBOXSR_BROWSER or install a reusable system browser.');

const report = {
  runner: {
    name: process.env.RUNNER_NAME ?? null,
    os: process.env.RUNNER_OS ?? platform(),
    arch: process.env.RUNNER_ARCH ?? arch(),
    environment: process.env.RUNNER_ENVIRONMENT ?? null,
    workspace: process.env.GITHUB_WORKSPACE ?? process.cwd(),
    home: homedir()
  },
  commands,
  browser: browser ? { path: browser, version: executableVersion(browser) } : null,
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
  const probe = spawnSync(command, ['--version'], { encoding: 'utf8' });
  return {
    available: probe.status === 0,
    version: firstLine(probe.stdout || probe.stderr),
    path: commandPath(command)
  };
}

function commandPath(command) {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(locator, [command], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return firstLine(result.stdout) || null;
}

function executableVersion(file) {
  const result = spawnSync(file, ['--version'], { encoding: 'utf8' });
  return firstLine(result.stdout || result.stderr) || null;
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
