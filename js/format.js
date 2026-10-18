// SPDX-License-Identifier: GPL-3.0-or-later
// Formatting helpers for display (depending on the active language).
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});
  const config = typeof require === 'function' ? require('./config.js') : ns.config;
  const i18n = typeof require === 'function' ? require('./i18n.js') : ns.i18n;
  const { SYMBOLS } = config;

  function isPositiveNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

  /** Formats a byte count human-readably (e.g. "2.4 MB" or "2,4 MB"). */
  function formatBytes(bytes) {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
      return i18n.t('UNKNOWN');
    }
    let value = bytes;
    let unitIndex = 0;
    while (value >= config.BYTE_BASE && unitIndex < config.BYTE_UNITS.length - 1) {
      value /= config.BYTE_BASE;
      unitIndex += 1;
    }
    const decimals = unitIndex === 0 ? 0 : config.BYTE_DECIMALS;
    const number = value.toLocaleString(i18n.getNumberLocale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${number} ${config.BYTE_UNITS[unitIndex]}`;
  }

  /** Formats width and height as "4000 × 3000". */
  function formatResolution(width, height) {
    if (!isPositiveNumber(width) || !isPositiveNumber(height)) {
      return i18n.t('UNKNOWN');
    }
    return `${width}${SYMBOLS.RESOLUTION_SEPARATOR}${height}`;
  }

  /** Joins a list; null means "not loaded yet". */
  function formatList(items, emptyText) {
    if (items === null || items === undefined) {
      return SYMBOLS.NOT_LOADED;
    }
    return items.length > 0 ? items.join(SYMBOLS.LIST_SEPARATOR) : emptyText;
  }

  const format = { formatBytes, formatResolution, formatList };

  if (typeof module === 'object' && module.exports) {
    module.exports = format;
  }
  ns.format = format;
})(typeof globalThis !== 'undefined' ? globalThis : this);
