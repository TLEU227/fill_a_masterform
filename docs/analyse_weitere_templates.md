# Analyse: VP, VB, VQ, xQTP-Templates

Ergänzt `docs/analyse_systembewertung_xlsx.md`. Analysierte Dateien:

- **VP** – `QU-MT-0000722`: CS Validierungsplan (CS-VP)
- **VB** – `QU-MT-0003543`: CS Validierungsbericht (CS-VB)
- **VQ** – `QU-MT-0000585`: Vereinfachte Qualifizierung (VQ) – kombiniert
  URS/Traceability-Matrix, Risk Assessment, IQ/OQ/PQ in **einem** Dokument
- **xQTP** – `QU-MT-0002666`: xQ-Testplan zur IQ/OQ/PQ

## Kontext-Fund: "Fill a Master Form" ist bereits ein Begriff bei euch

Im VQ-Template steht wörtlich: *"Dieses Dokument soll elektronisch im
QualiPSO (Global Content Management System) mit der Funktion **"Fill a
Master Form"** ausgefüllt werden."* – das ist eine bereits bestehende,
manuelle CMS-Funktion bei euch. Unser Projekt (auch so benannt) übernimmt
im Prinzip denselben Gedanken, nur automatisiert/vorausgefüllt statt
manuell pro Dokument abgetippt.

## Bestätigt: gemeinsame Stammdaten über alle Dokumenttypen

Alle vier Templates beginnen mit denselben Kopf-Feldern wie die
Systembewertung: `Gebäude`, `Bereich/e`, `Systemname`, `MLCS-ID`. Ebenso
wiederkehrend: eine Rollen-/Freigabetabelle (Autor/Prüfer/Genehmiger) und
eine Referenzdokumente-Tabelle (Dokumententyp, Dok.-Nr., Version) für
Verweise auf andere Dokumente (Systembewertung, CS-VP, CR, ...) – deckt
sich mit der `relations`-Tabelle aus `KONZEPT.md` Abschnitt 2.

## Bestätigt: wiederholende Tabellenzeilen sind zentral, nicht Kür

Gefunden in VQ: URS-Tabelle (`URS-ID | Anforderung | GxP-relevant? |
entspricht URS | getestet in TP-ID`), RA-Tabelle (`RA-ID | mögliche
Fehlfunktion | Einfluss | Maßnahmen | getestet in TP-ID`), sowie separate
IQ-/OQ-/PQ-Prüftabellen (`IQ-ID | Beschreibung | Akzeptanzkriterium |
Erfüllt | Kürzel | Datum | Anhang`). **Task #4 (Listen-Platzhalter) ist
damit keine Erweiterung "falls nötig", sondern Grundvoraussetzung**, um
diese Dokumente sinnvoll vorauszufüllen.

## Nicht jede Tabelle ist "Daten" – viele sind fester Text

Mehrere Tabellen sind reine Nachschlage-/Glossar-Inhalte, die bei jedem
Dokument identisch bleiben und **nicht** aus der DB befüllt werden: z.B.
Abkürzungsverzeichnis (BQR, BSO, ...), Begriffsdefinitionen, die
GAMP-5-Kategorie/Lifecycle-Matrix, die RACI-Verantwortlichkeitsmatrix
(A/P/G je Rolle) in VP Tabelle 8. Die Fill-Logik darf diese nicht
anfassen – nur die Kopf-Felder, Rollen-mit-Namen, Referenzdokumente und
die URS/RA/IQ/OQ/PQ-Datenzeilen sind variabel.

## Wichtiger technischer Befund: andere Feldtechnik als bei der Systembewertung

Die Systembewertung nutzt echte Serienbrief-Felder (`MERGEFIELD`, mit
Namen). **VP, VB, VQ und xQTP nutzen dagegen Word-Formularfelder /
Content Controls** (`w:sdt`, das ist genau **"Variante 2"** aus deiner
allerersten Nachricht – die wir bewusst zunächst zurückgestellt hatten):

- Text-Platzhalter wie *"zu benennen"*, *"ausfüllen"* oder *"Klicken oder
  tippen Sie hier, um Text einzugeben."* stehen **innerhalb** eines
  Content Controls, nicht als normaler Absatztext.
- Kontrollkästchen (`☐`) sind ebenfalls Content Controls (Checkbox-Typ).
- **Keines dieser Content Controls hat einen Namen** (`w:tag`/`w:alias`
  sind leer) – anders als bei MERGEFIELD gibt es also keine
  Feldbezeichnung, an der man programmatisch erkennen könnte, "welches
  Feld ist das". Die einzige Möglichkeit ist, sich an der
  **Position/dem Label in derselben Tabellenzeile** zu orientieren (z.B.
  "das Control direkt nach dem Label 'Systemname:'").

**Konsequenz:** Automatisches Ausfüllen dieser vier Dokumenttypen
erfordert einen **dritten, neuen Fill-Mechanismus** (positions-/
label-basiertes Schreiben in Content Controls inkl. Checkbox-Umschalten),
zusätzlich zu den bereits geplanten zwei ({{platzhalter}}-Text und
MERGEFIELD). Das ist spürbar mehr Aufwand als die ersten beiden Varianten
und war ursprünglich explizit zurückgestellt.

## Offene Entscheidung

Da VP/VB/VQ/xQTP aber genau die zentralen Qualifizierungsdokumente sind,
um die es im Projekt eigentlich geht: **Sollen wir Content-Control-Support
jetzt ins Konzept aufnehmen** (Task #4 wird dann dreigeteilt: Text /
MERGEFIELD / Content-Control), **oder bleiben wir bei der ursprünglichen
Reihenfolge** (jetzt erstmal nur Datenerfassung + Schema fertig
konzipieren, das tatsächliche Ausfüllen dieser vier Templates auf später
verschieben, wenn die einfacheren Fälle laufen)?
