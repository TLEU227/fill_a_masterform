# Vorschlag: Schnittstelle zwischen Fill-a-Masterform und SysBew_Extraktor

Stand: 23.08. Auslöser: Prüfung, ob `Systembewertungen_GESAMT.xlsx` als
Startbestand für die System-DB (SDB) importiert werden kann (siehe
`docs/analyse_systembewertung_xlsx.md`).

## 1. Problem: das Excel ist kein geeigneter Dauer-Zugriffspunkt

Das Excel folgt dem Schema des alten Seriendruck-Word-Templates, nicht der
fachlichen Bedeutung. Konkret (siehe `docs/analyse_systembewertung_xlsx.md`,
Abschnitt "Checkbox-Spalten"):

- **62 von 123 Spalten sind Checkbox-Spalten** – pro möglichem Wert eine
  eigene Spalte, befüllt mit `c`/`r` (Wingdings-Trick fürs Seriendruck-Dokument).
  Diese 62 Spalten bilden zusammen nur **16 fachliche Felder** ab.
- Beispiel GxP-Kritikalität (genau der Fall, den du ansprichst): der Wert
  "Major" steht in keiner Spalte direkt drin. Er ergibt sich erst daraus,
  dass von den vier Spalten `GxP-C`, `GxP-M`, `GxP-m2`, `GxP-NA` genau eine
  markiert ist (`GxP-M`) und man weiß, dass diese Spalte "Major" bedeutet.
  Ohne dieses (nirgends dokumentierte) Mapping ist der Wert nicht lesbar.
- Das Mapping ist nicht einheitlich: manche Gruppen sind sauber (genau 1
  Markierung = 1 Radiogruppe), andere sind es nicht – z. B. `QUAL`/`VAL`
  (334 Zeilen mit **beiden** Flags gleichzeitig → unabhängige Ja/Nein-Felder,
  keine Radiogruppe), `GKAT` (189 Zeilen mit mehreren Markierungen), `Subtyp`
  (5 Zeilen mit 2 Markierungen). Man muss also nicht nur die Spalten kennen,
  sondern für jede Gruppe zusätzlich wissen, ob es eine Radiogruppe oder
  unabhängige Flags sind.
- Das Schema ist zusätzlich nicht stabil über die Zeit: das Blatt
  `Stillgelegt` nutzt noch `MLCS-ID`/`GxP-m` statt `MLCSID`/`GxP-m2` – bei
  Weiterentwicklung des Seriendruck-Templates ändern sich offenbar auch die
  Spaltennamen.

**Fazit:** Das Excel ist für den Seriendruck (Word-Template) optimiert, nicht
für eine maschinelle Weiterverarbeitung durch ein zweites, unabhängiges
Projekt. Ein einmaliger Import würde dieses Decoder-Wissen fest in unseren
`db/import_excel.py` einbrennen – bei der nächsten Schema-Anpassung im
Seriendruck-Template (die laut README des anderen Projekts jederzeit
passieren kann) bricht der Import unbemerkt oder liefert falsche Werte.

## 2. Zielbild: gemeinsame, fachlich saubere Datenbasis

Statt "Excel exportieren und einmalig raten" brauchen wir eine **Schnittstelle
mit klaren, benannten fachlichen Werten** (z. B. ein Feld
`gxp_kritikalitaet` mit dem Wert `"Major"` statt vier Flag-Spalten), die
**beide Projekte** kennen und pflegen – nicht nur wir.

## 3. Technische Optionen (Empfehlung: A jetzt, B/C als Zielbild)

**A. Normalisierter Export/View aus dem anderen Projekt (kurzfristig)**
SysBew_Extraktor kennt sein eigenes Spaltenschema am besten (es erzeugt es ja
selbst über `word_parser_*.py`). Bitte dort eine deterministische
Export-Funktion (Skript, kein Claude/KI zur Laufzeit) bauen, die pro System
eine Zeile mit **entschlüsselten** Werten liefert (z. B. CSV/JSON):
`mlcsid, systemname, gxp_relevant, gxp_kritikalitaet, gamp_kategorie, ...`
– die 16 Gruppen aus der Analyse, nicht die 62 Rohspalten. Wir bauen darauf
einen Adapter in `db/import_excel.py`, der stabil bleibt, solange sich dieser
Export-Vertrag nicht ändert.

**B. Gemeinsame Datenbank/Tabelle (mittelfristig)**
Beide Projekte lesen/schreiben dieselbe (z. B. SQLite-)Tabelle mit den
fachlichen Feldern statt des Excels. SysBew_Extraktor schreibt beim
Word-Import dort hinein, wir lesen (oder schreiben bei Bedarf zurück).
Vermeidet doppelte Datenhaltung komplett, ist aber ein größerer Umbau auf
beiden Seiten (Locking/Multi-User-Fragen, die das andere Projekt laut README
aktuell über Draft/Lock-Dateien löst).

**C. Definierter Austauschvertrag (Datei- oder API-basiert, versioniert)**
Wie A, aber als offiziell versionierte Schnittstellenspezifikation (z. B.
`schnittstelle_v1.json`-Schema) mit beidseitig vereinbarter Änderungs-
kontrolle – A ohne Versionierung könnte sonst genau das gleiche
Drift-Problem wie das Excel bekommen.

Da die Anforderung ausdrücklich lautet **"später muss das ja ohne Claude
gehen"**: alle drei Optionen sind reine Skript-/DB-Mechanismen ohne
KI-Beteiligung zur Laufzeit – die Entschlüsselungslogik wird einmal fest
programmiert (nicht pro Lauf neu interpretiert).

## 4. Vorschlag für die Anfrage an das andere Projekt

Text zum Kopieren/Anpassen, siehe Chat-Antwort.

## 5. Status 23.08.

Beide Seiten haben unabhängig voneinander einen Prototyp für Option A gebaut:

- Hier: `db/export_normalized_snapshot.py` (dieses Repo).
- SysBew_Extraktor: `lib/export_dekodiert.py`,
  [PR #27](https://github.com/TLEU227/SysBew_Extraktor/pull/27).

Das ist ein gutes Zeichen (zwei unabhängige Implementierungen kommen auf ein
ähnliches Klartext-Feldschema), aber noch kein Beweis, dass beide Seiten die
kniffligen Fälle gleich auflösen (z. B. Geraetekategorie
Subkategorie+Sammelkategorie als *keine* Anomalie, `QUAL`/`VAL` als zwei
unabhängige Flags statt einer Radiogruppe, mehrfach markierte Radiogruppen
transparent statt geraten). Ein Feld-für-Feld-Abgleich der beiden Skripte
vor der eigentlichen Nutzung wird empfohlen.

Offen: ob/wie ein Export künftig geteilt wird (einmaliger Snapshot zum
Testen vs. regelmäßig neu erzeugt) und die größere Frage einer gemeinsamen
Datenhaltung – bewusst getrennt von der kurzfristigen Export-Frage
behandelt.
