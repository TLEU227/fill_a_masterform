# Architektur-Entwurf: Zusammenführung Fill-a-Masterform + SysBew_Extraktor

Status: **Entwurf zur Diskussion – noch keine Umsetzung.** Antwort auf die
in `KONZEPT.md` Abschnitt 9 offen gelassene Frage.

## 1. Ausgangslage: was beide Projekte heute tun

**Fill-a-Masterform (dieses Projekt):**
- SDB (System-DB) + PDB (Projekt-DB), SQLite/EAV-Schema, Web-UI ohne Server
- Ziel: Stammdaten einmal erfassen, damit vorausfüllen (CS-VP am weitesten,
  CS-VB/VQ/xQTP offen)
- Bewusst **kein** Fill-Systembewertung (FSysBew) – siehe Abschnitt 9

**SysBew_Extraktor (anderes Projekt, laut README):**
- `word_parser_*.py`: extrahiert per COM-Automatisierung Daten aus
  fertigen/unterschriebenen Systembewertungs-Word-Dokumenten (Drag&Drop),
  schreibt sie in `Systembewertungen_GESAMT.xlsx` (Sheet `SysBew`)
- `webapp/` (Flask + openpyxl): erzeugt NEUE Systembewertungs-Word-Dokumente
  aus dem Excel (oder leer) – schreibt selbst **nicht** ins Excel zurück,
  nur über den gleichen Drag&Drop-Weg (ein einziger Schreib-Codepfad)
  Draft/Lock-Dateien lösen Mehrbenutzerbetrieb ohne zentralen Server
- Rührt Kapitel 3/5-9 (Entscheidungsbaum/Testtiefe-Matrix) bewusst nicht an
  – aus demselben Grund wie wir: nicht zuverlässig aus dem Endergebnis
  rekonstruierbar

**Gemeinsamer Nenner:** beide Projekte drehen sich letztlich um dieselben
Systeme (MLCS-ID) und einen Teil überlappender Stammdaten (Systemname,
GxP-Kritikalität, GAMP-Kategorie, Hersteller, ...). Heute existiert dafür
keine gemeinsame Quelle – nur das lose gekoppelte Excel, das (siehe
`docs/schnittstelle_sysbew_extraktor_vorschlag.md`) fürs Seriendruck-Template
optimiert ist, nicht für maschinelle Weiterverarbeitung.

## 2. Was "Zusammenführung" bedeuten könnte – drei Stufen

### Stufe 1 – Datenbasis verschmelzen, Code getrennt (kleinster Schritt)
Beide Projekte bleiben eigene Repos/Codebasen. Statt der heutigen Excel-
Datei gibt es eine gemeinsame **Main-DB** als Stammdatenquelle, mit klar
getrennten Rollen (Stand 24.08., mit dem Nutzer abgestimmt):

- **SysBew_Extraktor** ist der einzige Schreib-Weg in die Main-DB, und
  auch das nur aus **freigegebenen** Systembewertungs-Dokumenten (wie
  heute beim Excel: Word-Import per Drag&Drop). Mit der Main-DB können
  neue Systembewertungen erstellt werden - Änderungen, die dabei
  entstehen (auch aus der Nachbearbeitung/Freigabeschleife), fließen
  **nicht direkt** zurück, sondern erst wieder über denselben Weg: sobald
  das Dokument erneut freigegeben und importiert wird.
- **Fill-a-Masterform** liest nur die Anfangsdaten aus der Main-DB (Kopie/
  Startpunkt für unser System-Formular: leer/Kopie eines ähnlichen
  Systems/bearbeiten). Diese drei Szenarien bleiben wie bisher nötig -
  man braucht sie, solange für ein System noch keine (neue) SysBew
  existiert. **Wichtig:** was dabei in unserem System-Formular entsteht
  oder geändert wird, bleibt lokal/nur für unsere Fill-Zwecke (CS-VP/VB/
  VQ/xQTP) - es fließt **nicht** in die Main-DB zurück. Die Main-DB wird
  ausschließlich über den offiziellen SysBew_Extraktor-Weg aktualisiert
  (freigegebene SysBew -> Import). Unsere eigene Projekt-DB (PDB) für
  projektspezifische Zusatzdaten ist davon unberührt und bleibt wie
  gewohnt bei uns.
- Die Excel-Datei wird zum Auslaufmodell (oder bleibt als Export/Reporting-
  Format bestehen, aber nicht mehr als Schreib-Ziel)

Damit gibt es pro Datensatz nur einen einzigen "offiziellen" Schreibpfad
(SysBew_Extraktor, freigegebene Dokumente) - genau das Prinzip, das
SysBew_Extraktor laut README schon für sich selbst anwendet (kein direkter
Rückfluss aus der eigenen Webapp), hier nur auf beide Projekte
ausgeweitet.

**Aufwand:** mittel. **Risiko:** gering – kein Codebasen-Umbau, nur ein
neuer Schreib-Adapter in SysBew_Extraktor (ersetzt die openpyxl-Schreib-
zeile durch einen DB-Write) und ein Import-Adapter bei uns (ähnlich dem
bereits gebauten `db/export_normalized_snapshot.py`/`import_excel.py`).
**Offene Fragen:** SQLite-Zugriff aus zwei unabhängigen Prozessen ohne
Server (Locking!) – SysBew_Extraktor hat das Problem mit Draft/Lock-Dateien
schon für das Excel gelöst, müsste für SQLite neu durchdacht werden.

