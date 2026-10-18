// SPDX-License-Identifier: GPL-3.0-or-later
// KI-generiert: Unit tests for js/i18n.js and the language files in js/locales/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../js/config.js');
const i18n = require('../js/i18n.js');

const sourceLocale = require(`../js/locales/${config.DEFAULT_LANGUAGE}.js`);
const sourceKeys = Object.keys(sourceLocale.messages).sort();

test.beforeEach(() => i18n.setLanguage(config.DEFAULT_LANGUAGE));

test('source language is English', () => {
  assert.equal(config.DEFAULT_LANGUAGE, 'en');
  assert.equal(i18n.getLanguage(), 'en');
});

config.SUPPORTED_LANGUAGES.forEach((code) => {
  const locale = require(`../js/locales/${code}.js`);

  test(`language "${code}" has metadata`, () => {
    assert.ok(locale.meta.name);
    assert.doesNotThrow(() => (1.5).toLocaleString(locale.meta.numberLocale));
  });

  test(`language "${code}" has exactly the keys of the source language`, () => {
    assert.deepEqual(Object.keys(locale.messages).sort(), sourceKeys);
  });

  test(`language "${code}" has no empty texts and the same placeholders`, () => {
    const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort();
    sourceKeys.forEach((key) => {
      assert.ok(locale.messages[key].trim(), key);
      assert.deepEqual(placeholders(locale.messages[key]), placeholders(sourceLocale.messages[key]), key);
    });
  });
});

test('fillTemplate replaces known and keeps unknown placeholders', () => {
  assert.equal(i18n.fillTemplate('{a} and {b}', { a: 1, b: 'two' }), '1 and two');
  assert.equal(i18n.fillTemplate('{a} {missing}', { a: 'x' }), 'x {missing}');
  assert.equal(i18n.fillTemplate('plain'), 'plain');
});

test('availableLanguages lists all supported languages with names', () => {
  assert.deepEqual(i18n.availableLanguages(), [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ]);
});

test('resolveLanguage handles region codes and letter case', () => {
  assert.equal(i18n.resolveLanguage(['de-AT']), 'de');
  assert.equal(i18n.resolveLanguage(['DE_ch']), 'de');
  assert.equal(i18n.resolveLanguage(['fr', 'de']), 'de');
});

test('resolveLanguage falls back to the source language', () => {
  assert.equal(i18n.resolveLanguage(['fr', null, '']), 'en');
  assert.equal(i18n.resolveLanguage(), 'en');
});

test('setLanguage sets supported and rejects unknown languages', () => {
  assert.equal(i18n.setLanguage('de'), 'de');
  assert.equal(i18n.getNumberLocale(), 'de-DE');
  assert.equal(i18n.setLanguage('xx'), 'en');
  assert.equal(i18n.getNumberLocale(), 'en-US');
});

test('t translates with placeholders', () => {
  assert.equal(i18n.t('STATUS_LOADED', { count: 3 }), '3 stacks loaded.');
  i18n.setLanguage('de');
  assert.equal(i18n.t('STATUS_LOADED', { count: 3 }), '3 Stacks geladen.');
});

test('t returns the key when no text exists', () => {
  assert.equal(i18n.t('DOES_NOT_EXIST'), 'DOES_NOT_EXIST');
});
