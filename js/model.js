// SPDX-License-Identifier: GPL-3.0-or-later
// Pure data logic: converts API responses into view models.
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});
  const config = typeof require === 'function' ? require('./config.js') : ns.config;

  function getResolution(asset) {
    const exif = asset.exifInfo || {};
    return {
      width: exif.exifImageWidth ?? asset.width ?? null,
      height: exif.exifImageHeight ?? asset.height ?? null,
    };
  }

  /** Returns tag names (full path preferred) or null if not loaded. */
  function getTagNames(asset) {
    if (!Array.isArray(asset.tags)) {
      return null;
    }
    return asset.tags.map((tag) => tag.value || tag.name).filter(Boolean);
  }

  /** Returns album names or null if not loaded. */
  function getAlbumNames(albums) {
    if (!Array.isArray(albums)) {
      return null;
    }
    return albums.map((album) => album.albumName).filter(Boolean);
  }

  /** Builds the view model of an image. */
  function buildAssetInfo(asset, { albums = null, isPrimary = false } = {}) {
    const { width, height } = getResolution(asset);
    const exif = asset.exifInfo || {};
    return {
      id: asset.id,
      fileName: asset.originalFileName || '',
      path: asset.originalPath || '',
      width,
      height,
      fileSize: exif.fileSizeInByte ?? null,
      albums: getAlbumNames(albums),
      tags: getTagNames(asset),
      isPrimary,
    };
  }

  function sortPrimaryFirst(assets) {
    return [...assets].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }

  /** Builds a stack model from the stack list (without details). */
  function buildStackSummary(stack) {
    const assets = (stack.assets || []).map((asset) =>
      buildAssetInfo(asset, { isPrimary: asset.id === stack.primaryAssetId }),
    );
    return {
      id: stack.id,
      primaryAssetId: stack.primaryAssetId,
      assets: sortPrimaryFirst(assets),
      detailsLoaded: false,
    };
  }

  /** Runs fn for all items, at most `limit` at a time; preserves order. */
  async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await fn(items[index], index);
      }
    }
    const workerCount = Math.max(1, Math.min(limit, items.length));
    await Promise.all(Array.from({ length: workerCount }, worker));
    return results;
  }

  async function loadAssetDetails(client, assetInfo) {
    const [asset, albums] = await Promise.all([
      client.getAsset(assetInfo.id),
      client.getAlbumsForAsset(assetInfo.id),
    ]);
    return buildAssetInfo(asset, { albums, isPrimary: assetInfo.isPrimary });
  }

  /** Loads file size, resolution, albums and tags for all images of a stack. */
  async function loadStackDetails(client, stack) {
    const assets = await mapWithConcurrency(stack.assets, config.DETAIL_CONCURRENCY, (asset) =>
      loadAssetDetails(client, asset),
    );
    return { ...stack, assets, detailsLoaded: true };
  }

  function assetSearchText(asset) {
    return [asset.fileName, asset.path, ...(asset.albums || []), ...(asset.tags || [])]
      .join('\n')
      .toLowerCase();
  }

  /** Checks whether any image of the stack matches the query (name, path, album, tag). */
  function stackMatchesQuery(stack, query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return stack.assets.some((asset) => assetSearchText(asset).includes(needle));
  }

  function hasSingleImage(stack) {
    return stack.assets.length === config.SINGLE_IMAGE_STACK_SIZE;
  }

  /** Checks a stack against the full filter: text query and "single image only". */
  function stackMatchesFilter(stack, { query = '', singleImageOnly = false } = {}) {
    return (!singleImageOnly || hasSingleImage(stack)) && stackMatchesQuery(stack, query);
  }

  function filterStacks(stacks, filter) {
    return stacks.filter((stack) => stackMatchesFilter(stack, filter));
  }

  const model = {
    buildAssetInfo,
    buildStackSummary,
    mapWithConcurrency,
    loadStackDetails,
    stackMatchesQuery,
    hasSingleImage,
    stackMatchesFilter,
    filterStacks,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = model;
  }
  ns.model = model;
})(typeof globalThis !== 'undefined' ? globalThis : this);
