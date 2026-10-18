// SPDX-License-Identifier: GPL-3.0-or-later
// Dependency-free linter: syntax check of all JS files plus simple project rules.
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = ['js', 'tests', 'scripts'];
const JS_EXTENSION = '.js';
const TEST_SUFFIX = '.test.js';
const TEST_MARKER = 'KI-generiert';
const LICENSE_MARKER = 'SPDX-License-Identifier: GPL-3.0-or-later';
const FORBIDDEN_PATTERNS = [
  { pattern: /\bconsole\.log\(/, message: 'do not use console.log in production code' },
  { pattern: /\bdebugger\b/, message: 'debugger statement found' },
  { pattern: /\bvar\s/, message: 'var used instead of const/let' },
];
const PRODUCTION_DIR = 'js';

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }
    return entry.name.endsWith(JS_EXTENSION) ? [fullPath] : [];
  });
}

function checkSyntax(file) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    return [];
  } catch (error) {
    return [String(error.stderr).trim()];
  }
}

function checkRules(file) {
  const relative = path.relative(ROOT, file);
  const source = fs.readFileSync(file, 'utf8');
  const problems = [];
  if (!source.includes(LICENSE_MARKER)) {
    problems.push(`${relative}: missing SPDX license header`);
  }
  if (relative.endsWith(TEST_SUFFIX) && !source.includes(TEST_MARKER)) {
    problems.push(`${relative}: test is not marked as "${TEST_MARKER}"`);
  }
  if (relative.startsWith(PRODUCTION_DIR + path.sep)) {
    FORBIDDEN_PATTERNS.forEach(({ pattern, message }) => {
      if (pattern.test(source)) {
        problems.push(`${relative}: ${message}`);
      }
    });
  }
  return problems;
}

const files = SOURCE_DIRS.flatMap((dir) => listFiles(path.join(ROOT, dir)));
const problems = files.flatMap((file) => [...checkSyntax(file), ...checkRules(file)]);

if (problems.length > 0) {
  process.stderr.write(`${problems.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(`Lint OK (${files.length} files checked)\n`);
