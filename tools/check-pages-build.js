import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('.pages');
const indexPath = path.join(outputDir, 'index.html');
const playIndexPath = path.join(outputDir, 'play', 'index.html');
const assetsDir = path.join(outputDir, 'assets');

const [html, playHtml, assets, sourceRoot, sourcePlay] = await Promise.all([
  readFile(indexPath, 'utf8'),
  readFile(playIndexPath, 'utf8'),
  readdir(assetsDir),
  readFile(path.resolve('index.html'), 'utf8'),
  readFile(path.resolve('play/index.html'), 'utf8')
]);

verifyCompiledGame(html, 'Pages artifact root');
verifyCompiledGame(playHtml, 'Pages artifact /play/');

if (!assets.some((name) => name.endsWith('.js'))) {
  throw new Error('Pages artifact has no compiled JavaScript bundle');
}

if (!sourceRoot.includes('url=./play/') || !sourceRoot.includes("new URL('./play/', window.location.href)")) {
  throw new Error('Legacy branch Pages root does not redirect to /play/');
}

if (!sourcePlay.includes('<title>WorldBoxSR — Playable World</title>')
  || !sourcePlay.includes('id="phaser-root"')
  || !sourcePlay.includes('id="power-dock"')
  || !sourcePlay.includes('https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.esm.js')
  || !sourcePlay.includes('../client/bootstrap.js')) {
  throw new Error('Legacy branch Pages /play/ fallback is not a runnable WorldBoxSR game page');
}

console.log(`Pages artifact OK: / + /play/ game aliases, ${assets.length} compiled asset(s), legacy branch fallback guarded`);

function verifyCompiledGame(document, label) {
  if (!document.includes('<title>WorldBoxSR — Playable World</title>')
    || !document.includes('id="phaser-root"')
    || !document.includes('id="power-dock"')) {
    throw new Error(`${label} is not the WorldBoxSR game page`);
  }

  if (!/\/WorldBoxSR\/assets\/[^"']+\.js/.test(document)) {
    throw new Error(`${label} does not reference a compiled JavaScript asset under /WorldBoxSR/assets/`);
  }
}
