// SPDX-License-Identifier: GPL-3.0-or-later
// KI-generiert: Unit tests for js/app.js (with fake DOM and fake Immich server)
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../js/config.js');
const i18n = require('../js/i18n.js');
const { createApp, bootstrap } = require('../js/app.js');
const { FakeDocument } = require('./helpers/fake-dom.js');
const { makeStack, jsonResponse, createFakeServer, flush } = require('./helpers/fixtures.js');

const { ELEMENT_IDS, STORAGE_KEYS, STATIC_TEXTS } = config;
const { t } = i18n;
const SERVER_URL = 'https://immich.example.org';
const SETTLE_ROUNDS = 10;

async function settle() {
  for (let round = 0; round < SETTLE_ROUNDS; round += 1) {
    await flush();
  }
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
  };
}

class FakeObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = new Set();
    this.disconnected = false;
    FakeObserver.instances.push(this);
  }

  observe(element) {
    this.observed.add(element);
  }

  unobserve(element) {
    this.observed.delete(element);
  }

  disconnect() {
    this.disconnected = true;
  }

  trigger(element, isIntersecting = true) {
    this.callback([{ target: element, isIntersecting }], this);
  }
}
FakeObserver.instances = [];

function registerAll(doc) {
  Object.values(ELEMENT_IDS).forEach((id) => doc.register(id));
  STATIC_TEXTS.forEach(({ id }) => doc.register(id));
}

function setup({
  server = {},
  confirmResult = true,
  observer = false,
  storage = memoryStorage(),
  languages = ['en'],
} = {}) {
  const doc = new FakeDocument();
  const els = {};
  Object.entries(ELEMENT_IDS).forEach(([key, id]) => {
    els[key] = doc.register(id);
  });
  STATIC_TEXTS.forEach(({ id }) => doc.register(id));
  const fakeServer = createFakeServer(server);
  const questions = [];
  const urls = { created: [], revoked: [] };
  FakeObserver.instances = [];
  const app = createApp({
    doc,
    storage,
    fetchFn: fakeServer.fetchFn,
    confirmFn: (question) => {
      questions.push(question);
      return confirmResult;
    },
    createObjectUrl: (blob) => {
      const url = `blob:${blob.blobOf}`;
      urls.created.push(url);
      return url;
    },
    revokeObjectUrl: (url) => urls.revoked.push(url),
    IntersectionObserverCtor: observer ? FakeObserver : undefined,
    languages,
  });
  app.init();
  els.SERVER_URL.value = SERVER_URL;
  els.TOKEN.value = 'token';
  els.AUTH_TYPE.value = config.AUTH_TYPES.API_KEY;
  const groups = () => els.STACK_LIST.children;
  return { app, doc, els, server: fakeServer.state, questions, urls, storage, groups };
}

const twoStacks = () => [makeStack('s1', ['a1', 'a2', 'a3']), makeStack('s2', ['b1', 'b2'])];

test('init restores the stored server URL and auth type', () => {
  const doc = new FakeDocument();
  registerAll(doc);
  const storage = memoryStorage({
    [STORAGE_KEYS.SERVER_URL]: SERVER_URL,
    [STORAGE_KEYS.AUTH_TYPE]: config.AUTH_TYPES.BEARER,
  });
  createApp({ doc, storage }).init();
  assert.equal(doc.getElementById(ELEMENT_IDS.SERVER_URL).value, SERVER_URL);
  assert.equal(doc.getElementById(ELEMENT_IDS.AUTH_TYPE).value, config.AUTH_TYPES.BEARER);
});

test('init tolerates missing or broken storage', () => {
  const throwing = {
    getItem: () => {
      throw new Error('blocked');
    },
  };
  [null, throwing].forEach((storage) => {
    const doc = new FakeDocument();
    registerAll(doc);
    assert.doesNotThrow(() => createApp({ doc, storage }).init());
    assert.equal(doc.getElementById(ELEMENT_IDS.SERVER_URL).value, '');
  });
});

test('an invalid server URL shows an error and calls no API', async () => {
  const { app, els, server } = setup();
  els.SERVER_URL.value = 'not a server';
  await app.loadStacks();
  assert.equal(els.STATUS.textContent, t('STATUS_INVALID_URL'));
  assert.match(els.STATUS.className, /status--error/);
  assert.equal(server.calls.length, 0);
});

