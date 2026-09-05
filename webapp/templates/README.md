# Vorlagen-Ordner (lokal, NICHT im Repo)

Hier legst du die echten, proprietären Word-Vorlagen (.docx) ab, die die
Webapp beim Klick auf "... erzeugen (.docx)" befüllt. Dieser Ordner ist per
`.gitignore` ausgeschlossen - die Dateien werden **nicht committet** und
landen **nicht** auf GitHub Pages (siehe KONZEPT.md Abschnitt 5).

## Was hierhin gehört

Einfach die Original-.docx-Dateien so ablegen, wie sie von QualiPSO/aus dem
Dokumentenmanagementsystem kommen - der Dateiname ist egal, die App erkennt
die richtige Vorlage automatisch am Inhalt (Dok-Nr. im Fließtext), nicht am
Dateinamen. Aktuell unterstützt:

| Dokument | Dok-Nr. |
|---|---|
| CS-Validierungsbericht (CS-VB) | QU-MT-0003543 |
| CS-Validierungsplan (CS-VP) | QU-MT-0000722 (Erzeugung noch in Arbeit) |

## Wie die App diesen Ordner benutzt

Beim ersten Klick auf einen "... erzeugen"-Knopf fragt der Browser einmalig
nach diesem Ordner (Firefox: stattdessen ein normaler Datei-Auswahl-Dialog,
jedes Mal neu). Danach merkt sich der Browser den Zugriff, solange die App
im selben Browser-Profil läuft - kein erneutes Auswählen nötig, außer der
Zugriff wird vom Browser zurückgesetzt.
