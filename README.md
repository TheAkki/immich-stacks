# Immich Stacks

Eine kleine, lokale Web-Oberfläche, die alle **Stacks** eines
[Immich](https://immich.app)-Servers übersichtlich anzeigt. In Immich selbst
gibt es dafür bisher keine Übersicht.

Für jeden Stack werden alle enthaltenen Bilder angezeigt, jeweils mit

- Vorschaubild (das Hauptbild ist markiert)
- Dateiname und Pfad
- Auflösung
- Dateigröße
- Alben, in denen das Bild enthalten ist
- Tags

Die Oberfläche ist auf **Englisch** und **Deutsch** verfügbar und lässt sich
oben rechts umschalten. Weitere Sprachen können leicht ergänzt werden (siehe unten).

Verfügbare Aktionen:

- **Aus Stack entfernen**: Das Bild wird aus dem Stack herausgelöst. Die Datei bleibt erhalten.
- **Stack löschen**: Der Stack (also die Gruppierung) wird aufgelöst. Alle Bilder bleiben erhalten.

> **Es werden niemals Bilder gelöscht.** Der API-Client in `js/api.js` hat
> bewusst keine Funktion zum Löschen von Assets, und ein Unit-Test stellt sicher,
> dass schreibende Aufrufe nur `/api/stacks/…` betreffen. Vor jeder Aktion
> fragt die Oberfläche noch einmal nach.

## Voraussetzungen

- Ein moderner Browser (Firefox, Chrome, Edge, Safari)
- Ein Immich-Server mit einer aktuellen Version, die den Endpunkt
  `DELETE /api/stacks/{id}/assets/{assetId}` anbietet
- Ein **API-Key** (Immich → Kontoeinstellungen → API-Schlüssel) oder ein
  Access Token. Benötigte Berechtigungen des API-Keys:
  `stack.read`, `stack.update`, `stack.delete`, `asset.read`, `asset.view`, `album.read`
  (oder einfach `all`).

Für die Nutzung selbst wird keine Installation benötigt. Node.js (≥ 22) brauchst
du nur zum Ausführen der Tests.

## Anleitung

1. Repository klonen oder als ZIP herunterladen.
2. `index.html` per Doppelklick im Browser öffnen.
3. Die **Server-URL** eintragen, z. B. `https://immich.example.org` oder
   `http://192.168.1.10:2283`. Ein angehängtes `/api` ist optional.
4. Die **Authentifizierung** wählen:
   - *API-Key*: wird im Header `x-api-key` gesendet (empfohlen)
   - *Access Token*: wird als `Authorization: Bearer …` gesendet
5. Token bzw. Key einfügen und auf **Stacks laden** klicken.
6. Mit **„Nur Stacks mit einem einzigen Bild“** werden nur Stacks angezeigt,
   die genau ein Bild enthalten. Solche Stacks sind meist Überbleibsel und
   können gelöscht werden.
7. Über das Suchfeld lassen sich die Stacks nach Dateiname, Pfad, Album oder
   Tag filtern. Beide Filter lassen sich kombinieren. Alben und Tags werden erst geladen, wenn ein Stack in den
   sichtbaren Bereich scrollt; die Filterung nach Album bzw. Tag greift also
   nur für bereits geladene Stacks.

Server-URL, Authentifizierungsart und Sprache werden im `localStorage` des
Browsers gespeichert. Beim ersten Start wird die Sprache des Browsers verwendet,
falls sie unterstützt wird, sonst Englisch. Der Token wird **nicht** gespeichert.

### Fehlerbehebung

- **„Netzwerkfehler – Server nicht erreichbar oder CORS blockiert“**: Der Browser
  verweigert die Anfrage. Prüfe, ob die URL stimmt und der Server erreichbar ist.
  Wenn ein Reverse Proxy (nginx, Traefik, Caddy …) vor Immich läuft, muss er
  CORS-Anfragen (inkl. `OPTIONS`-Preflight und der Header `x-api-key` bzw.
  `Authorization`) durchlassen.
- **HTTP 401/403**: Token ungültig oder dem API-Key fehlen Berechtigungen (siehe oben).

## Projektstruktur

```
index.html          Oberfläche (lokal im Browser öffnen)
css/style.css       Gestaltung (hell/dunkel)
js/config.js        Alle Konstanten, API-Pfade und Spracheinstellungen
js/i18n.js          Sprachwahl und Übersetzung (t(), Rückfall auf Englisch)
js/locales/en.js    Englische Texte (Quellsprache)
js/locales/de.js    Deutsche Übersetzung
js/format.js        Formatierung (Dateigröße, Auflösung, Listen)
js/api.js           Immich-API-Client (ohne Lösch-Funktion für Assets)
js/model.js         Datenlogik (Anzeige-Modelle, Filter, Nachladen)
js/ui.js            DOM-Aufbau
js/app.js           Anwendungslogik und Verdrahtung
tests/              Unit-Tests (Node-Test-Runner, ohne Abhängigkeiten)
scripts/lint.js     Abhängigkeitsfreier Linter
```

Die Skripte werden als klassische `<script>`-Dateien geladen (nicht als
ES-Module), weil Browser ES-Module von `file://` blockieren. Jede Datei
registriert sich im Browser unter `window.ImmichStacks` und exportiert sich in
Node per `module.exports`.

## Weitere Sprache hinzufügen

Englisch ist die Quellsprache: Neue Texte werden zuerst in `js/locales/en.js`
angelegt. Fehlt eine Übersetzung, wird automatisch der englische Text angezeigt.

1. `js/locales/en.js` nach `js/locales/<code>.js` kopieren (z. B. `fr.js`),
   den Eintrag am Dateiende auf `.fr = locale` ändern und `meta` (`name`,
   `numberLocale`) sowie alle Texte übersetzen. Platzhalter wie `{count}`
   bleiben unverändert.
2. Den Code in `SUPPORTED_LANGUAGES` in `js/config.js` eintragen.
3. In `index.html` vor `js/i18n.js` einbinden:
   `<script src="js/locales/fr.js"></script>`
4. `make test` ausführen. Ein Test prüft, dass jede Sprache genau dieselben
   Schlüssel und Platzhalter hat wie die englische Quelle.

## Entwicklung

Es gibt keine externen Abhängigkeiten, ein `npm install` ist nicht nötig.

```sh
make test       # Unit-Tests
make coverage   # Tests mit Abdeckungsbericht (Mindestwert 80 %)
make lint       # Syntax- und Projektregeln prüfen
make check      # lint + coverage
```

## Lizenz

Copyright (C) 2026 theakki

Dieses Programm ist freie Software: Du kannst es unter den Bedingungen der
GNU General Public License, wie von der Free Software Foundation veröffentlicht,
weitergeben und/oder modifizieren, entweder gemäß Version 3 der Lizenz oder
(nach deiner Wahl) jeder späteren Version.

Dieses Programm wird in der Hoffnung verbreitet, dass es nützlich ist, aber
OHNE JEDE GEWÄHRLEISTUNG. Details findest du in der Datei [LICENSE](LICENSE).

SPDX-License-Identifier: `GPL-3.0-or-later`

Dieses Projekt steht in keiner Verbindung zum offiziellen Immich-Projekt.