test('a missing token shows an error', async () => {
  const { app, els, server } = setup();
  els.TOKEN.value = '   ';
  await app.loadStacks();
  assert.equal(els.STATUS.textContent, t('STATUS_MISSING_TOKEN'));
  assert.equal(server.calls.length, 0);
});

test('form submit loads stacks and prevents a page reload', async () => {
  const { els, groups } = setup({ server: { stacks: twoStacks() } });
  const event = els.FORM.dispatch('submit');
  await settle();
  assert.equal(event.defaultPrevented, true);
  assert.equal(groups().length, 2);
});

test('loadStacks renders groups with details, albums, tags and thumbnails', async () => {
  const { app, els, groups, server, storage } = setup({
    server: {
      stacks: twoStacks(),
      albums: { a1: [{ albumName: 'Vacation' }] },
      tags: { a2: [{ name: 'Grandma', value: 'Family/Grandma' }] },
    },
  });
  await app.loadStacks();
  await settle();

  assert.equal(els.STATUS.textContent, '2 stacks loaded.');
  assert.equal(els.SUMMARY.textContent, 'Showing 2 of 2 stacks');
  assert.equal(els.LOAD_BUTTON.disabled, false);
  assert.equal(groups().length, 2);
  const firstText = groups()[0].allText();
  ['Vacation', 'Family/Grandma', 'a1.jpg', '/photos/a1.jpg', '4000 × 3000', '2.0 KB', t('LABEL_PRIMARY')].forEach(
    (expected) => assert.ok(firstText.includes(expected), expected),
  );
  assert.equal(groups()[0].findByClass('notice').length, 0);
  const images = groups()[0].findByTag('img');
  assert.deepEqual(images.map((img) => img.src), ['blob:thumb-a1', 'blob:thumb-a2', 'blob:thumb-a3']);
  assert.ok(server.calls.every((call) => call.headers['x-api-key'] === 'token'));
  assert.equal(storage.data.get(STORAGE_KEYS.SERVER_URL), SERVER_URL);
  assert.ok(![...storage.data.values()].includes('token'), 'the token must not be stored');
});

test('loadStacks reports when no stacks exist', async () => {
  const { app, els, groups } = setup();
  await app.loadStacks();
  assert.equal(els.STATUS.textContent, t('STATUS_NO_STACKS'));
  assert.equal(els.SUMMARY.textContent, '');
  assert.equal(groups().length, 0);
});

test('loadStacks treats a null response as an empty list', async () => {
  const { app, els } = setup({ server: { failures: { 'GET /api/stacks': () => jsonResponse(undefined) } } });
  await app.loadStacks();
  assert.equal(els.STATUS.textContent, t('STATUS_NO_STACKS'));
});

test('loadStacks shows API errors and re-enables the button', async () => {
  const { app, els } = setup({
    server: { failures: { 'GET /api/stacks': () => jsonResponse({ message: 'Invalid API key' }, 401) } },
  });
  await app.loadStacks();
  assert.equal(els.STATUS.textContent, 'Error: HTTP 401: Invalid API key');
  assert.equal(els.LOAD_BUTTON.disabled, false);
});

test('with IntersectionObserver, details load only once visible', async () => {
  const { app, groups, server } = setup({ server: { stacks: twoStacks() }, observer: true });
  await app.loadStacks();
  await settle();
  const observer = FakeObserver.instances[0];
  assert.equal(observer.options.rootMargin, config.LAZY_LOAD_ROOT_MARGIN);
  assert.equal(observer.observed.size, 2);
  assert.equal(groups()[0].findByClass('notice')[0].textContent, t('DETAILS_LOADING'));
  assert.ok(!server.calls.some((call) => call.path.startsWith('/api/assets')));

  observer.trigger(groups()[1], false);
  await settle();
  assert.ok(!server.calls.some((call) => call.path.startsWith('/api/assets')));

  observer.trigger(groups()[0]);
  await settle();
  assert.equal(groups()[0].findByClass('notice').length, 0);
  assert.equal(groups()[1].findByClass('notice').length, 1);
  assert.equal(observer.observed.size, 1);
});

test('loadDetails ignores unknown and already loaded stacks', async () => {
  const { app, server } = setup({ server: { stacks: twoStacks() } });
  await app.loadStacks();
  await settle();
  const callCount = server.calls.length;
  await app.loadDetails('s1');
  await app.loadDetails('does-not-exist');
  assert.equal(server.calls.length, callCount);
});

