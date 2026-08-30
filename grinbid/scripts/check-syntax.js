'use strict';

/**
 * check-syntax.js — audit checkpoint #2.
 * Validates syntax of every backend and frontend JS file with `node --check`,
 * and verifies there are zero production npm dependencies declared.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'test', 'scripts']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

let failures = 0;

// 1. Zero npm dependencies (checkpoint #1).
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const depNames = Object.keys(deps);
if (depNames.length > 0) {
  console.error(`✗ FAIL: npm dependencies found: ${depNames.join(', ')}`);
  failures += 1;
} else {
  console.log('✓ Zero npm dependencies.');
}

// 2. Syntax across backend and frontend (checkpoint #2).
const files = walk(ROOT);
for (const file of files) {
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(`✗ FAIL: syntax error in ${path.relative(ROOT, file)}\n${res.stderr}`);
    failures += 1;
  }
}
console.log(`✓ Syntax checked: ${files.length} JS files (backend + public).`);

// 3. package.json scripts sanity.
if (!pkg.scripts || !pkg.scripts.start) {
  console.error('✗ FAIL: package.json missing start script.');
  failures += 1;
} else {
  console.log('✓ package.json start script present.');
}

console.log(failures === 0 ? 'CHECK-PASS: syntax + dependency audit passed.' : `CHECK-FAIL: ${failures} issue(s).`);
process.exit(failures === 0 ? 0 : 1);
