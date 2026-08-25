#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('.pages');
const rootIndex = path.join(outputDir, 'index.html');
const playDir = path.join(outputDir, 'play');
const playIndex = path.join(playDir, 'index.html');

const html = await readFile(rootIndex, 'utf8');
if (!html.includes('<title>WorldBoxSR — Playable World</title>')) {
  throw new Error('Vite output is not the WorldBoxSR playable page');
}

await mkdir(playDir, { recursive: true });
await copyFile(rootIndex, playIndex);
await writeFile(path.join(outputDir, '.nojekyll'), '');

console.log('WorldBoxSR Pages aliases ready: / and /play/');
