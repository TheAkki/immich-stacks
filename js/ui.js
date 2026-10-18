// SPDX-License-Identifier: GPL-3.0-or-later
// DOM rendering. The document is passed in so the functions stay testable.
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});
  const config = typeof require === 'function' ? require('./config.js') : ns.config;
  const format = typeof require === 'function' ? require('./format.js') : ns.format;
  const i18n = typeof require === 'function' ? require('./i18n.js') : ns.i18n;
  const { SYMBOLS } = config;
  const { t } = i18n;

  const DATA_STACK_ID = 'data-stack-id';
  const DATA_ASSET_ID = 'data-asset-id';
  const CLASS_STATUS_PREFIX = 'status--';

  /** Creates an element with optional class, text, attributes and children. */
  function el(doc, tag, options = {}, children = []) {
    const element = doc.createElement(tag);
    if (options.className) {
      element.className = options.className;
    }
    if (options.text !== undefined) {
      element.textContent = options.text;
    }
    Object.entries(options.attrs || {}).forEach(([name, value]) => element.setAttribute(name, value));
    children.forEach((child) => element.appendChild(child));
    return element;
  }

  function renderInfoRow(doc, label, value) {
    return el(doc, 'div', { className: 'info-row' }, [
      el(doc, 'dt', { text: label }),
      el(doc, 'dd', { text: value }),
    ]);
  }

  /** Display name of an image; "unknown" if Immich provides none. */
  function displayName(asset) {
    return asset.fileName || t('UNKNOWN');
  }

  function renderInfoList(doc, asset) {
    return el(doc, 'dl', { className: 'info-list' }, [
      renderInfoRow(doc, t('LABEL_FILE_NAME'), displayName(asset)),
      renderInfoRow(doc, t('LABEL_PATH'), asset.path || SYMBOLS.EMPTY_VALUE),
      renderInfoRow(doc, t('LABEL_RESOLUTION'), format.formatResolution(asset.width, asset.height)),
      renderInfoRow(doc, t('LABEL_FILE_SIZE'), format.formatBytes(asset.fileSize)),
      renderInfoRow(doc, t('LABEL_ALBUMS'), format.formatList(asset.albums, t('NO_ALBUMS'))),
      renderInfoRow(doc, t('LABEL_TAGS'), format.formatList(asset.tags, t('NO_TAGS'))),
    ]);
  }

  function renderButton(doc, { text, title, className, onClick }) {
    const button = el(doc, 'button', { className, text, attrs: { type: 'button', title } });
    button.addEventListener('click', onClick);
    return button;
  }

  function renderThumbnail(doc, asset) {
    return el(doc, 'img', {
      className: 'thumbnail',
      attrs: {
        alt: t('THUMBNAIL_ALT', { name: displayName(asset) }),
        [DATA_ASSET_ID]: asset.id,
      },
    });
  }

  /** Card for a single image including the "remove from stack" action. */
  function renderAssetCard(doc, asset, { onRemove }) {
    const thumbnail = renderThumbnail(doc, asset);
    const children = [el(doc, 'div', { className: 'thumbnail-frame' }, [thumbnail])];
    if (asset.isPrimary) {
      children.push(el(doc, 'span', { className: 'badge', text: t('LABEL_PRIMARY') }));
    }
    children.push(renderInfoList(doc, asset));
    children.push(
      renderButton(doc, {
        text: t('BUTTON_REMOVE_ASSET'),
        title: t('BUTTON_REMOVE_ASSET_TITLE'),
        className: 'button button--secondary',
        onClick: () => onRemove(asset),
      }),
    );
    const card = el(doc, 'article', { className: 'asset-card', attrs: { [DATA_ASSET_ID]: asset.id } }, children);
    return { card, thumbnail };
  }

  function renderStackHeader(doc, stack, onDeleteStack) {
    const count = stack.assets.length;
    const headingKey = count === config.SINGLE_IMAGE_STACK_SIZE ? 'STACK_HEADING_SINGLE' : 'STACK_HEADING';
    const heading = el(doc, 'h2', { text: t(headingKey, { count }) });
    const deleteButton = renderButton(doc, {
      text: t('BUTTON_DELETE_STACK'),
      title: t('BUTTON_DELETE_STACK_TITLE'),
      className: 'button button--danger',
      onClick: () => onDeleteStack(stack),
    });
    return el(doc, 'header', { className: 'stack-header' }, [heading, deleteButton]);
  }

  function renderDetailsNotice(doc, stack, detailsError) {
    if (detailsError) {
      const text = t('DETAILS_ERROR', { message: detailsError });
      return el(doc, 'p', { className: 'notice notice--error', text });
    }
    if (!stack.detailsLoaded) {
      return el(doc, 'p', { className: 'notice', text: t('DETAILS_LOADING') });
    }
    return null;
  }

  /**
   * Renders a stack group.
   * @returns {{ element: object, thumbnails: Array<{assetId: string, img: object}> }}
   */
  function renderStackGroup(doc, stack, { onRemoveAsset, onDeleteStack, detailsError = null }) {
    const thumbnails = [];
    const cards = stack.assets.map((asset) => {
      const { card, thumbnail } = renderAssetCard(doc, asset, {
        onRemove: (selected) => onRemoveAsset(stack, selected),
      });
      thumbnails.push({ assetId: asset.id, img: thumbnail });
      return card;
    });
    const children = [renderStackHeader(doc, stack, onDeleteStack)];
    const notice = renderDetailsNotice(doc, stack, detailsError);
    if (notice) {
      children.push(notice);
    }
    children.push(el(doc, 'div', { className: 'asset-grid' }, cards));
    const element = el(doc, 'section', { className: 'stack-group', attrs: { [DATA_STACK_ID]: stack.id } }, children);
    return { element, thumbnails };
  }

  /** Sets the status message and its kind (info/success/error). */
  function setStatus(statusElement, message, kind = config.STATUS_KINDS.INFO) {
    statusElement.textContent = message;
    statusElement.className = `status ${CLASS_STATUS_PREFIX}${kind}`;
  }

  /** Translates the static page texts (heading, labels, placeholders). */
  function applyStaticTexts(doc) {
    config.STATIC_TEXTS.forEach(({ id, key, attr }) => {
      const element = doc.getElementById(id);
      if (!element) {
        return;
      }
      if (attr) {
        element.setAttribute(attr, t(key));
      } else {
        element.textContent = t(key);
      }
    });
    doc.title = t('APP_TITLE');
    doc.documentElement.lang = i18n.getLanguage();
  }

  /** Fills the language picker with all available languages. */
  function renderLanguageOptions(doc, select, languages) {
    select.replaceChildren(
      ...languages.map(({ code, name }) => el(doc, 'option', { text: name, attrs: { value: code } })),
    );
  }

  const ui = {
    el,
    displayName,
    renderAssetCard,
    renderStackGroup,
    setStatus,
    applyStaticTexts,
    renderLanguageOptions,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = ui;
  }
  ns.ui = ui;
})(typeof globalThis !== 'undefined' ? globalThis : this);
