# CS-VP-Demo: ausgefülltes Beispieldokument (v8)

Zeigt konkret, wie ein automatisch ausgefüllter CS-Validierungsplan aussehen
könnte - mit **frei erfundenen** Demo-Daten (System "SPS Zentrifugentrockner
PU4300A", MLCS 1428, fiktive Personen wie "Julia Fischer"). **Keine echten
Sanofi-Systemdaten.** Ausnahme von der sonst geltenden Regel "generierte/
befüllte Dokumente bleiben lokal, nicht ins Repo" (siehe `KONZEPT.md`
Abschnitt 0) - hier explizit erwünscht, weil rein fiktiv und als Referenz/
Diskussionsgrundlage gedacht.

## Dateien

- **`CS-VP_AUSGEFUELLT_DEMO_v8.docx`** - das ausgefüllte Ergebnis. Farbcode:
  gelb = automatisch eingefügt/geändert/angekreuzt, durchgestrichen +
  dunkelrot = zum Löschen vorgeschlagen (nichts wird real entfernt). Jede
  automatisch befüllte Stelle trägt zusätzlich eine kleine, blaue,
  kursive Nummer in eckigen Klammern (z.B. `[Tabelle 1-1]`) - eine reine
  Abstimmungshilfe für dieses Demo, **keine** dauerhafte Konvention, vor
  echter Nutzung wieder zu entfernen.
- **`CS-VP_Zuordnungstabelle_demo8.md`** - Legende zu den Nummern: welche
  Nummer im Dokument entspricht welchem DB-Feld/welcher Stelle und welchem
  eingesetzten Wert.
- **`fill_demo8.py`** - das Python-Skript, das den obigen Stand erzeugt hat
  (python-docx, direkte XML-Manipulation für die Ankreuzfelder in
  Tabelle 10). **Nicht eigenständig lauffähig** ohne die echte CS-VP-Vorlage
  (`SRC`-Pfad zeigt auf eine Datei außerhalb dieses Repos - die Original-
  Word-Vorlage selbst wird bewusst nicht ins Repo übernommen, nur das
  Ergebnis dieses einen Demo-Laufs). Dient als Referenz für die tatsächliche
  Fill-Logik (Marker-Ersetzung, Absatz-Auswahl, Ankreuzfeld-Handling), nicht
  als produktionsreifer, wiederverwendbarer Fill-Mechanismus - siehe
  `docs/feldliste_und_verwendung.md` für den Umsetzungsstand.

## Wichtigster Nebenfund

Tabelle 10 ("Weitere Validierungsdokumente") ist die einzige Stelle im
CS-VP-Template mit echten Word-Ankreuzfeldern (36 Content Controls, 18
Ja/Nein-Prüfpunkte). Nur 1 der 18 Prüfpunkte (Process Performance
Qualification/PPQ) hat aktuell ein passendes Feld in der Projekt-DB
(`phase_ppq_geplant`) - die anderen 17 (Datenflussdiagramm, Audit Trail
Review Konzept, Berechtigungskonzept, Trainingsplan, User Process
Monitoring, Datenmigration, Wartung/Monitoring, Archivierung, Backup&Restore,
Business Continuity, Incident-Management, Change-/Konfigurationsmanagement,
Logbuch, Lieferantenbewertung, Quality Agreement, Bedienungsanweisungen,
Handbuch) haben noch **kein** Feld in der Projekt-DB - bleiben deshalb
bewusst unangekreuzt statt einer erfundenen GxP-Aussage. Mögliche
Folgearbeit: 17 neue Ja/Nein-Felder in `seed_field_definitions_projekt.sql`
(analog zu `vmp_erforderlich`/`gep_pruefung_erforderlich`).
