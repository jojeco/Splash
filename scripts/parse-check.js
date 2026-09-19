// Syntax check for the app sources, no device or bundler needed: npm run check:parse
// Tier 1: parse everything with babel-preset-expo (real JSX/Flow-aware parse).
// Tier 2: same, using @babel/plugin-syntax-jsx if the preset can't be loaded.
// Tier 3: `node --check` on non-JSX files only; JSX files are reported unchecked.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'assets', '.expo']);

function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

function load(name) {
  try {
    return require(require.resolve(name, { paths: [root] }));
  } catch (e) {
    return null;
  }
}

function pickParser() {
  const babel = load('@babel/core');
  if (!babel) return null;
  const preset = load('babel-preset-expo');
  if (preset) {
    return { tier: 'babel-preset-expo', parse: (code, file) => babel.parseSync(code, { filename: file, configFile: false, babelrc: false, presets: [require.resolve('babel-preset-expo', { paths: [root] })] }) };
  }
  const jsx = load('@babel/plugin-syntax-jsx');
  if (jsx) {
    return { tier: '@babel/plugin-syntax-jsx', parse: (code, file) => babel.parseSync(code, { filename: file, configFile: false, babelrc: false, plugins: [require.resolve('@babel/plugin-syntax-jsx', { paths: [root] })], sourceType: 'unambiguous' }) };
  }
  return null;
}

const files = collect(root).sort();
const rel = (f) => path.relative(root, f);
const failures = [];
const unchecked = [];
const parser = pickParser();

if (parser) {
  for (const file of files) {
    try {
      const ast = parser.parse(fs.readFileSync(file, 'utf8'), file);
      if (!ast) throw new Error('parser returned no AST');
    } catch (err) {
      failures.push(`${rel(file)}: ${String(err.message).split('\n')[0]}`);
    }
  }
  console.log(`parser: ${parser.tier}`);
} else {
  console.log('parser: node --check (babel unavailable; JSX files are NOT checked)');
  for (const file of files) {
    if (/<[A-Za-z][^>]*>/.test(fs.readFileSync(file, 'utf8')) && /from 'react'/.test(fs.readFileSync(file, 'utf8'))) {
      unchecked.push(rel(file));
      continue;
    }
    // .js files with ESM syntax fail --check under CommonJS, so check as a module.
    const res = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: fs.readFileSync(file), encoding: 'utf8' });
    if (res.status !== 0) failures.push(`${rel(file)}: ${(res.stderr || '').split('\n').find((l) => l.includes('Error')) || 'syntax error'}`);
  }
}

console.log(`${files.length - unchecked.length - failures.length}/${files.length} files parsed cleanly`);
if (unchecked.length) console.log(`unchecked (JSX): ${unchecked.join(', ')}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