test('errors while loading details are shown in the group', async () => {
  const { app, groups } = setup({
    server: {
      stacks: [makeStack('s1', ['a1', 'a2'])],
      failures: { 'GET /api/assets/a1': () => jsonResponse({ message: 'broken' }, 500) },
    },
  });
  await app.loadStacks();
  await settle();
  const notice = groups()[0].findByClass('notice--error')[0];
  assert.equal(notice.textContent, 'Details could not be loaded: HTTP 500: broken');
});

test('missing thumbnails are marked', async () => {
  const { app, groups } = setup({
    server: {
      stacks: [makeStack('s1', ['a1', 'a2'])],
      failures: { 'GET /api/assets/a1/thumbnail': () => jsonResponse({}, 404) },
    },
  });
  await app.loadStacks();
  await settle();
  const [missing, ok] = groups()[0].findByTag('img');
  assert.match(missing.className, /thumbnail--missing/);
  assert.equal(ok.src, 'blob:thumb-a2');
});

test('the filter hides non-matching stacks and updates the summary', async () => {
  const { app, els, groups } = setup({ server: { stacks: twoStacks() } });
  await app.loadStacks();
  await settle();
  els.FILTER.value = 'b2.jpg';
  els.FILTER.dispatch('input');
  assert.deepEqual(groups().map((group) => group.hidden), [true, false]);
  assert.equal(els.SUMMARY.textContent, 'Showing 1 of 2 stacks');
  els.FILTER.value = '';
  app.applyFilter();
  assert.deepEqual(groups().map((group) => group.hidden), [false, false]);
});

test('remove image from stack: cancelling the dialog changes nothing', async () => {
  const { app, server, questions } = setup({ server: { stacks: twoStacks() }, confirmResult: false });
  await app.loadStacks();
  await settle();
  const stack = app.state.stacks[0];
  await app.handleRemoveAsset(stack, stack.assets[1]);
  assert.match(questions[0], /a2\.jpg/);
  assert.match(questions[0], /will NOT be deleted/);
  assert.ok(!server.calls.some((call) => call.method === 'DELETE'));
});

test('removing an image from a stack updates the group', async () => {
  const { app, els, groups, server } = setup({ server: { stacks: twoStacks() } });
  await app.loadStacks();
  await settle();
  const stack = app.state.stacks[0];
  await app.handleRemoveAsset(stack, stack.assets[1]);
  await settle();

  const deletes = server.calls.filter((call) => call.method === 'DELETE');
  assert.deepEqual(deletes.map((call) => call.path), ['/api/stacks/s1/assets/a2']);
  assert.equal(els.STATUS.textContent, 'Image “a2.jpg” was removed from the stack. The file is kept.');
  assert.equal(groups()[0].findByClass('asset-card').length, 2);
  assert.equal(groups()[0].findByTag('h2')[0].textContent, 'Stack with 2 images');
  assert.equal(app.state.busy, false);
});

test('removing an image when Immich dissolves the stack removes the group', async () => {
  const { app, els, groups } = setup({ server: { stacks: twoStacks() }, observer: true });
  await app.loadStacks();
  const stack = app.state.stacks[1];
  await app.handleRemoveAsset(stack, stack.assets[0]);
  assert.equal(els.STATUS.textContent, t('STATUS_STACK_DISSOLVED', { name: 'b1.jpg' }));
  assert.equal(groups().length, 1);
  assert.equal(els.SUMMARY.textContent, 'Showing 1 of 1 stacks');
  assert.equal(FakeObserver.instances[0].observed.size, 1);
});

test('errors while removing are shown', async () => {
  const { app, els, groups } = setup({
    server: {
      stacks: twoStacks(),
      failures: { 'DELETE /api/stacks/s1/assets/a2': () => jsonResponse({ message: 'Forbidden' }, 403) },
    },
  });
  await app.loadStacks();
  const stack = app.state.stacks[0];
  await app.handleRemoveAsset(stack, stack.assets[1]);
  assert.equal(els.STATUS.textContent, 'Error: HTTP 403: Forbidden');
  assert.equal(groups().length, 2);
  assert.equal(app.state.busy, false);
});

test('errors while reloading the stack (not 404) are shown', async () => {
  const { app, els } = setup({
    server: {
      stacks: twoStacks(),
      failures: { 'GET /api/stacks/s1': () => jsonResponse({ message: 'Oops' }, 500) },
    },
  });
  await app.loadStacks();
  const stack = app.state.stacks[0];
  await app.handleRemoveAsset(stack, stack.assets[1]);
  assert.equal(els.STATUS.textContent, 'Error: HTTP 500: Oops');
});

