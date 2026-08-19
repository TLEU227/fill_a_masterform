# Konzept: Masterform – Datenbank & Vorausfüllen von Qualifizierungs-/Validierungsdokumenten

Status: **Entwurf zur Diskussion** – noch keine Umsetzung.

## 0. Ausgangslage

- Aktuell: eine Excel-Datei mit gesammelten Stammdaten (Systeme, Geräte,
  Anforderungen, Ansprechpartner, ...).
- Ziel: diese Daten in eine Datenbank überführen und daraus
  Qualifizierungs-/Validierungsdokumente **vorausfüllen** (QP, QB,
  Systembewertung, URS, RA, Tracematrix, weitere).
- Rahmenbedingungen:
  - Web-basiert, aber **ohne eigenen Server** (rein clientseitig im
    Browser). Start lokal (Datei auf dem Rechner/Netzlaufwerk), später
    ggf. auf einen Ort mit Zugriff für mehrere Personen (z.B. SharePoint)
    verschoben – das UI selbst ändert sich dabei nicht.
  - Datenbank als **eine SQLite-Datei** (transparent, portabel, mit
    Standard-Tools inspizierbar, leicht zu sichern/zu versionieren).
  - **Erst 1 Nutzer**, später mehrere – Architektur sollte das nicht
    ausschließen, aber jetzt nicht überkonstruiert werden.
  - Korrekturen: **einfacher Status + grobe Historie** (kein voller,
    GxP-strenger Audit-Trail à la 21 CFR Part 11 – das bleibt vorerst
    außerhalb des Tools Sache der Unterschriften-/QM-Prozesse).
  - Templates und Datenbank werden hier im Repo (bei mir) verwaltet.

## 1. Grobarchitektur

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (statische Web-App, keine Installation, kein Server) │
│                                                               │
│  ┌───────────────┐   ┌───────────────┐   ┌────────────────┐ │
│  │ Datenerfassung │  │  Korrektur/    │  │ Dokument-       │ │
│  │ (leer/Kopie/   │  │  Pflege-UI     │  │ Erstellung/     │ │
│  │  bearbeiten)   │  │               │  │ Finalisierung    │ │
│  └──────┬────────┘   └──────┬────────┘   └──────┬─────────┘ │
│         │                    │                    │          │
│         └─────────► SQLite-Datei (im Browser via WASM) ◄─────┘
│                        (lokale .sqlite-Datei)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 Word-Templates (.docx, {{platzhalter}})
                              │
                              ▼
                 Ausgefüllte Dokumente (Entwurf → Finalisiert)
