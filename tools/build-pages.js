#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(new URL('..', import.meta.url))));
const outputName = process.env.PAGES_OUT_DIR || '.pages';
const output = resolve(root, outputName);
const runtimeDirs = ['client', 'engine', 'content'];

if (output === root || !output.startsWith(`${root}/`) && !output.startsWith(`${root}\\`)) {
  throw new Error(`Pages output must stay inside repository root: ${output}`);
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const directory of runtimeDirs) {
  const source = join(root, directory);
  if (!existsSync(source)) throw new Error(`Missing browser runtime directory: ${directory}`);
  cpSync(source, join(output, directory), { recursive: true });
}

const clientIndex = readFileSync(join(root, 'client', 'index.html'), 'utf8');
const pageIndex = clientIndex.replace('src="./main.js"', 'src="./client/main.js"');
if (pageIndex === clientIndex) {
  throw new Error('client/index.html no longer contains the expected ./main.js module entrypoint');
}
writeFileSync(join(output, 'index.html'), pageIndex);
writeFileSync(join(output, '.nojekyll'), '');

validateBrowserGraph(output);

console.log(`WorldBoxSR Pages site built at ${outputName}`);

function validateBrowserGraph(siteRoot) {
  const rootIndex = readFileSync(join(siteRoot, 'index.html'), 'utf8');
  if (!rootIndex.includes('src="./client/main.js"')) {
    throw new Error('Pages root index does not point at ./client/main.js');
  }

  const entrypoint = join(siteRoot, 'client', 'main.js');
  if (!existsSync(entrypoint)) throw new Error('Missing Pages browser entrypoint: client/main.js');

  for (const directory of runtimeDirs) {
    walk(join(siteRoot, directory), (path) => {
      if (!path.endsWith('.js')) return;
      validateModuleImports(path, siteRoot);
    });
  }
}

function validateModuleImports(path, siteRoot) {
  const source = readFileSync(path, 'utf8');
  const importPattern = /(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g;
  let match;
  while ((match = importPattern.exec(source)) !== null) {
    const specifier = match[1];
    if (specifier.startsWith('node:')) {
      throw new Error(`Browser graph imports Node builtin ${specifier} from ${relative(path, siteRoot)}`);
    }
    if (!specifier.startsWith('.')) continue;
    const target = resolve(dirname(path), specifier);
    if (!target.startsWith(siteRoot)) {
      throw new Error(`Browser import escapes Pages artifact: ${relative(path, siteRoot)} -> ${specifier}`);
    }
    if (!existsSync(target)) {
      throw new Error(`Unresolved browser import: ${relative(path, siteRoot)} -> ${specifier}`);
    }
  }
}

function walk(directory, visit) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path, visit);
    else visit(path);
  }
}

function relative(path, base) {
  return path.slice(base.length + 1).replaceAll('\\', '/');
}