test('deleting a stack removes only the stack, never images', async () => {
  const { app, els, groups, server, questions } = setup({ server: { stacks: twoStacks() } });
  await app.loadStacks();
  await settle();
  await app.handleDeleteStack(app.state.stacks[0]);

  assert.match(questions[0], /3 images/);
  const deletes = server.calls.filter((call) => call.method === 'DELETE');
  assert.deepEqual(deletes.map((call) => call.path), ['/api/stacks/s1']);
  assert.equal(els.STATUS.textContent, t('STATUS_STACK_DELETED'));
  assert.equal(groups().length, 1);
  assert.equal(groups()[0].getAttribute('data-stack-id'), 's2');
  assert.equal(app.state.stacks.length, 1);
});

test('delete stack: cancelling the dialog changes nothing', async () => {
  const { app, server, groups } = setup({ server: { stacks: twoStacks() }, confirmResult: false });
  await app.loadStacks();
  await app.handleDeleteStack(app.state.stacks[0]);
  assert.ok(!server.calls.some((call) => call.method === 'DELETE'));
  assert.equal(groups().length, 2);
});

test('further actions are ignored while an action is running', async () => {
  const { app, server, questions } = setup({ server: { stacks: twoStacks() } });
  await app.loadStacks();
  const first = app.handleDeleteStack(app.state.stacks[0]);
  await app.handleDeleteStack(app.state.stacks[1]);
  await app.handleRemoveAsset(app.state.stacks[1], app.state.stacks[1].assets[0]);
  await first;
  assert.equal(questions.length, 1);
  assert.equal(server.calls.filter((call) => call.method === 'DELETE').length, 1);
});

test('reloading resets the view and releases thumbnail URLs', async () => {
  const { app, groups, urls } = setup({ server: { stacks: twoStacks() }, observer: true });
  await app.loadStacks();
  FakeObserver.instances[0].trigger(groups()[0]);
  await settle();
  assert.equal(urls.created.length, 3);

  await app.loadStacks();
  assert.equal(FakeObserver.instances[0].disconnected, true);
  assert.deepEqual(urls.revoked, urls.created);
  assert.equal(groups().length, 2);
  assert.equal(FakeObserver.instances.length, 2);
});

test('stale detail results after reloading are discarded', async () => {
  const { app, groups } = setup({ server: { stacks: twoStacks() }, observer: true });
  await app.loadStacks();
  FakeObserver.instances[0].trigger(groups()[0]);
  await app.loadStacks();
  await settle();
  assert.equal(groups()[0].findByClass('notice')[0].textContent, t('DETAILS_LOADING'));
});

test('stale detail errors after reloading are discarded', async () => {
  const { app, groups } = setup({
    server: {
      stacks: twoStacks(),
      failures: { 'GET /api/assets/a1': () => jsonResponse({}, 500) },
    },
    observer: true,
  });
  await app.loadStacks();
  FakeObserver.instances[0].trigger(groups()[0]);
  await app.loadStacks();
  await settle();
  assert.equal(groups()[0].findByClass('notice--error').length, 0);
});

test('bootstrap wires up the browser APIs', async () => {
  const doc = new FakeDocument();
  registerAll(doc);
  const calls = [];
  const win = {
    document: doc,
    localStorage: memoryStorage({ [STORAGE_KEYS.SERVER_URL]: SERVER_URL }),
    fetch(url, init) {
      calls.push({ self: this, url, init });
      return Promise.resolve(jsonResponse([]));
    },
    confirm: () => true,
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
    navigator: { languages: ['de-DE', 'en'] },
  };
  const app = bootstrap(win);
  assert.equal(i18n.getLanguage(), 'de');
  assert.equal(doc.getElementById(ELEMENT_IDS.SERVER_URL).value, SERVER_URL);
  doc.getElementById(ELEMENT_IDS.TOKEN).value = 'token';
  await app.loadStacks();
  assert.equal(calls[0].self, win);
  assert.equal(doc.getElementById(ELEMENT_IDS.STATUS).textContent, t('STATUS_NO_STACKS'));
});

