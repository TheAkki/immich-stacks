// SPDX-License-Identifier: GPL-3.0-or-later
// KI-generiert: Unit tests for js/api.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../js/config.js');
const i18n = require('../js/i18n.js');
const { ApiError, describeError, normalizeBaseUrl, buildAuthHeaders, createClient } = require('../js/api.js');
const { jsonResponse } = require('./helpers/fixtures.js');

const BASE_URL = 'https://immich.example.org';
const TOKEN = 'secret';

function recordingClient(responder = () => jsonResponse({})) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, ...init });
    return responder(url, init);
  };
  const client = createClient({ baseUrl: BASE_URL, token: TOKEN, authType: config.AUTH_TYPES.API_KEY, fetchFn });
  return { client, calls };
}

test('normalizeBaseUrl strips slashes and the /api suffix', () => {
  assert.equal(normalizeBaseUrl('  https://immich.example.org/  '), BASE_URL);
  assert.equal(normalizeBaseUrl('https://immich.example.org/api/'), BASE_URL);
  assert.equal(normalizeBaseUrl('http://nas:2283/immich/api'), 'http://nas:2283/immich');
});

test('normalizeBaseUrl rejects invalid input', () => {
  [undefined, null, '', '   ', 'not a url', 'ftp://immich.example.org', 'file:///etc'].forEach((input) => {
    assert.equal(normalizeBaseUrl(input), null, String(input));
  });
});

test('buildAuthHeaders uses x-api-key for API keys', () => {
  assert.deepEqual(buildAuthHeaders(config.AUTH_TYPES.API_KEY, TOKEN), { 'x-api-key': TOKEN });
});

test('buildAuthHeaders uses Bearer for access tokens', () => {
  assert.deepEqual(buildAuthHeaders(config.AUTH_TYPES.BEARER, TOKEN), { Authorization: `Bearer ${TOKEN}` });
});

test('getStacks calls GET /api/stacks with the auth header', async () => {
  const { client, calls } = recordingClient(() => jsonResponse([{ id: 's1' }]));
  assert.deepEqual(await client.getStacks(), [{ id: 's1' }]);
  assert.equal(calls[0].url, `${BASE_URL}/api/stacks`);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].headers['x-api-key'], TOKEN);
  assert.equal(calls[0].headers.Accept, 'application/json');
});

test('getStack, getAsset and getAlbumsForAsset build correct URLs', async () => {
  const { client, calls } = recordingClient();
  await client.getStack('s/1');
  await client.getAsset('a1');
  await client.getAlbumsForAsset('a1');
  assert.deepEqual(calls.map((call) => call.url), [
    `${BASE_URL}/api/stacks/s%2F1`,
    `${BASE_URL}/api/assets/a1`,
    `${BASE_URL}/api/albums?assetId=a1`,
  ]);
});

test('getThumbnailBlob returns the blob from /thumbnail?size=thumbnail', async () => {
  const { client, calls } = recordingClient(() => jsonResponse('image'));
  assert.deepEqual(await client.getThumbnailBlob('a1'), { blobOf: 'image' });
  assert.equal(calls[0].url, `${BASE_URL}/api/assets/a1/thumbnail?size=thumbnail`);
});

test('removeAssetFromStack calls DELETE /api/stacks/{id}/assets/{assetId}', async () => {
  const { client, calls } = recordingClient(() => jsonResponse(undefined, 204));
  assert.equal(await client.removeAssetFromStack('s1', 'a1'), null);
  assert.equal(calls[0].method, 'DELETE');
  assert.equal(calls[0].url, `${BASE_URL}/api/stacks/s1/assets/a1`);
});

test('deleteStack calls DELETE /api/stacks/{id}', async () => {
  const { client, calls } = recordingClient(() => jsonResponse(undefined, 204));
  await client.deleteStack('s1');
  assert.equal(calls[0].method, 'DELETE');
  assert.equal(calls[0].url, `${BASE_URL}/api/stacks/s1`);
});