### Stufe 2 – ein Repo, zwei getrennte Funktionsbereiche (Monorepo)
Beide Codebasen wandern in ein gemeinsames Repo (z.B. `fill_a_masterform`
bekommt einen Ordner `sysbew_extraktor/` oder umgekehrt), nutzen ab da
zwingend dieselbe SDB, aber die Funktionsbereiche (Word→DB-Extraktion,
DB→Word-Generierung für Systembewertung, DB→Word-Generierung für
CS-VP/VB/VQ/xQTP) bleiben als separate Module bestehen.

**Aufwand:** hoch (Historie/CI/Doku zusammenführen, Verantwortlichkeiten neu
ziehen). **Nutzen ggü. Stufe 1:** einheitliche Versionierung, ein CI/Deploy,
leichter für neue Mitwirkende, keine "welches Repo für was"-Frage mehr.

### Stufe 3 – FSysBew wird Teil des Fill-Mechanismus (volle Fusion)
Fill-Systembewertung würde wie FVP/FVB/FVQ/FxQTP zu einem weiteren
"Fill-Baustein" in diesem Projekt, mit gemeinsamer Fill-Engine/Konventionen
(Farbcodierung, Numerierung, etc.). Word→DB-Extraktion (die andere Hälfte
von SysBew_Extraktor) müsste weiterhin irgendwo leben – vermutlich ebenfalls
hier.

**Aufwand:** am höchsten, entspricht im Ergebnis Stufe 2 + Auflösen der
FSysBew-Ausnahme aus Abschnitt 9. **Nutzen:** ein Projekt, eine Wahrheit,
keine Schnittstelle mehr nötig. **Risiko:** MERGEFIELD-basiertes Systembe-
wertungs-Template folgt einer anderen Fill-Technik als unser
python-docx-Ansatz für CS-VP – eine "gemeinsame Engine" wäre nicht trivial
(genau der Grund, warum FMech am 23.08. wieder verworfen wurde, siehe
Abschnitt 9 KONZEPT.md – dieselbe Vorsicht gilt hier).

## 3. Praktische Hürde, unabhängig von der gewählten Stufe

Ich (diese Claude-Code-Session) habe aktuell **nur Zugriff auf
`TLEU227/fill_a_masterform`**, nicht auf `TLEU227/SysBew_Extraktor`. Jede
der drei Stufen erfordert an irgendeinem Punkt Änderungen im anderen Repo
(neuer DB-Adapter, Verschieben von Code, o.ä.) – dafür wird eine Session
(oder erweiterte Repo-Scope dieser Session) mit Zugriff auf beide Repos
benötigt. Bis dahin kann von hier aus nur die Planung/Spezifikation
vorbereitet werden, keine Umsetzung im anderen Repo.

## 4. Empfehlung

**Stufe 1 zuerst, unabhängig davon ob später Stufe 2/3 folgen.** Begründung:
- Löst das eigentliche, akute Problem (Excel als ungeeigneter Dauer-
  Zugriffspunkt, siehe `docs/schnittstelle_sysbew_extraktor_vorschlag.md`)
  ohne die beiden funktionierenden Projekte anzufassen
- Geringstes Risiko, keine Downtime für laufende Nutzung in beiden Projekten
- Erkenntnisse daraus (wie gut lässt sich die SDB als gemeinsame Basis
  nutzen, wie löst man Mehrbenutzer-Locking ohne Server) sind eine
  belastbare Grundlage für die Entscheidung Stufe 2 vs. 3 vs. "bleibt bei
  Stufe 1" – die man jetzt noch nicht treffen muss.
- Der bereits gebaute Export-Prototyp (`db/export_normalized_snapshot.py`)
  ist ein erster Baustein dafür (zeigt, dass sich die Excel-Checkbox-Logik
  deterministisch zu Klartext-Feldern auflösen lässt, die 1:1 zu SDB-
  Feldern passen könnten).

## 5. Nächste konkrete Schritte (falls Stufe 1 gewählt wird)

1. Session mit Zugriff auf beide Repos einrichten (Voraussetzung für alles
   Weitere)
2. SDB-Feldliste mit SysBew_Extraktor abgleichen: welche der 16 Checkbox-
   Gruppen + 61 Freitextfelder existieren schon als SDB-Felder, welche
   fehlen (`db/seed_field_definitions.sql` erweitern)
3. Locking-Konzept für gleichzeitigen SQLite-Zugriff aus zwei Prozessen
   klären (Datei-Lock wie bisher beim Excel? Getrennte Kopien + Merge?
   Ein Prozess schreibt, einer liest nur?)
4. Schreib-Adapter in SysBew_Extraktor bauen (ersetzt/ergänzt den
   openpyxl-Write in `word_parser_*.py`)
5. Übergangsphase: Excel bleibt als Reporting-Export bestehen, wird aber
   nicht mehr die Quelle der Wahrheit