test('bootstrap tolerates blocked localStorage', () => {
  const doc = new FakeDocument();
  registerAll(doc);
  const win = {
    document: doc,
    get localStorage() {
      throw new Error('SecurityError');
    },
    fetch: () => Promise.resolve(jsonResponse([])),
    confirm: () => true,
    URL: {},
  };
  assert.doesNotThrow(() => bootstrap(win));
});

test('without a stored language, the browser language is used', () => {
  const { doc, els } = setup({ languages: ['de-AT', 'en'] });
  assert.equal(i18n.getLanguage(), 'de');
  assert.equal(els.LANGUAGE.value, 'de');
  assert.equal(doc.getElementById('label-server').textContent, 'Immich-Server');
  assert.deepEqual(els.LANGUAGE.children.map((option) => option.getAttribute('value')), ['en', 'de']);
});

test('an unsupported browser language falls back to English (source language)', () => {
  const { doc } = setup({ languages: ['fr-FR'] });
  assert.equal(i18n.getLanguage(), 'en');
  assert.equal(doc.getElementById('load-button').textContent, 'Load stacks');
  assert.equal(doc.documentElement.lang, 'en');
});

test('the stored language takes precedence over the browser language', () => {
  setup({ languages: ['de'], storage: memoryStorage({ [STORAGE_KEYS.LANGUAGE]: 'en' }) });
  assert.equal(i18n.getLanguage(), 'en');
});

test('switching language translates groups, status and summary and stores the choice', async () => {
  const { app, els, groups, storage } = setup({ server: { stacks: twoStacks() }, languages: ['de'] });
  await app.loadStacks();
  await settle();
  assert.equal(els.STATUS.textContent, '2 Stacks geladen.');

  els.LANGUAGE.value = 'en';
  els.LANGUAGE.dispatch('change');

  assert.equal(storage.data.get(STORAGE_KEYS.LANGUAGE), 'en');
  assert.equal(els.STATUS.textContent, '2 stacks loaded.');
  assert.equal(els.SUMMARY.textContent, 'Showing 2 of 2 stacks');
  assert.equal(groups()[0].findByTag('h2')[0].textContent, 'Stack with 3 images');
  assert.deepEqual(groups()[0].findByTag('img').map((img) => img.src), ['blob:thumb-a1', 'blob:thumb-a2', 'blob:thumb-a3']);
});

test('switching language also translates error messages', async () => {
  const { app, groups } = setup({
    languages: ['de'],
    server: {
      stacks: [makeStack('s1', ['a1', 'a2'])],
      failures: {
        'GET /api/assets/a1': () => {
          throw new TypeError('offline');
        },
      },
    },
  });
  await app.loadStacks();
  await settle();
  assert.match(groups()[0].findByClass('notice--error')[0].textContent, /Netzwerkfehler/);
  app.changeLanguage('en');
  assert.match(groups()[0].findByClass('notice--error')[0].textContent, /^Details could not be loaded: Network error/);
});

test('status errors are re-translated on language change', async () => {
  const { app, els } = setup({ languages: ['de'] });
  els.TOKEN.value = '';
  await app.loadStacks();
  assert.equal(els.STATUS.textContent, i18n.t('STATUS_MISSING_TOKEN'));
  app.changeLanguage('en');
  assert.equal(els.STATUS.textContent, 'Please enter an access token or API key.');
});

test('switching language before loading leaves the status empty', () => {
  const { app, els } = setup();
  app.changeLanguage('de');
  assert.equal(els.STATUS.textContent, '');
});

test('switching language keeps lazy loading of stacks not yet visible', async () => {
  const { app, groups, server } = setup({ server: { stacks: twoStacks() }, observer: true });
  await app.loadStacks();
  app.changeLanguage('de');
  await settle();
  const observer = FakeObserver.instances[0];
  assert.ok(!server.calls.some((call) => call.path.startsWith('/api/assets')), 'no details/thumbnails without visibility');
  assert.equal(observer.observed.size, 2);
  assert.ok(observer.observed.has(groups()[0]), 'the new element is observed');

  observer.trigger(groups()[0]);
  await settle();
  assert.equal(groups()[0].findByClass('notice').length, 0);
});