test('safety: all write requests only target stacks, never assets', async () => {
  const { client, calls } = recordingClient(() => jsonResponse(undefined, 204));
  await Promise.all(Object.values(client).map((fn) => fn('s1', 'a1')));
  const writes = calls.filter((call) => call.method !== 'GET');
  assert.deepEqual([...new Set(writes.map((call) => call.method))].sort(), ['DELETE', 'PUT']);
  writes.forEach((call) => assert.match(new URL(call.url).pathname, /^\/api\/stacks\//));
});

test('setPrimaryAsset calls PUT /api/stacks/{id} with a JSON body', async () => {
  const { client, calls } = recordingClient(() => jsonResponse({ id: 's1', primaryAssetId: 'a2' }));
  assert.deepEqual(await client.setPrimaryAsset('s1', 'a2'), { id: 's1', primaryAssetId: 'a2' });
  assert.equal(calls[0].method, 'PUT');
  assert.equal(calls[0].url, `${BASE_URL}/api/stacks/s1`);
  assert.equal(calls[0].body, JSON.stringify({ primaryAssetId: 'a2' }));
  assert.equal(calls[0].headers['Content-Type'], 'application/json');
  assert.equal(calls[0].headers['x-api-key'], TOKEN);
});

test('requests without a body send no Content-Type', async () => {
  const { client, calls } = recordingClient();
  await client.getStacks();
  assert.equal(calls[0].body, undefined);
  assert.equal(calls[0].headers['Content-Type'], undefined);
});

test('an empty response with status 200 returns null', async () => {
  const { client } = recordingClient(() => jsonResponse(undefined, 200));
  assert.equal(await client.getStacks(), null);
});

test('HTTP errors throw ApiError with status and server message', async () => {
  const { client } = recordingClient(() => jsonResponse({ message: 'Missing permission' }, 403));
  await assert.rejects(client.getStacks(), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.message, 'HTTP 403: Missing permission');
    return true;
  });
});

test('HTTP errors with a message array are joined', async () => {
  const { client } = recordingClient(() => jsonResponse({ message: ['a', 'b'] }, 400));
  await assert.rejects(client.getStacks(), { message: 'HTTP 400: a, b' });
});

test('HTTP errors with a text body use the text', async () => {
  const { client } = recordingClient(() => ({ ok: false, status: 500, statusText: 'Server Error', text: async () => 'broken' }));
  await assert.rejects(client.getStacks(), { message: 'HTTP 500: broken' });
});

test('HTTP errors without a body use statusText', async () => {
  const { client } = recordingClient(() => ({ ok: false, status: 502, statusText: 'Bad Gateway', text: async () => '' }));
  await assert.rejects(client.getStacks(), { message: 'HTTP 502: Bad Gateway' });
});

test('HTTP errors with JSON lacking a message use the text', async () => {
  const { client } = recordingClient(() => jsonResponse({ error: 'x' }, 500));
  await assert.rejects(client.getStacks(), { message: 'HTTP 500: {"error":"x"}' });
});

test('HTTP errors with an unreadable body use statusText', async () => {
  const { client } = recordingClient(() => ({
    ok: false,
    status: 500,
    statusText: 'Internal',
    text: async () => {
      throw new Error('stream');
    },
  }));
  await assert.rejects(client.getStacks(), { message: 'HTTP 500: Internal' });
});

test('network errors are reported as ApiError with status 0', async () => {
  const { client } = recordingClient(() => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(client.getStacks(), (error) => {
    assert.equal(error.status, config.NETWORK_ERROR_STATUS);
    assert.match(error.message, /CORS/);
    assert.match(error.message, /Failed to fetch/);
    return true;
  });
});

test('describeError translates ApiError into the current language', () => {
  const error = new ApiError('ERROR_NETWORK', { message: 'x' }, 0);
  i18n.setLanguage('de');
  assert.match(describeError(error), /^Netzwerkfehler/);
  i18n.setLanguage('en');
  assert.match(describeError(error), /^Network error/);
});

test('describeError uses the message of plain errors', () => {
  assert.equal(describeError(new Error('plain')), 'plain');
});
