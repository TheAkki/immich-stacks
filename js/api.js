// SPDX-License-Identifier: GPL-3.0-or-later
// Minimal Immich API client.
// SAFETY: This client intentionally offers NO function to delete assets
// (images). Write operations only ever affect stacks.
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});
  const config = typeof require === 'function' ? require('./config.js') : ns.config;
  const i18n = typeof require === 'function' ? require('./i18n.js') : ns.i18n;
  const { SYMBOLS, PATHS, HTTP_METHODS, RESPONSE_TYPES } = config;

  const TRAILING_SLASHES = /\/+$/;

  /** Error carrying a translation key so the message can be re-translated on language change. */
  class ApiError extends Error {
    constructor(messageKey, messageValues, status) {
      super(i18n.t(messageKey, messageValues));
      this.name = 'ApiError';
      this.messageKey = messageKey;
      this.messageValues = messageValues;
      this.status = status;
    }
  }

  /** Returns the error message in the current language. */
  function describeError(error) {
    return error.messageKey ? i18n.t(error.messageKey, error.messageValues) : error.message;
  }

  /** Validates and normalizes the server URL; returns null for invalid input. */
  function normalizeBaseUrl(input) {
    const trimmed = String(input ?? '').trim();
    if (!trimmed) {
      return null;
    }
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    if (!config.ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return null;
    }
    let path = url.pathname.replace(TRAILING_SLASHES, '');
    if (path.endsWith(config.API_PREFIX)) {
      path = path.slice(0, -config.API_PREFIX.length);
    }
    return `${url.origin}${path}`;
  }

  function buildAuthHeaders(authType, token) {
    if (authType === config.AUTH_TYPES.BEARER) {
      return { [config.AUTH_HEADER_BEARER]: `${config.BEARER_PREFIX}${token}` };
    }
    return { [config.AUTH_HEADER_API_KEY]: token };
  }

  function buildUrl(apiRoot, path, query) {
    const url = new URL(`${apiRoot}${path}`);
    Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }

  function extractMessage(body) {
    const message = body && body.message;
    return Array.isArray(message) ? message.join(SYMBOLS.LIST_SEPARATOR) : message;
  }

  async function readErrorDetail(response) {
    try {
      const text = await response.text();
      try {
        return extractMessage(JSON.parse(text)) || text || response.statusText;
      } catch {
        return text || response.statusText;
      }
    } catch {
      return response.statusText;
    }
  }

  async function parseBody(response, responseType) {
    if (responseType === RESPONSE_TYPES.BLOB) {
      return response.blob();
    }
    if (response.status === config.HTTP_STATUS_NO_CONTENT) {
      return null;
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function encode(id) {
    return encodeURIComponent(String(id));
  }

  /** Creates a client for an Immich server. */
  function createClient({ baseUrl, token, authType, fetchFn }) {
    const apiRoot = `${baseUrl}${config.API_PREFIX}`;
    const headers = {
      ...buildAuthHeaders(authType, token),
      [config.ACCEPT_HEADER]: config.ACCEPT_JSON,
    };

    async function request(path, options = {}) {
      const { method = HTTP_METHODS.GET, query, responseType = RESPONSE_TYPES.JSON } = options;
      const url = buildUrl(apiRoot, path, query);
      let response;
      try {
        response = await fetchFn(url, { method, headers });
      } catch (error) {
        throw new ApiError('ERROR_NETWORK', { message: error.message }, config.NETWORK_ERROR_STATUS);
      }
      if (!response.ok) {
        const detail = await readErrorDetail(response);
        throw new ApiError('ERROR_HTTP', { status: response.status, detail }, response.status);
      }
      return parseBody(response, responseType);
    }

    const stackPath = (stackId) => `${PATHS.STACKS}/${encode(stackId)}`;
    const assetPath = (assetId) => `${PATHS.ASSETS}/${encode(assetId)}`;

    return Object.freeze({
      getStacks: () => request(PATHS.STACKS),
      getStack: (stackId) => request(stackPath(stackId)),
      getAsset: (assetId) => request(assetPath(assetId)),
      getAlbumsForAsset: (assetId) =>
        request(PATHS.ALBUMS, { query: { [config.QUERY.ASSET_ID]: assetId } }),
      getThumbnailBlob: (assetId) =>
        request(`${assetPath(assetId)}${PATHS.THUMBNAIL}`, {
          query: { [config.QUERY.SIZE]: config.THUMBNAIL_SIZE },
          responseType: RESPONSE_TYPES.BLOB,
        }),
      /** Removes an image from the stack – the file itself is kept. */
      removeAssetFromStack: (stackId, assetId) =>
        request(`${stackPath(stackId)}${PATHS.ASSETS}/${encode(assetId)}`, {
          method: HTTP_METHODS.DELETE,
        }),
      /** Deletes only the stack (the grouping) – the images are kept. */
      deleteStack: (stackId) => request(stackPath(stackId), { method: HTTP_METHODS.DELETE }),
    });
  }

  const api = { ApiError, describeError, normalizeBaseUrl, buildAuthHeaders, createClient };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  ns.api = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