test('the single-image filter shows only stacks with exactly one image', async () => {
  const stacks = [...twoStacks(), makeStack('s3', ['c1'])];
  const { app, els, groups } = setup({ server: { stacks } });
  await app.loadStacks();
  await settle();

  els.FILTER_SINGLE_IMAGE.checked = true;
  els.FILTER_SINGLE_IMAGE.dispatch('change');
  assert.deepEqual(groups().map((group) => group.hidden), [true, true, false]);
  assert.equal(els.SUMMARY.textContent, 'Showing 1 of 3 stacks');

  els.FILTER.value = 'a1.jpg';
  els.FILTER.dispatch('input');
  assert.deepEqual(groups().map((group) => group.hidden), [true, true, true]);

  els.FILTER_SINGLE_IMAGE.checked = false;
  els.FILTER_SINGLE_IMAGE.dispatch('change');
  assert.deepEqual(groups().map((group) => group.hidden), [false, true, true]);
});

test('the single-image filter is re-applied after a stack was updated', async () => {
  const { app, els, groups } = setup({ server: { stacks: [makeStack('s1', ['a1', 'a2', 'a3'])] } });
  await app.loadStacks();
  await settle();
  els.FILTER_SINGLE_IMAGE.checked = true;
  app.applyFilter();
  assert.equal(groups()[0].hidden, true);

  const stack = app.state.stacks[0];
  await app.handleRemoveAsset(stack, stack.assets[2]);
  assert.equal(groups()[0].findByClass('asset-card').length, 2);
  assert.equal(groups()[0].hidden, true, 'two images left, still hidden');
});

test('set as primary updates the group locally without reloading details', async () => {
  const { app, els, groups, server, questions } = setup({ server: { stacks: twoStacks() } });
  await app.loadStacks();
  await settle();
  const callsBefore = server.calls.length;
  const stack = app.state.stacks[0];

  await app.handleSetPrimary(stack, stack.assets[2]);

  const newCalls = server.calls.slice(callsBefore);
  assert.deepEqual(newCalls.map((call) => `${call.method} ${call.path}`), ['PUT /api/stacks/s1']);
  assert.equal(newCalls[0].body, JSON.stringify({ primaryAssetId: 'a3' }));
  assert.equal(questions.length, 0, 'no confirmation for a non-destructive action');
  assert.equal(els.STATUS.textContent, 'Image “a3.jpg” is now the primary image.');
  assert.equal(app.state.stacks[0].primaryAssetId, 'a3');
  const cards = groups()[0].findByClass('asset-card');
  assert.equal(cards[0].getAttribute('data-asset-id'), 'a3');
  assert.equal(cards[0].findByClass('badge').length, 1);
  assert.deepEqual(groups()[0].findByTag('img').map((img) => img.src), ['blob:thumb-a3', 'blob:thumb-a1', 'blob:thumb-a2']);
  assert.equal(app.state.busy, false);
});

test('set as primary via button click', async () => {
  const { app, groups, server } = setup({ server: { stacks: twoStacks() } });
  await app.loadStacks();
  await settle();
  groups()[1].findByClass('asset-card')[1].findByTag('button')[0].click();
  await settle();
  assert.equal(server.stacks[1].primaryAssetId, 'b2');
  assert.equal(groups()[1].findByClass('asset-card')[0].getAttribute('data-asset-id'), 'b2');
});

test('set as primary falls back to the chosen image if the server returns no body', async () => {
  const { app } = setup({
    server: { stacks: twoStacks(), failures: { 'PUT /api/stacks/s1': () => jsonResponse(undefined, 204) } },
  });
  await app.loadStacks();
  const stack = app.state.stacks[0];
  await app.handleSetPrimary(stack, stack.assets[1]);
  assert.equal(app.state.stacks[0].primaryAssetId, 'a2');
});

test('errors while setting the primary image are shown', async () => {
  const { app, els } = setup({
    server: {
      stacks: twoStacks(),
      failures: { 'PUT /api/stacks/s1': () => jsonResponse({ message: 'Forbidden' }, 403) },
    },
  });
  await app.loadStacks();
  const stack = app.state.stacks[0];
  await app.handleSetPrimary(stack, stack.assets[1]);
  assert.equal(els.STATUS.textContent, 'Error: HTTP 403: Forbidden');
  assert.equal(app.state.stacks[0].primaryAssetId, 'a1');
});

test('set as primary is ignored while another action is running', async () => {
  const { app, server } = setup({ server: { stacks: twoStacks() } });
  await app.loadStacks();
  const running = app.handleDeleteStack(app.state.stacks[0]);
  await app.handleSetPrimary(app.state.stacks[1], app.state.stacks[1].assets[1]);
  await running;
  assert.ok(!server.calls.some((call) => call.method === 'PUT'));
});
