// SPDX-License-Identifier: GPL-3.0-or-later
// Internationalization: language selection, translation and placeholders.
// English is the source language and the fallback for missing texts.
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});
  const config = typeof require === 'function' ? require('./config.js') : ns.config;

  const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;
  const REGION_SEPARATOR = /[-_]/;

  function loadLocales() {
    if (typeof require === 'function') {
      return Object.fromEntries(
        config.SUPPORTED_LANGUAGES.map((code) => [code, require(`./locales/${code}.js`)]),
      );
    }
    return ns.locales || {};
  }

  const locales = loadLocales();
  const state = { language: config.DEFAULT_LANGUAGE };

  /** Replaces {key} placeholders with values; unknown placeholders are kept. */
  function fillTemplate(template, values = {}) {
    return String(template).replace(PLACEHOLDER_PATTERN, (match, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
    );
  }

  function availableLanguages() {
    return config.SUPPORTED_LANGUAGES.filter((code) => locales[code]).map((code) => ({
      code,
      name: locales[code].meta.name,
    }));
  }

  function toLanguageCode(candidate) {
    return String(candidate || '').split(REGION_SEPARATOR)[0].toLowerCase();
  }

  /** Returns the first supported language among the candidates (e.g. "de-AT" → "de"). */
  function resolveLanguage(candidates = []) {
    const match = candidates.map(toLanguageCode).find((code) => locales[code]);
    return match || config.DEFAULT_LANGUAGE;
  }

  function setLanguage(code) {
    state.language = resolveLanguage([code]);
    return state.language;
  }

  function getLanguage() {
    return state.language;
  }

  function getNumberLocale() {
    return locales[state.language].meta.numberLocale;
  }

  function lookup(key) {
    const current = locales[state.language].messages[key];
    if (current !== undefined) {
      return current;
    }
    const fallback = locales[config.DEFAULT_LANGUAGE].messages[key];
    return fallback !== undefined ? fallback : key;
  }

  /** Translates a key into the current language and fills in placeholders. */
  function t(key, values) {
    return fillTemplate(lookup(key), values);
  }

  const i18n = {
    fillTemplate,
    availableLanguages,
    resolveLanguage,
    setLanguage,
    getLanguage,
    getNumberLocale,
    t,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = i18n;
  }
  ns.i18n = i18n;
})(typeof globalThis !== 'undefined' ? globalThis : this);
