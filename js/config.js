// SPDX-License-Identifier: GPL-3.0-or-later
// Central configuration: all constants and paths. UI texts live in js/locales/.
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});

  const config = Object.freeze({
    API_PREFIX: '/api',
    PATHS: Object.freeze({
      STACKS: '/stacks',
      ASSETS: '/assets',
      ALBUMS: '/albums',
      THUMBNAIL: '/thumbnail',
    }),
    QUERY: Object.freeze({
      ASSET_ID: 'assetId',
      SIZE: 'size',
    }),
    THUMBNAIL_SIZE: 'thumbnail',

    AUTH_TYPES: Object.freeze({
      API_KEY: 'apiKey',
      BEARER: 'bearer',
    }),
    AUTH_HEADER_API_KEY: 'x-api-key',
    AUTH_HEADER_BEARER: 'Authorization',
    BEARER_PREFIX: 'Bearer ',
    ACCEPT_HEADER: 'Accept',
    ACCEPT_JSON: 'application/json',
    CONTENT_TYPE_HEADER: 'Content-Type',

    HTTP_METHODS: Object.freeze({
      GET: 'GET',
      PUT: 'PUT',
      DELETE: 'DELETE',
    }),
    HTTP_STATUS_NO_CONTENT: 204,
    HTTP_STATUS_NOT_FOUND: 404,
    NETWORK_ERROR_STATUS: 0,
    RESPONSE_TYPES: Object.freeze({
      JSON: 'json',
      BLOB: 'blob',
    }),
    ALLOWED_PROTOCOLS: Object.freeze(['http:', 'https:']),

    DETAIL_CONCURRENCY: 4,
    SINGLE_IMAGE_STACK_SIZE: 1,
    LAZY_LOAD_ROOT_MARGIN: '300px',

    BYTE_BASE: 1024,
    BYTE_UNITS: Object.freeze(['B', 'KB', 'MB', 'GB', 'TB']),
    BYTE_DECIMALS: 1,

    STORAGE_KEYS: Object.freeze({
      SERVER_URL: 'immichStacks.serverUrl',
      AUTH_TYPE: 'immichStacks.authType',
      LANGUAGE: 'immichStacks.language',
    }),

    ELEMENT_IDS: Object.freeze({
      LANGUAGE: 'language',
      FORM: 'connection-form',
      SERVER_URL: 'server-url',
      AUTH_TYPE: 'auth-type',
      TOKEN: 'token',
      LOAD_BUTTON: 'load-button',
      FILTER: 'filter',
      FILTER_SINGLE_IMAGE: 'filter-single-image',
      STATUS: 'status',
      SUMMARY: 'summary',
      STACK_LIST: 'stack-list',
    }),

    STATUS_KINDS: Object.freeze({
      INFO: 'info',
      SUCCESS: 'success',
      ERROR: 'error',
    }),

    // Language-neutral display symbols.
    SYMBOLS: Object.freeze({
      EMPTY_VALUE: '—',
      NOT_LOADED: '…',
      LIST_SEPARATOR: ', ',
      RESOLUTION_SEPARATOR: ' × ',
    }),

    // Languages: English is the source language and fallback. To add a language,
    // create js/locales/<code>.js, list it here and include it in index.html.
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: Object.freeze(['en', 'de']),

    // Static page texts: element ID → translation key (optionally as an attribute).
    STATIC_TEXTS: Object.freeze([
      { id: 'app-title', key: 'APP_TITLE' },
      { id: 'app-hint', key: 'APP_HINT' },
      { id: 'label-language', key: 'LABEL_LANGUAGE' },
      { id: 'label-server', key: 'LABEL_SERVER' },
      { id: 'label-auth', key: 'LABEL_AUTH' },
      { id: 'option-auth-api-key', key: 'AUTH_API_KEY' },
      { id: 'option-auth-bearer', key: 'AUTH_BEARER' },
      { id: 'label-token', key: 'LABEL_TOKEN' },
      { id: 'load-button', key: 'BUTTON_LOAD' },
      { id: 'filter', key: 'FILTER_PLACEHOLDER', attr: 'placeholder' },
      { id: 'label-filter-single-image', key: 'FILTER_SINGLE_IMAGE' },
    ]),
  });

  if (typeof module === 'object' && module.exports) {
    module.exports = config;
  }
  ns.config = config;
})(typeof globalThis !== 'undefined' ? globalThis : this);
