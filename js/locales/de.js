// SPDX-License-Identifier: GPL-3.0-or-later
// German translation of the UI texts (source: en.js).
'use strict';

(function (root) {
  const ns = root.ImmichStacks || (root.ImmichStacks = {});

  const locale = Object.freeze({
    meta: Object.freeze({ name: 'Deutsch', numberLocale: 'de-DE' }),
    messages: Object.freeze({
      APP_TITLE: 'Immich Stacks',
      APP_HINT:
        'Zeigt alle Stacks deines Immich-Servers an. Es werden niemals Bilder gelöscht – nur Stacks bzw. die Zuordnung eines Bildes zu einem Stack.',
      LABEL_LANGUAGE: 'Sprache',
      LABEL_SERVER: 'Immich-Server',
      LABEL_AUTH: 'Authentifizierung',
      AUTH_API_KEY: 'API-Key (x-api-key)',
      AUTH_BEARER: 'Access Token (Bearer)',
      LABEL_TOKEN: 'Access Token / API-Key',
      BUTTON_LOAD: 'Stacks laden',
      FILTER_PLACEHOLDER: 'Filtern nach Dateiname, Pfad, Album oder Tag',
      FILTER_SINGLE_IMAGE: 'Nur Stacks mit einem einzigen Bild',

      UNKNOWN: 'unbekannt',

      STATUS_LOADING: 'Lade Stacks …',
      STATUS_LOADED: '{count} Stacks geladen.',
      STATUS_NO_STACKS: 'Keine Stacks gefunden.',
      STATUS_ERROR: 'Fehler: {message}',
      STATUS_INVALID_URL: 'Bitte eine gültige Server-URL (http/https) angeben.',
      STATUS_MISSING_TOKEN: 'Bitte einen Access Token bzw. API-Key angeben.',
      STATUS_ASSET_REMOVED: 'Bild „{name}“ wurde aus dem Stack entfernt. Die Datei bleibt erhalten.',
      STATUS_STACK_DELETED: 'Stack wurde gelöscht. Die Bilder bleiben erhalten.',
      STATUS_PRIMARY_SET: 'Bild „{name}“ ist jetzt das Hauptbild.',
      STATUS_STACK_DISSOLVED:
        'Bild „{name}“ wurde entfernt; Immich hat den Stack aufgelöst, da zu wenige Bilder übrig sind.',

      CONFIRM_REMOVE_ASSET: 'Bild „{name}“ aus dem Stack entfernen?\n\nDie Datei selbst wird NICHT gelöscht.',
      CONFIRM_DELETE_STACK:
        'Stack mit {count} Bildern löschen?\n\nNur die Gruppierung wird aufgehoben, die Bilder selbst werden NICHT gelöscht.',

      STACK_HEADING: 'Stack mit {count} Bildern',
      STACK_HEADING_SINGLE: 'Stack mit 1 Bild',
      SUMMARY: '{visible} von {total} Stacks angezeigt',
      LABEL_PRIMARY: 'Hauptbild',
      LABEL_FILE_NAME: 'Dateiname',
      LABEL_PATH: 'Pfad',
      LABEL_RESOLUTION: 'Auflösung',
      LABEL_FILE_SIZE: 'Dateigröße',
      LABEL_ALBUMS: 'Alben',
      LABEL_TAGS: 'Tags',
      NO_ALBUMS: 'in keinem Album',
      NO_TAGS: 'keine Tags',
      THUMBNAIL_ALT: 'Vorschau von {name}',

      BUTTON_REMOVE_ASSET: 'Aus Stack entfernen',
      BUTTON_REMOVE_ASSET_TITLE: 'Entfernt das Bild aus dem Stack. Die Datei bleibt erhalten.',
      BUTTON_SET_PRIMARY: 'Als Hauptbild setzen',
      BUTTON_SET_PRIMARY_TITLE: 'Macht dieses Bild zum Hauptbild des Stacks.',
      BUTTON_DELETE_STACK: 'Stack löschen',
      BUTTON_DELETE_STACK_TITLE: 'Hebt die Gruppierung auf. Die Bilder bleiben erhalten.',

      DETAILS_LOADING: 'Details werden geladen …',
      DETAILS_ERROR: 'Details konnten nicht geladen werden: {message}',

      ERROR_HTTP: 'HTTP {status}: {detail}',
      ERROR_NETWORK: 'Netzwerkfehler – Server nicht erreichbar oder CORS blockiert ({message})',
    }),
  });

  if (typeof module === 'object' && module.exports) {
    module.exports = locale;
  }
  (ns.locales || (ns.locales = {})).de = locale;
})(typeof globalThis !== 'undefined' ? globalThis : this);
