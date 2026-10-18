# Konzept Stacks Suche
## Motivation
In Immich ist es nicht möglich Stacks anzuzeigen. Das Handling ist somit erschwert.

# Software-Aufbau
Die "Software" soll eine lokale HTML Datei mit Javascript sein. Diese hat Eingabefelder für
- Immich-Server
- Access Token

Liste alle Stacks auf als Gruppen auf und zeige jedes einzelne Bild dieses Stacks mit Bildinformationen an:
- Dateiname und Pfad
- Auflösung
- Dateigröße
- In Alben vorhanden? (Wenn ja: Welche)
- Tags vorhanden? (Wenn ja: welche)

Es sollen keine Bilder an sicht gelöscht werden!

In der Software sollen
a) Einzelne Bilder aus den Stack entfernt werden (nicht die Datei selbst)
b) Der ganze Stack soll gelöscht werden.

Die Sprache soll umschaltbar Deutsch und Englisch sein. (Offen für weitere.)
Die Quellsprache ist Englisch.

## Filter
- Es soll einen Filter geben um nur Stacks anzuzeigen, die nur ein Bild haben.