```

- Alles läuft im Browser als statische HTML/JS-Anwendung (Doppelklick auf
  `index.html`, keine Installation, kein Backend).
- Die SQLite-Datei wird direkt im Browser gelesen/geschrieben (per
  `sql.js`, SQLite als WASM). Speichern erfolgt entweder direkt in eine
  Datei auf der Platte (File System Access API, Chrome/Edge) oder per
  Download/Upload-Knopf als Fallback für andere Browser.
- Das Ausfüllen der `.docx`-Templates kann in zwei Varianten passieren
  (siehe Abschnitt 5) – das bereits gebaute Python-Modul `masterform`
  bleibt in jedem Fall die Referenz-Logik für die Platzhalter-Regeln.

## 2. Datenmodell (SQLite)

Da die Excel-Datei vermutlich viele, sich noch ändernde Spalten/Felder
hat und wir unterschiedliche "Objekttypen" (System, Gerät, Anforderung,
Risikoeintrag, ...) abbilden müssen, ohne bei jeder neuen Spalte das
Schema zu migrieren, schlage ich ein **schlankes, generisches
Kern-Schema** vor statt für jeden Dokumenttyp eine eigene starre Tabelle:

| Tabelle | Zweck |
|---|---|
| `entity_types` | Objekttypen, z.B. `system`, `geraet`, `raum`, `anforderung` (URS-Punkt), `risiko` (RA-Eintrag), `person` |
| `field_definitions` | Welche Felder es je Objekttyp gibt: `key` (= Platzhaltername), `label`, `datentyp`, `pflichtfeld`, `gruppe` |
| `records` | Ein konkreter Datensatz eines Objekttyps, z.B. "System: HPLC-042", inkl. `status` (`entwurf`/`final`) |
| `field_values` | Die tatsächlichen Werte: `record_id`, `field_key`, `wert` |
| `relations` | Verknüpfungen zwischen Datensätzen, z.B. `anforderung` → gehört zu `system`; `risiko` → bezieht sich auf `anforderung` (nötig für URS/RA/Tracematrix, die sich gegenseitig referenzieren) |
| `change_log` | Grobe Historie: wer hat wann welches Feld von welchem Wert auf welchen Wert geändert (kein Freitext-Begründungszwang, aber vorhanden) |
| `templates` | Registrierte Word-Vorlagen: `key`, `name`, `dokumenttyp` (QP/QB/URS/RA/Tracematrix/Systembewertung/...), Dateipfad, benötigte Platzhalter |
| `documents` | Erzeugte Dokumente: welches Template, welche(r) Datensatz(-Bezug), `status` (`entwurf`/`final`), Zeitpunkt Erzeugung/Finalisierung, **Snapshot der verwendeten Werte** (als JSON, eingefroren bei Finalisierung) |

Warum dieses "generische" Modell (statt fixer Tabellen pro Dokumenttyp)?
- Neue Felder aus der Excel-Datei lassen sich einfach als neue Zeile in
  `field_definitions` ergänzen, ohne das DB-Schema zu ändern.
- `field_definitions.key` **ist** direkt der Platzhaltername im
  Word-Template (siehe Abschnitt 3) – Datenbank und Dokumente sprechen
  dieselbe Sprache, das war dein Wunsch nach "einheitlichem Einfügen".
- Nachteil: Abfragen sind etwas technischer (Key-Value statt normaler
  Spalten) – das UI kapselt das aber vollständig, du siehst nur Formulare.

### 2.1 Zwei Datenbanken: System-DB + Projekt-DB

Ergänzung vom 19.08.: neben den Systemdaten (oben, "System-DB") gibt es
**Projektdaten**, die für jedes Validierungsprojekt neu anfallen und sich
auch bei unverändertem System von Projekt zu Projekt unterscheiden können
(z.B. weil dasselbe System mehrfach re-validiert wird). Diese kommen in
eine **zweite, eigenständige .sqlite-Datei** ("Projekt-DB") - gleiches
generisches Schema (`schema.sql`), eigene Start-Feldliste
(`seed_field_definitions_projekt.sql`), Objektarten `projekt` und
`versionshistorie_eintrag`. Verknüpfung zur System-DB über den **Feldwert**
`mlcs_id` (kein klassischer Fremdschlüssel - zwei unabhängige Dateien).

Bei der Erstellung eines CS-Validierungsplans werden **beide** Datenbanken
gebraucht.

Beispiele für Projektdaten (nicht System-DB):
- Ist dies ein Folgeprojekt? Falls ja: Vorgänger-Dokument (Dok-ID + Version)
  → daraus abgeleitet die **Folgeversion (FV)** dieses Dokuments:
  - kein Folgeprojekt → FV = 1.0, die "V2.0 (CC Nummer): ..."-Zeilen im VP
    entfallen komplett (keine Historie).
  - FV = 2.0 → diese Zeilen bleiben, befüllt mit der Change-Control-Nummer
    dieses Projekts.
  - FV ≥ 3.0 → die V2.0-Zeile bleibt als Historie erhalten, zusätzlich
    kommt eine neue Zeile für die aktuelle FV + ihre CC-Nummer dazu
    (Objektart `versionshistorie_eintrag`, eine Liste/Historie statt eines
    einzelnen Feldes - analog zu den URS/RA/Prüfschritt-Listen).
- Change-Control-Nummer dieses Projekts (vorher irrtümlich in der System-DB
  angelegt, jetzt hierher verschoben).
- Hauptfunktion des Systems (Kap. 1.1/1.4 CS-VP) - kann von Projekt zu
  Projekt variieren, deshalb nicht in der System-DB.
- Dok-ID + Version der zu **diesem** Projekt gehörenden Systembewertung
  (kann von der beim Excel-Import gefundenen abweichen, falls das System
  zwischenzeitlich neu bewertet wurde).

Offen/vereinfacht: der CS-Validierungsplan hat neben der einen
übergeordneten "V2.0 (CC Nummer): Beschreibung der Änderung..."-Zeile noch
10 weitere, kapitelspezifische Varianten davon (Systembewertung,
Verantwortlichkeiten, Lieferanten, Risikoanalyse, DQ, Traceability Matrix,
IQ, OQ, PQ). `versionshistorie_eintrag` deckt aktuell nur die eine
übergeordnete Zeile ab; ob die anderen zehn ebenfalls strukturiert erfasst
werden sollen, ist noch offen.

## 3. Einheitliche Markierungen in den Dokumenten

Platzhalter-Konvention (bereits so im bestehenden `masterform`-Code
umgesetzt): `{{entity_typ.feld_key}}`, z.B.

```
{{system.bezeichnung}}      {{system.hersteller}}      {{system.standort}}
{{anforderung.id}}          {{anforderung.text}}       {{anforderung.kategorie}}
{{risiko.beschreibung}}     {{risiko.einstufung}}
{{person.ersteller}}        {{person.pruefer}}         {{datum.erstellung}}
```

Zwei Platzhalter-Arten, die wir brauchen werden:

1. **Einzelwert-Platzhalter** – ein Wert, einmal im Dokument (z.B.
   Systemname im Kopf des QP). *Das können wir bereits.*
2. **Listen-/Tabellen-Platzhalter** – eine Tabellenzeile, die sich pro
   Datensatz wiederholt (z.B. jede Zeile der Tracematrix = ein
   URS-Punkt + zugehöriger Risikoeintrag + Teststatus). *Das ist neu und
   braucht eine Erweiterung des Fill-Mechanismus (wiederholende
   Tabellenzeile statt einmaligem Platzhalter).* Wird technisch nötig
   für URS-Tabellen, RA-Tabellen und die Tracematrix.

## 4. Prozesse

### a) Datenerfassung – 3 Szenarien im Browser-Formular

Klargestellt am 17.08.: "kein Massenimport" (Entscheidung vom 15.08.) bezog
sich auf eine UI-Funktion zum Anlegen vieler *neuer* Systeme auf einmal -
nicht auf den einmaligen Import der bereits vorhandenen Excel-Daten. Die
733 bestehenden Systeme aus `Systembewertungen_GESAMT.xlsx` werden per
`db/import_excel.py` einmalig in die Datenbank übernommen (1 Zeile =
1 Systemdatensatz, keine automatische Zusammenführung von
Dokumentversionen, siehe `docs/analyse_systembewertung_xlsx.md`) und als
**eingebettete Startdatenbank** in eine eigene App-Variante gebaut
(`webapp/build.js <db> <ausgabe.html>`), die beim Öffnen direkt startet -
kein Anlegen/Öffnen-Dialog. Diese befüllte Variante bleibt lokal beim
Nutzer, **nicht** im Git-Repo (siehe Abschnitt 0 - Code ins Repo, echte
Daten bleiben lokal). Danach wird die Datenbank über das Formular selbst
weitergepflegt, in drei Fällen:

1. **Neuanlage, alles leer**: leeres, aber gruppiertes Formular mit
   Dropdowns für die kategorialen Felder (GxP-Kritikalität,
   Gerätekategorie, ...) statt Freitext.
2. **Neuanlage auf Basis eines ähnlichen Systems**: bestehenden
   Datensatz als Vorlage wählen → Formular wird mit dessen Werten
   vorbefüllt und **sichtbar angezeigt** → Eingabe überschreibt nur die
   abweichenden Felder, Rest bleibt wie übernommen.
3. **Bestehendes System bearbeiten**: Datensatz laden → alle aktuellen
   Werte sichtbar → Eingabe überschreibt nur geänderte/neue Felder.

Szenario 2 und 3 unterscheiden sich technisch nur darin, ob am Ende ein
**neuer** Datensatz entsteht (2, mit Kopie der Werte als Startpunkt) oder
der **bestehende** Datensatz aktualisiert wird (3) – die Formular-UI ist
dieselbe.

### b) Korrektur – manuell (vor Finalisierung)
- Datensatz suchen/öffnen → Feld bearbeiten → Speichern.
- Jede Änderung erzeugt einen `change_log`-Eintrag (Feld, alt, neu,
  Zeitpunkt, wer) – reicht für "grobe Historie", ohne vollen Audit-Trail.

### c) Dokument erzeugen (Entwurf)
- Template + betroffene(r) Datensatz(-Bezug, z.B. ein System +
  zugehörige Anforderungen) auswählen.
- Vorschau der Werte, die eingesetzt werden, inkl. Warnung bei fehlenden
  Pflichtfeldern.
- Erzeugung des ausgefüllten `.docx` → Status `entwurf`. Werte werden
  zusätzlich als Snapshot im `documents`-Eintrag gespeichert.

### d) Finalisierung (Dokument wurde unterschrieben)
- Nutzer markiert das Dokument nach Ausdruck/Unterschrift als `final`
  (Datum, wer). Der Werte-Snapshot zu diesem Zeitpunkt wird endgültig
  eingefroren – das fertige Dokument wird durch spätere Korrekturen an
  den Stammdaten **nicht** rückwirkend verändert.

### e) Korrektur – nachdem ein Dokument finalisiert wurde
- Ändert sich später ein Stammdatenwert, der in einem finalisierten
  Dokument steckt, wird das **nicht** automatisch nachgezogen (das
  Dokument ist ja unterschrieben), sondern es entsteht ein einfacher
  Hinweis/Flag: *"Datensatz X wurde am ... geändert, wird in
  finalisiertem Dokument Y (Snapshot vom ...) noch mit altem Wert
  geführt"*. Das ist bewusst nur ein Hinweis zur Wiedervorlage, keine
  automatische Nachtrags-Logik – Entscheidung, was damit passiert
  (Änderungsmitteilung, neue Dokumentenversion, ...), bleibt beim
  Menschen.

## 5. Offene technische Entscheidung: wo läuft das Ausfüllen der .docx?

Zwei Optionen, beide mit derselben Platzhalter-Konvention:

- **A – Python bleibt der "Fill-Motor"** (das, was schon existiert):
  Web-App exportiert die Werte für ein Dokument als JSON-Datei; du
  führst lokal `python fill_template.py ... --data export.json` aus.
  Vorteil: nutzt sofort das bereits getestete, robuste Modul. Nachteil:
  ein manueller Zwischenschritt außerhalb des Browsers.
- **B – Alles im Browser** (JS-Portierung der gleichen Logik, z.B. via
  einer JS-Bibliothek, die `.docx` als ZIP/XML im Browser bearbeitet):
  ein Klick von "Datensatz wählen" bis "Download der fertigen Datei".
  Vorteil: wirklich nahtlos, kein Kontextwechsel. Nachteil: die
  Listen-/Tabellen-Platzhalter (Abschnitt 3) müssten in JS neu gebaut
  werden; mehr Erstaufwand.

**Empfehlung:** mit A starten (schnell nutzbar, Motor existiert schon),
und erst wenn das Datenmodell/die Templates stehen, auf B umstellen,
falls der Zwischenschritt in der Praxis stört.

## 6. Offene Fragen für dich

1. Kannst du die Excel-Datei (oder zumindest die Spaltenüberschriften /
   Tabellenblätter) teilen, damit ich daraus einen konkreten Vorschlag
   für `entity_types` + `field_definitions` ableite, statt im Blindflug
   ein Schema zu entwerfen?
2. Gibt es von den genannten Dokumenten (QP, QB, Systembewertung, URS,
   RA, Tracematrix) bereits Word-Vorlagen, die wir als Ausgangspunkt
   nehmen können (auch ungefüllt, nur mit der aktuellen Struktur)?
3. Referenzieren sich URS/RA/Tracematrix gegenseitig über eine
   Anforderungs-ID (z.B. "URS-001"), die so oder ähnlich schon in der
   Excel-Datei existiert? Das würde die `relations`-Tabelle direkt
   bestimmen.
4. Passt die Empfehlung aus Abschnitt 5 (erst Python-Export/Import,
   später ggf. volles Browser-Templating), oder soll gleich B versucht
   werden?

## 7. Vorgeschlagene Reihenfolge (grob, noch ohne Zeitangaben)

1. Schema (Abschnitt 2) anhand deiner echten Excel-Datei konkretisieren.
2. Minimal-Web-UI: SQLite-Datei anlegen/öffnen + Excel-Import +
   Formular zum Anschauen/Bearbeiten eines Datensatzes.
3. Platzhalter-Erweiterung um Listen-/Tabellen-Platzhalter (Tracematrix
   etc.).
4. Dokument-Erzeugung (Entwurf) + Status/Finalisierung +
   Abweichungs-Hinweis nach Korrektur.
5. Erst danach: Umstieg von A auf B (Browser-only Templating), falls
   gewünscht.

## 8. Offene Nacharbeiten am Word-Template selbst (Notiz, 19.08.)

Das sind Dinge, die der Nutzer noch direkt im CS-VP-Template (nicht am
Code/Schema) nachpflegen will - hier nur als Gedächtnisstütze festgehalten:

1. Kap. 3.2 (Einsatz von Künstlicher Intelligenz): die Tabelle dort
   (IDs/AI Standard/AI High) braucht noch eine Beschriftung/Caption.
2. Kap. 3.5 (Konstruktion / Systemerstellung): dort muss noch ein Bezug
   auf das Projekt ergänzt werden (Detail vom Nutzer selbst noch offen).
