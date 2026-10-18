// SPDX-License-Identifier: GPL-3.0-or-later
// KI-generiert: Unit tests for js/format.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../js/config.js');
const i18n = require('../js/i18n.js');
const { formatBytes, formatResolution, formatList } = require('../js/format.js');

const { SYMBOLS } = config;

test.beforeEach(() => i18n.setLanguage('en'));

test('formatBytes shows bytes without decimals', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
});

test('formatBytes converts to larger units', () => {
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(2.5 * 1024 * 1024), '2.5 MB');
});

test('formatBytes uses the number format of the active language', () => {
  i18n.setLanguage('de');
  assert.equal(formatBytes(1536), '1,5 KB');
  assert.equal(formatBytes(null), 'unbekannt');
});

test('formatBytes caps at the largest unit', () => {
  const huge = 1024 ** 6;
  assert.match(formatBytes(huge), / TB$/);
});

test('formatBytes returns "unknown" for invalid values', () => {
  [null, undefined, -1, Number.NaN, Infinity, '100'].forEach((value) => {
    assert.equal(formatBytes(value), 'unknown');
  });
});

test('formatResolution formats valid dimensions', () => {
  assert.equal(formatResolution(4000, 3000), '4000 × 3000');
});

test('formatResolution returns "unknown" for missing dimensions', () => {
  assert.equal(formatResolution(null, 3000), i18n.t('UNKNOWN'));
  assert.equal(formatResolution(4000, 0), i18n.t('UNKNOWN'));
  assert.equal(formatResolution('4000', 3000), i18n.t('UNKNOWN'));
});

test('formatList joins entries', () => {
  assert.equal(formatList(['A', 'B'], 'empty'), 'A, B');
});

test('formatList shows the empty text for an empty list', () => {
  assert.equal(formatList([], 'empty'), 'empty');
});

test('formatList shows a placeholder when not loaded', () => {
  assert.equal(formatList(null, 'empty'), SYMBOLS.NOT_LOADED);
  assert.equal(formatList(undefined, 'empty'), SYMBOLS.NOT_LOADED);
});
