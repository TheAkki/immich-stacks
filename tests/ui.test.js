// SPDX-License-Identifier: GPL-3.0-or-later
// KI-generiert: Unit tests for js/ui.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../js/config.js');
const i18n = require('../js/i18n.js');
const ui = require('../js/ui.js');
const { FakeDocument } = require('./helpers/fake-dom.js');

const { SYMBOLS } = config;
const { t } = i18n;

test.beforeEach(() => i18n.setLanguage('en'));

function makeAssetInfo(overrides = {}) {
  return {
    id: 'a1',
    fileName: 'IMG_1.jpg',
    path: '/photos/IMG_1.jpg',
    width: 4000,
    height: 3000,
    fileSize: 1536,
    albums: ['Vacation'],
    tags: ['Family'],
    isPrimary: false,
    ...overrides,
  };
}

function makeStackInfo(overrides = {}) {
  return {
    id: 's1',
    primaryAssetId: 'a1',
    assets: [makeAssetInfo({ isPrimary: true }), makeAssetInfo({ id: 'a2', fileName: 'IMG_2.jpg' })],
    detailsLoaded: true,
    ...overrides,
  };
}

const noop = () => {};

test('el sets class, text, attributes and children', () => {
  const doc = new FakeDocument();
  const child = doc.createElement('span');
  const element = ui.el(doc, 'div', { className: 'x', text: 'Hello', attrs: { title: 't' } }, [child]);
  assert.equal(element.className, 'x');
  assert.equal(element.textContent, 'Hello');
  assert.equal(element.getAttribute('title'), 't');
  assert.equal(element.children[0], child);
});

test('el works without options', () => {
  const element = ui.el(new FakeDocument(), 'p');
  assert.equal(element.tagName, 'P');
  assert.equal(element.className, '');
});

test('renderAssetCard shows all image information', () => {
  const { card, thumbnail } = ui.renderAssetCard(new FakeDocument(), makeAssetInfo(), { onRemove: noop });
  const text = card.allText();
  ['IMG_1.jpg', '/photos/IMG_1.jpg', '4000 × 3000', '1.5 KB', 'Vacation', 'Family'].forEach((expected) => {
    assert.ok(text.includes(expected), expected);
  });
  assert.equal(card.getAttribute('data-asset-id'), 'a1');
  assert.equal(thumbnail.getAttribute('alt'), 'Preview of IMG_1.jpg');
  assert.equal(card.findByClass('badge').length, 0);
});

test('renderAssetCard shows empty texts without albums, tags and path', () => {
  const asset = makeAssetInfo({ albums: [], tags: [], path: '' });
  const text = ui.renderAssetCard(new FakeDocument(), asset, { onRemove: noop }).card.allText();
  assert.ok(text.includes(t('NO_ALBUMS')));
  assert.ok(text.includes(t('NO_TAGS')));
  assert.ok(text.includes(SYMBOLS.EMPTY_VALUE));
});

test('renderAssetCard marks the primary image', () => {
  const { card } = ui.renderAssetCard(new FakeDocument(), makeAssetInfo({ isPrimary: true }), { onRemove: noop });
  assert.equal(card.findByClass('badge')[0].textContent, t('LABEL_PRIMARY'));
});

test('renderAssetCard calls onRemove with the image', () => {
  const asset = makeAssetInfo();
  let removed = null;
  const { card } = ui.renderAssetCard(new FakeDocument(), asset, { onRemove: (a) => (removed = a) });
  const button = card.findByTag('button')[0];
  assert.equal(button.textContent, t('BUTTON_REMOVE_ASSET'));
  assert.equal(button.getAttribute('type'), 'button');
  button.click();
  assert.equal(removed, asset);
});

test('renderStackGroup renders heading, cards and thumbnails', () => {
  const stack = makeStackInfo();
  const { element, thumbnails } = ui.renderStackGroup(new FakeDocument(), stack, {
    onRemoveAsset: noop,
    onDeleteStack: noop,
  });
  assert.equal(element.getAttribute('data-stack-id'), 's1');
  assert.equal(element.findByTag('h2')[0].textContent, 'Stack with 2 images');
  assert.equal(element.findByClass('asset-card').length, 2);
  assert.deepEqual(thumbnails.map((t) => t.assetId), ['a1', 'a2']);
  assert.equal(element.findByClass('notice').length, 0);
});

test('renderAssetCard shows no "set as primary" button without handler', () => {
  const { card } = ui.renderAssetCard(new FakeDocument(), makeAssetInfo(), { onRemove: noop });
  assert.ok(!card.allText().includes(t('BUTTON_SET_PRIMARY')));
});

test('renderStackGroup offers "set as primary" only for non-primary images', () => {
  const calls = [];
  const { element } = ui.renderStackGroup(new FakeDocument(), makeStackInfo(), {
    onRemoveAsset: noop,
    onSetPrimary: (stack, asset) => calls.push([stack.id, asset.id]),
    onDeleteStack: noop,
  });
  const [primaryCard, otherCard] = element.findByClass('asset-card');
  const buttonTexts = (card) => card.findByTag('button').map((button) => button.textContent);
  assert.deepEqual(buttonTexts(primaryCard), ['Remove from stack']);
  assert.deepEqual(buttonTexts(otherCard), ['Set as primary image', 'Remove from stack']);
  otherCard.findByTag('button')[0].click();
  assert.deepEqual(calls, [['s1', 'a2']]);
});

