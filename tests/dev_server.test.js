import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('dev server honors HOST and serves the client', async (t) => {
  const port = 20000 + (process.pid % 10000);
  const expectedUrl = `http://0.0.0.0:${port}`;
  const child = spawn(process.execPath, ['tools/serve.js'], {
    cwd: root,
    env: { ...process.env, HOST: '0.0.0.0', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  t.after(() => {
    if (!child.killed) child.kill('SIGTERM');
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  await new Promise((resolveReady, rejectReady) => {
    const timer = setTimeout(() => {
      rejectReady(new Error(`dev server did not become ready; stdout=${stdout} stderr=${stderr}`));
    }, 3000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.includes(expectedUrl)) {
        clearTimeout(timer);
        resolveReady();
      }
    });

    child.once('exit', (code) => {
      clearTimeout(timer);
      rejectReady(new Error(`dev server exited early with code ${code}; stderr=${stderr}`));
    });
  });

  const response = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /^text\/html/);
  assert.match(await response.text(), /<canvas/i);
});
