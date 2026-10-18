// SPDX-License-Identifier: GPL-3.0-or-later
// English UI texts – source language and fallback for all other languages.
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});

  const locale = Object.freeze({
    meta: Object.freeze({ name: 'English', numberLocale: 'en-US' }),
    messages: Object.freeze({
      APP_TITLE: 'Immich Stacks',
      APP_HINT:
        'Shows all stacks of your Immich server. Images are never deleted – only stacks or the assignment of an image to a stack.',
      LABEL_LANGUAGE: 'Language',
      LABEL_SERVER: 'Immich server',
      LABEL_AUTH: 'Authentication',
      AUTH_API_KEY: 'API key (x-api-key)',
      AUTH_BEARER: 'Access token (Bearer)',
      LABEL_TOKEN: 'Access token / API key',
      BUTTON_LOAD: 'Load stacks',
      FILTER_PLACEHOLDER: 'Filter by file name, path, album or tag',
      FILTER_SINGLE_IMAGE: 'Only stacks with a single image',

      UNKNOWN: 'unknown',

      STATUS_LOADING: 'Loading stacks …',
      STATUS_LOADED: '{count} stacks loaded.',
      STATUS_NO_STACKS: 'No stacks found.',
      STATUS_ERROR: 'Error: {message}',
      STATUS_INVALID_URL: 'Please enter a valid server URL (http/https).',
      STATUS_MISSING_TOKEN: 'Please enter an access token or API key.',
      STATUS_ASSET_REMOVED: 'Image “{name}” was removed from the stack. The file is kept.',
      STATUS_STACK_DELETED: 'Stack was deleted. The images are kept.',
      STATUS_PRIMARY_SET: 'Image “{name}” is now the primary image.',
      STATUS_STACK_DISSOLVED:
        'Image “{name}” was removed; Immich dissolved the stack because too few images were left.',

      CONFIRM_REMOVE_ASSET: 'Remove image “{name}” from the stack?\n\nThe file itself will NOT be deleted.',
      CONFIRM_DELETE_STACK:
        'Delete stack with {count} images?\n\nOnly the grouping is removed, the images themselves will NOT be deleted.',

      STACK_HEADING: 'Stack with {count} images',
      STACK_HEADING_SINGLE: 'Stack with 1 image',
      SUMMARY: 'Showing {visible} of {total} stacks',
      LABEL_PRIMARY: 'Primary image',
      LABEL_FILE_NAME: 'File name',
      LABEL_PATH: 'Path',
      LABEL_RESOLUTION: 'Resolution',
      LABEL_FILE_SIZE: 'File size',
      LABEL_ALBUMS: 'Albums',
      LABEL_TAGS: 'Tags',
      NO_ALBUMS: 'not in any album',
      NO_TAGS: 'no tags',
      THUMBNAIL_ALT: 'Preview of {name}',

      BUTTON_REMOVE_ASSET: 'Remove from stack',
      BUTTON_REMOVE_ASSET_TITLE: 'Removes the image from the stack. The file is kept.',
      BUTTON_SET_PRIMARY: 'Set as primary image',
      BUTTON_SET_PRIMARY_TITLE: 'Makes this image the primary image of the stack.',
      BUTTON_DELETE_STACK: 'Delete stack',
      BUTTON_DELETE_STACK_TITLE: 'Removes the grouping. The images are kept.',

      DETAILS_LOADING: 'Loading details …',
      DETAILS_ERROR: 'Details could not be loaded: {message}',

      ERROR_HTTP: 'HTTP {status}: {detail}',
      ERROR_NETWORK: 'Network error – server unreachable or blocked by CORS ({message})',
    }),
  });

  if (typeof module === 'object' && module.exports) {
    module.exports = locale;
  }
  (ns.locales || (ns.locales = {})).en = locale;
})(typeof globalThis !== 'undefined' ? globalThis : this);