test('renderStackGroup offers no "set as primary" in a single-image stack', () => {
  const stack = makeStackInfo({ assets: [makeAssetInfo({ isPrimary: false })] });
  const { element } = ui.renderStackGroup(new FakeDocument(), stack, {
    onRemoveAsset: noop,
    onSetPrimary: noop,
    onDeleteStack: noop,
  });
  assert.ok(!element.allText().includes(t('BUTTON_SET_PRIMARY')));
});

test('renderStackGroup uses the singular heading for a single image', () => {
  const stack = makeStackInfo({ assets: [makeAssetInfo({ isPrimary: true })] });
  const { element } = ui.renderStackGroup(new FakeDocument(), stack, { onRemoveAsset: noop, onDeleteStack: noop });
  assert.equal(element.findByTag('h2')[0].textContent, 'Stack with 1 image');
  i18n.setLanguage('de');
  const german = ui.renderStackGroup(new FakeDocument(), stack, { onRemoveAsset: noop, onDeleteStack: noop });
  assert.equal(german.element.findByTag('h2')[0].textContent, 'Stack mit 1 Bild');
});

test('renderStackGroup forwards actions with the stack', () => {
  const stack = makeStackInfo();
  const calls = [];
  const { element } = ui.renderStackGroup(new FakeDocument(), stack, {
    onRemoveAsset: (s, a) => calls.push(['remove', s.id, a.id]),
    onDeleteStack: (s) => calls.push(['delete', s.id]),
  });
  element.findByClass('button--danger')[0].click();
  const secondCard = element.findByClass('asset-card')[1];
  secondCard.findByTag('button').find((button) => button.textContent === t('BUTTON_REMOVE_ASSET')).click();
  assert.deepEqual(calls, [['delete', 's1'], ['remove', 's1', 'a2']]);
});

test('renderStackGroup shows a loading notice without details', () => {
  const { element } = ui.renderStackGroup(new FakeDocument(), makeStackInfo({ detailsLoaded: false }), {
    onRemoveAsset: noop,
    onDeleteStack: noop,
  });
  assert.equal(element.findByClass('notice')[0].textContent, t('DETAILS_LOADING'));
});

test('renderStackGroup shows an error notice', () => {
  const { element } = ui.renderStackGroup(new FakeDocument(), makeStackInfo({ detailsLoaded: false }), {
    onRemoveAsset: noop,
    onDeleteStack: noop,
    detailsError: 'HTTP 500',
  });
  const notice = element.findByClass('notice--error')[0];
  assert.equal(notice.textContent, 'Details could not be loaded: HTTP 500');
});

test('setStatus sets text and kind', () => {
  const statusElement = new FakeDocument().createElement('p');
  ui.setStatus(statusElement, 'Error!', config.STATUS_KINDS.ERROR);
  assert.equal(statusElement.textContent, 'Error!');
  assert.equal(statusElement.className, 'status status--error');
  ui.setStatus(statusElement, 'Info');
  assert.equal(statusElement.className, 'status status--info');
});

test('displayName returns the file name or "unknown"', () => {
  assert.equal(ui.displayName({ fileName: 'a.jpg' }), 'a.jpg');
  assert.equal(ui.displayName({ fileName: '' }), 'unknown');
});

test('renderAssetCard is translated into German', () => {
  i18n.setLanguage('de');
  const text = ui.renderAssetCard(new FakeDocument(), makeAssetInfo({ isPrimary: true }), { onRemove: noop }).card.allText();
  ['Dateiname', 'Auflösung', '1,5 KB', 'Hauptbild', 'Aus Stack entfernen'].forEach((expected) => {
    assert.ok(text.includes(expected), expected);
  });
});

test('applyStaticTexts translates texts, attributes, title and lang', () => {
  const doc = new FakeDocument();
  config.STATIC_TEXTS.forEach(({ id }) => doc.register(id));
  ui.applyStaticTexts(doc);
  assert.equal(doc.getElementById('label-server').textContent, 'Immich server');
  assert.equal(doc.getElementById('load-button').textContent, 'Load stacks');
  assert.equal(doc.getElementById('filter').getAttribute('placeholder'), t('FILTER_PLACEHOLDER'));
  assert.equal(doc.title, 'Immich Stacks');
  assert.equal(doc.documentElement.lang, 'en');
});

test('applyStaticTexts skips missing elements', () => {
  const doc = new FakeDocument();
  assert.doesNotThrow(() => ui.applyStaticTexts(doc));
});

test('renderLanguageOptions creates one option per language', () => {
  const doc = new FakeDocument();
  const select = doc.createElement('select');
  ui.renderLanguageOptions(doc, select, i18n.availableLanguages());
  assert.deepEqual(select.children.map((option) => option.getAttribute('value')), ['en', 'de']);
  assert.deepEqual(select.children.map((option) => option.textContent), ['English', 'Deutsch']);
});
