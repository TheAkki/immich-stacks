// SPDX-License-Identifier: GPL-3.0-or-later
// KI-generiert: Test data and fake Immich server for the unit tests.
'use strict';

function makeAsset(id, overrides = {}) {
  return {
    id,
    originalFileName: `${id}.jpg`,
    originalPath: `/photos/${id}.jpg`,
    exifInfo: { exifImageWidth: 4000, exifImageHeight: 3000, fileSizeInByte: 2048 },
    ...overrides,
  };
}

function makeStack(id, assetIds, primaryAssetId = assetIds[0]) {
  return { id, primaryAssetId, assets: assetIds.map((assetId) => makeAsset(assetId)) };
}

function jsonResponse(body, status = 200) {
  const text = body === undefined ? '' : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    text: async () => text,
    blob: async () => ({ blobOf: body }),
  };
}

/**
 * Simulates the required Immich endpoints in memory and records all calls.
 */
function createFakeServer({ stacks = [], albums = {}, tags = {}, failures = {} } = {}) {
  const state = { stacks: structuredClone(stacks), calls: [] };

  function findStack(id) {
    return state.stacks.find((stack) => stack.id === id);
  }

  function findAsset(id) {
    return state.stacks.flatMap((stack) => stack.assets).find((asset) => asset.id === id);
  }

  const routes = [
    ['GET', /^\/api\/stacks$/, () => jsonResponse(state.stacks)],
    ['GET', /^\/api\/stacks\/([^/]+)$/, ([id]) => (findStack(id) ? jsonResponse(findStack(id)) : jsonResponse({ message: 'Not found' }, 404))],
    ['GET', /^\/api\/assets\/([^/]+)\/thumbnail$/, ([id]) => jsonResponse(`thumb-${id}`)],
    ['GET', /^\/api\/assets\/([^/]+)$/, ([id]) => jsonResponse({ ...findAsset(id), tags: tags[id] || [] })],
    ['GET', /^\/api\/albums$/, (_, url) => jsonResponse(albums[url.searchParams.get('assetId')] || [])],
    ['DELETE', /^\/api\/stacks\/([^/]+)\/assets\/([^/]+)$/, ([stackId, assetId]) => {
      const stack = findStack(stackId);
      stack.assets = stack.assets.filter((asset) => asset.id !== assetId);
      if (stack.assets.length < 2) {
        state.stacks = state.stacks.filter((entry) => entry.id !== stackId);
      }
      return jsonResponse(undefined, 204);
    }],
    ['PUT', /^\/api\/stacks\/([^/]+)$/, ([id], _, init) => {
      const stack = findStack(id);
      stack.primaryAssetId = JSON.parse(init.body).primaryAssetId;
      return jsonResponse(stack);
    }],
    ['DELETE', /^\/api\/stacks\/([^/]+)$/, ([id]) => {
      state.stacks = state.stacks.filter((stack) => stack.id !== id);
      return jsonResponse(undefined, 204);
    }],
  ];

  async function fetchFn(rawUrl, init) {
    const url = new URL(rawUrl);
    state.calls.push({ method: init.method, path: url.pathname, url: rawUrl, headers: init.headers, body: init.body });
    const failure = failures[`${init.method} ${url.pathname}`];
    if (failure) {
      return failure();
    }
    for (const [method, pattern, handler] of routes) {
      const match = url.pathname.match(pattern);
      if (method === init.method && match) {
        return handler(match.slice(1), url, init);
      }
    }
    return jsonResponse({ message: 'unknown route' }, 404);
  }

  return { state, fetchFn };
}

/** Waits until all pending promises/microtasks have been processed. */
function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

module.exports = { makeAsset, makeStack, jsonResponse, createFakeServer, flush };
