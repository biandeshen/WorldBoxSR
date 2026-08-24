import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('.pages');
const indexPath = path.join(outputDir, 'index.html');
const assetsDir = path.join(outputDir, 'assets');

const html = await readFile(indexPath, 'utf8');
const assets = await readdir(assetsDir);

if (!html.includes('WorldBoxSR')) {
  throw new Error('Pages artifact index.html is not the WorldBoxSR game page');
}

if (!/\/WorldBoxSR\/assets\/[^"']+\.js/.test(html)) {
  throw new Error('Pages artifact does not reference a compiled JavaScript asset under /WorldBoxSR/assets/');
}

if (!assets.some((name) => name.endsWith('.js'))) {
  throw new Error('Pages artifact has no compiled JavaScript bundle');
}

console.log(`Pages artifact OK: game index + ${assets.length} compiled asset(s)`);
