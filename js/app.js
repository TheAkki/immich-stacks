// SPDX-License-Identifier: GPL-3.0-or-later
// Application logic: wires up form, language, API client, model and rendering.
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});
  const load = (name, path) => (typeof require === 'function' ? require(path) : ns[name]);
  const config = load('config', './config.js');
  const i18n = load('i18n', './i18n.js');
  const api = load('api', './api.js');
  const model = load('model', './model.js');
  const ui = load('ui', './ui.js');
  const { STATUS_KINDS, STORAGE_KEYS } = config;
  const { t } = i18n;

  function readStorage(storage, key) {
    try {
      return storage ? storage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    try {
      if (storage) {
        storage.setItem(key, value);
      }
    } catch {
      // Storage unavailable (e.g. private window) – settings are simply not remembered.
    }
  }

  function findElements(doc) {
    return Object.fromEntries(
      Object.entries(config.ELEMENT_IDS).map(([key, id]) => [key, doc.getElementById(id)]),
    );
  }

  /**
   * Creates the application. All browser dependencies are injected.
   * @param {object} deps doc, storage, fetchFn, confirmFn, createObjectUrl,
   *   revokeObjectUrl, IntersectionObserverCtor (optional), languages (browser languages, optional)
   */
  function createApp(deps) {
    const { doc, storage, fetchFn, confirmFn, createObjectUrl, revokeObjectUrl } = deps;
    const elements = findElements(doc);
    const state = {
      client: null,
      generation: 0,
      stacks: [],
      groups: new Map(),
      groupStackIds: new Map(),
      detailErrors: new Map(),
      loadingDetails: new Set(),
      thumbnailUrls: new Map(),
      observer: null,
      busy: false,
      status: null,
    };

    function renderStatus() {
      if (state.status) {
        ui.setStatus(elements.STATUS, state.status.render(), state.status.kind);
      }
    }

    /** Stores the message as a function so it is re-translated when the language changes. */
    function showStatus(key, values, kind) {
      state.status = { render: () => t(key, values), kind };
      renderStatus();
    }

    function showError(error) {
      state.status = {
        render: () => t('STATUS_ERROR', { message: api.describeError(error) }),
        kind: STATUS_KINDS.ERROR,
      };
      renderStatus();
    }

    function findStack(stackId) {
      return state.stacks.find((stack) => stack.id === stackId) || null;
    }

    function readConnection() {
      const baseUrl = api.normalizeBaseUrl(elements.SERVER_URL.value);
      if (!baseUrl) {
        return { error: 'STATUS_INVALID_URL' };
      }
      const token = String(elements.TOKEN.value || '').trim();
      if (!token) {
        return { error: 'STATUS_MISSING_TOKEN' };
      }
      return { baseUrl, token, authType: elements.AUTH_TYPE.value };
    }

    function restoreSettings() {
      const serverUrl = readStorage(storage, STORAGE_KEYS.SERVER_URL);
      const authType = readStorage(storage, STORAGE_KEYS.AUTH_TYPE);
      if (serverUrl) {
        elements.SERVER_URL.value = serverUrl;
      }
      if (authType) {
        elements.AUTH_TYPE.value = authType;
      }
    }

    // The token is intentionally NOT stored.
    function persistSettings({ baseUrl, authType }) {
      writeStorage(storage, STORAGE_KEYS.SERVER_URL, baseUrl);
      writeStorage(storage, STORAGE_KEYS.AUTH_TYPE, authType);
    }

    function currentFilter() {
      return {
        query: elements.FILTER.value,
        singleImageOnly: Boolean(elements.FILTER_SINGLE_IMAGE.checked),
      };
    }

    function updateSummary() {
      const total = state.stacks.length;
      const visible = model.filterStacks(state.stacks, currentFilter()).length;
      elements.SUMMARY.textContent = total > 0 ? t('SUMMARY', { visible, total }) : '';
    }

    function applyVisibility(stack, element) {
      element.hidden = !model.stackMatchesFilter(stack, currentFilter());
    }

    function applyFilter() {
      state.stacks.forEach((stack) => applyVisibility(stack, state.groups.get(stack.id)));
      updateSummary();
    }

    function revokeThumbnails() {
      state.thumbnailUrls.forEach((url) => revokeObjectUrl(url));
      state.thumbnailUrls.clear();
    }

    async function loadThumbnail({ assetId, img }) {
      try {
        if (!state.thumbnailUrls.has(assetId)) {
          const blob = await state.client.getThumbnailBlob(assetId);
          state.thumbnailUrls.set(assetId, createObjectUrl(blob));
        }
        img.src = state.thumbnailUrls.get(assetId);
      } catch {
        img.className = `${img.className} thumbnail--missing`;
      }
    }

    function loadThumbnails(thumbnails) {
      return model.mapWithConcurrency(thumbnails, config.DETAIL_CONCURRENCY, loadThumbnail);
    }

    function isWaitingForDetails(stack) {
      return !stack.detailsLoaded && !state.detailErrors.has(stack.id);
    }

    function buildGroup(stack) {
      const detailsError = state.detailErrors.get(stack.id);
      const rendered = ui.renderStackGroup(doc, stack, {
        onRemoveAsset: handleRemoveAsset,
        onDeleteStack: handleDeleteStack,
        detailsError: detailsError ? api.describeError(detailsError) : null,
      });
      state.groups.set(stack.id, rendered.element);
      state.groupStackIds.set(rendered.element, stack.id);
      applyVisibility(stack, rendered.element);
      return rendered;
    }

    function replaceGroup(stack) {
      const oldElement = state.groups.get(stack.id);
      const { element, thumbnails } = buildGroup(stack);
      state.groupStackIds.delete(oldElement);
      oldElement.replaceWith(element);
      if (state.observer) {
        state.observer.unobserve(oldElement);
        if (isWaitingForDetails(stack)) {
          state.observer.observe(element);
        }
      }
      // Only load thumbnails for stacks that have become visible (keeps lazy loading).
      return isWaitingForDetails(stack) ? Promise.resolve() : loadThumbnails(thumbnails);
    }

    function updateStack(stack) {
      state.stacks = state.stacks.map((existing) => (existing.id === stack.id ? stack : existing));
      updateSummary();
      return replaceGroup(stack);
    }

    function removeStack(stackId) {
      const element = state.groups.get(stackId);
      state.stacks = state.stacks.filter((stack) => stack.id !== stackId);
      state.groups.delete(stackId);
      state.detailErrors.delete(stackId);
      if (element) {
        state.groupStackIds.delete(element);
        if (state.observer) {
          state.observer.unobserve(element);
        }
        element.remove();
      }
      updateSummary();
    }

    async function loadDetails(stackId) {
      const stack = findStack(stackId);
      if (!stack || stack.detailsLoaded || state.loadingDetails.has(stackId)) {
        return;
      }
      const generation = state.generation;
      state.loadingDetails.add(stackId);
      try {
        const detailed = await model.loadStackDetails(state.client, stack);
        if (generation === state.generation && findStack(stackId)) {
          state.detailErrors.delete(stackId);
          await updateStack(detailed);
        }
      } catch (error) {
        if (generation === state.generation && findStack(stackId)) {
          state.detailErrors.set(stackId, error);
          await replaceGroup(findStack(stackId));
        }
      } finally {
        state.loadingDetails.delete(stackId);
      }
    }

    function createObserver() {
      const Observer = deps.IntersectionObserverCtor;
      if (!Observer) {
        return null;
      }
      const onIntersect = (entries, observer) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            observer.unobserve(entry.target);
            loadDetails(state.groupStackIds.get(entry.target));
          });
      };
      return new Observer(onIntersect, { rootMargin: config.LAZY_LOAD_ROOT_MARGIN });
    }

    function mountGroup(stack) {
      const { element } = buildGroup(stack);
      elements.STACK_LIST.appendChild(element);
      if (state.observer) {
        state.observer.observe(element);
      } else {
        loadDetails(stack.id);
      }
    }

    function resetView() {
      state.generation += 1;
      if (state.observer) {
        state.observer.disconnect();
      }
      revokeThumbnails();
      state.groups.clear();
      state.groupStackIds.clear();
      state.detailErrors.clear();
      elements.STACK_LIST.replaceChildren();
    }

    function renderAll() {
      state.observer = createObserver();
      state.stacks.forEach(mountGroup);
      updateSummary();
    }

    async function loadStacks() {
      const connection = readConnection();
      if (connection.error) {
        showStatus(connection.error, undefined, STATUS_KINDS.ERROR);
        return;
      }
      elements.LOAD_BUTTON.disabled = true;
      showStatus('STATUS_LOADING', undefined, STATUS_KINDS.INFO);
      try {
        const client = api.createClient({ ...connection, fetchFn });
        const stacks = (await client.getStacks()) || [];
        persistSettings(connection);
        resetView();
        state.client = client;
        state.stacks = stacks.map(model.buildStackSummary);
        renderAll();
        if (stacks.length > 0) {
          showStatus('STATUS_LOADED', { count: stacks.length }, STATUS_KINDS.SUCCESS);
        } else {
          showStatus('STATUS_NO_STACKS', undefined, STATUS_KINDS.SUCCESS);
        }
      } catch (error) {
        showError(error);
      } finally {
        elements.LOAD_BUTTON.disabled = false;
      }
    }

    /** Reloads a stack after a change; false if Immich has dissolved it. */
    async function refreshStack(stackId) {
      let rawStack;
      try {
        rawStack = await state.client.getStack(stackId);
      } catch (error) {
        if (error.status === config.HTTP_STATUS_NOT_FOUND) {
          removeStack(stackId);
          return false;
        }
        throw error;
      }
      const detailed = await model.loadStackDetails(state.client, model.buildStackSummary(rawStack));
      await updateStack(detailed);
      return true;
    }

    /** Runs an action; it returns [key, values] of the success message. */
    async function runAction(action) {
      state.busy = true;
      try {
        const [key, values] = await action();
        showStatus(key, values, STATUS_KINDS.SUCCESS);
      } catch (error) {
        showError(error);
      } finally {
        state.busy = false;
      }
    }

    async function handleRemoveAsset(stack, asset) {
      const name = ui.displayName(asset);
      if (state.busy || !confirmFn(t('CONFIRM_REMOVE_ASSET', { name }))) {
        return;
      }
      await runAction(async () => {
        await state.client.removeAssetFromStack(stack.id, asset.id);
        const stillExists = await refreshStack(stack.id);
        return [stillExists ? 'STATUS_ASSET_REMOVED' : 'STATUS_STACK_DISSOLVED', { name }];
      });
    }

    async function handleDeleteStack(stack) {
      const question = t('CONFIRM_DELETE_STACK', { count: stack.assets.length });
      if (state.busy || !confirmFn(question)) {
        return;
      }
      await runAction(async () => {
        await state.client.deleteStack(stack.id);
        removeStack(stack.id);
        return ['STATUS_STACK_DELETED'];
      });
    }

    /** Switches the language and re-translates the whole UI without reloading data. */
    function changeLanguage(code) {
      const language = i18n.setLanguage(code);
      elements.LANGUAGE.value = language;
      writeStorage(storage, STORAGE_KEYS.LANGUAGE, language);
      ui.applyStaticTexts(doc);
      state.stacks.forEach((stack) => replaceGroup(stack));
      updateSummary();
      renderStatus();
      return language;
    }

    function initLanguage() {
      ui.renderLanguageOptions(doc, elements.LANGUAGE, i18n.availableLanguages());
      const stored = readStorage(storage, STORAGE_KEYS.LANGUAGE);
      const candidates = [stored, ...(deps.languages || [])].filter(Boolean);
      changeLanguage(i18n.resolveLanguage(candidates));
      elements.LANGUAGE.addEventListener('change', () => changeLanguage(elements.LANGUAGE.value));
    }

    function init() {
      initLanguage();
      restoreSettings();
      elements.FORM.addEventListener('submit', (event) => {
        event.preventDefault();
        loadStacks();
      });
      elements.FILTER.addEventListener('input', applyFilter);
      elements.FILTER_SINGLE_IMAGE.addEventListener('change', applyFilter);
    }

    return {
      init,
      loadStacks,
      loadDetails,
      applyFilter,
      changeLanguage,
      handleRemoveAsset,
      handleDeleteStack,
      state,
    };
  }

  function getStorage(win) {
    try {
      return win.localStorage;
    } catch {
      return null;
    }
  }

  function getBrowserLanguages(win) {
    const navigator = win.navigator || {};
    return navigator.languages || [navigator.language].filter(Boolean);
  }

  /** Starts the application in the browser. */
  function bootstrap(win) {
    const app = createApp({
      doc: win.document,
      storage: getStorage(win),
      fetchFn: win.fetch.bind(win),
      confirmFn: win.confirm.bind(win),
      createObjectUrl: (blob) => win.URL.createObjectURL(blob),
      revokeObjectUrl: (url) => win.URL.revokeObjectURL(url),
      IntersectionObserverCtor: win.IntersectionObserver,
      languages: getBrowserLanguages(win),
    });
    app.init();
    return app;
  }

  const app = { createApp, bootstrap };

  if (typeof module === 'object' && module.exports) {
    module.exports = app;
  } else if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => bootstrap(window));
  }
  ns.app = app;
})(typeof globalThis !== 'undefined' ? globalThis : this);
