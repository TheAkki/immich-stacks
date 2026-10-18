// SPDX-License-Identifier: GPL-3.0-or-later
// KI-generiert: Unit tests for js/model.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/model.js');
const { makeAsset, makeStack } = require('./helpers/fixtures.js');

test('buildAssetInfo takes over name, path, resolution and size', () => {
  const info = model.buildAssetInfo(makeAsset('a1'));
  assert.deepEqual(info, {
    id: 'a1',
    fileName: 'a1.jpg',
    path: '/photos/a1.jpg',
    width: 4000,
    height: 3000,
    fileSize: 2048,
    albums: null,
    tags: null,
    isPrimary: false,
  });
});

test('buildAssetInfo uses the asset width/height without EXIF', () => {
  const info = model.buildAssetInfo({ id: 'a', width: 10, height: 20 });
  assert.equal(info.width, 10);
  assert.equal(info.height, 20);
  assert.equal(info.fileSize, null);
  assert.equal(info.fileName, '');
  assert.equal(info.path, '');
});

test('buildAssetInfo returns null dimensions when nothing is known', () => {
  const info = model.buildAssetInfo({ id: 'a' });
  assert.equal(info.width, null);
  assert.equal(info.height, null);
});

test('buildAssetInfo takes over albums and tags (tag path preferred)', () => {
  const asset = makeAsset('a1', { tags: [{ name: 'Child', value: 'Parent/Child' }, { name: 'Solo' }, {}] });
  const info = model.buildAssetInfo(asset, {
    albums: [{ albumName: 'Vacation' }, { albumName: '' }],
    isPrimary: true,
  });
  assert.deepEqual(info.tags, ['Parent/Child', 'Solo']);
  assert.deepEqual(info.albums, ['Vacation']);
  assert.equal(info.isPrimary, true);
});

test('buildStackSummary marks the primary image and sorts it first', () => {
  const summary = model.buildStackSummary(makeStack('s1', ['a1', 'a2', 'a3'], 'a2'));
  assert.equal(summary.id, 's1');
  assert.equal(summary.primaryAssetId, 'a2');
  assert.equal(summary.detailsLoaded, false);
  assert.deepEqual(summary.assets.map((asset) => asset.id), ['a2', 'a1', 'a3']);
  assert.deepEqual(summary.assets.map((asset) => asset.isPrimary), [true, false, false]);
});

test('buildStackSummary handles stacks without assets', () => {
  assert.deepEqual(model.buildStackSummary({ id: 's' }).assets, []);
});

test('mapWithConcurrency preserves order and limits parallelism', async () => {
  let running = 0;
  let maxRunning = 0;
  const result = await model.mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    running += 1;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((resolve) => setTimeout(resolve, 6 - value));
    running -= 1;
    return value * 10;
  });
  assert.deepEqual(result, [10, 20, 30, 40, 50]);
  assert.equal(maxRunning, 2);
});

test('mapWithConcurrency with an empty list', async () => {
  assert.deepEqual(await model.mapWithConcurrency([], 3, async () => 1), []);
});

test('mapWithConcurrency propagates errors', async () => {
  await assert.rejects(
    model.mapWithConcurrency([1], 1, async () => {
      throw new Error('broken');
    }),
    /broken/,
  );
});

test('loadStackDetails loads asset details and albums per image', async () => {
  const client = {
    getAsset: async (id) => makeAsset(id, { tags: [{ name: 'T', value: 'T' }], exifInfo: { fileSizeInByte: 99 } }),
    getAlbumsForAsset: async (id) => (id === 'a1' ? [{ albumName: 'Album 1' }] : []),
  };
  const summary = model.buildStackSummary(makeStack('s1', ['a1', 'a2']));
  const detailed = await model.loadStackDetails(client, summary);
  assert.equal(detailed.detailsLoaded, true);
  assert.deepEqual(detailed.assets.map((asset) => asset.albums), [['Album 1'], []]);
  assert.deepEqual(detailed.assets[0].tags, ['T']);
  assert.equal(detailed.assets[0].fileSize, 99);
  assert.equal(detailed.assets[0].isPrimary, true);
  assert.equal(summary.detailsLoaded, false, 'original stays unchanged');
});

test('stackMatchesQuery searches name, path, albums and tags', () => {
  const stack = {
    assets: [{ fileName: 'IMG_1.JPG', path: '/photos/2024', albums: ['Vacation'], tags: ['Family/Grandma'] }],
  };
  ['img_1', '2024', 'vacation', 'GRANDMA', '  ', ''].forEach((query) => {
    assert.equal(model.stackMatchesQuery(stack, query), true, query);
  });
  assert.equal(model.stackMatchesQuery(stack, null), true);
  assert.equal(model.stackMatchesQuery(stack, 'berlin'), false);
});

test('stackMatchesQuery works without loaded details', () => {
  const stack = { assets: [{ fileName: 'a.jpg', path: '', albums: null, tags: null }] };
  assert.equal(model.stackMatchesQuery(stack, 'a.jpg'), true);
});

const filterFixture = () => [
  { id: 1, assets: [{ fileName: 'cat.jpg', path: '' }] },
  { id: 2, assets: [{ fileName: 'dog.jpg', path: '' }, { fileName: 'dog2.jpg', path: '' }] },
  { id: 3, assets: [{ fileName: 'bird.jpg', path: '' }] },
];
const ids = (stacks) => stacks.map((stack) => stack.id);

test('filterStacks returns only stacks matching the query', () => {
  assert.deepEqual(ids(model.filterStacks(filterFixture(), { query: 'dog' })), [2]);
});

test('filterStacks without filter returns all stacks', () => {
  assert.deepEqual(ids(model.filterStacks(filterFixture())), [1, 2, 3]);
});

test('filterStacks with singleImageOnly returns only stacks with exactly one image', () => {
  assert.deepEqual(ids(model.filterStacks(filterFixture(), { singleImageOnly: true })), [1, 3]);
});

test('filterStacks combines singleImageOnly and query', () => {
  assert.deepEqual(ids(model.filterStacks(filterFixture(), { query: 'bird', singleImageOnly: true })), [3]);
  assert.deepEqual(ids(model.filterStacks(filterFixture(), { query: 'dog', singleImageOnly: true })), []);
});

test('hasSingleImage is false for empty and multi-image stacks', () => {
  assert.equal(model.hasSingleImage({ assets: [] }), false);
  assert.equal(model.hasSingleImage(filterFixture()[1]), false);
  assert.equal(model.hasSingleImage(filterFixture()[0]), true);
});
