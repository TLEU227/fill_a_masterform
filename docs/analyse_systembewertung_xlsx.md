# Analyse: `Systembewertungen_GESAMT.xlsx`

Grundlage für Task #1/#2 aus dem Board bzw. Abschnitt 2/6 von `KONZEPT.md`.

## Aufbau der Datei

- 2 Tabellenblätter:
  - **`SysBew`** – 733 aktive Systeme, 123 Spalten (aktuelle Schema-Version).
  - **`Stillgelegt`** – 17 stillgelegte Systeme, 108 Spalten, **leicht anderes
    (älteres) Schema**: z.B. `MLCS-ID` statt `MLCSID`, `GxP-m` statt
    `GxP-m2`. Das bestätigt: **das Excel-Schema selbst wurde über die Zeit
    mehrfach angepasst** (passt zur Spalte `Version` in `SysBew`, Werte
    1–3). Für die DB heißt das: Feld-Historie/Versionierung mitdenken,
    nicht nur Datensatz-Historie.

## Die zwei Feld-Kategorien

**61 "normale" Felder** – Freitext/Stammdaten, z.B. `MLCSID`, `AS/BDIS-Name`,
`Kurzbeschreibung`, `Ersteller`, `GxP_Produktqualitaet` (Begründungstext),
`Prozessbeschreibung`, `Daten`, `Chargenprotokoll` usw. Diese sind
unproblematisch 1:1 als Felder in die DB übernehmbar.

**62 Checkbox-Spalten** – wie von dir beschrieben: je Antwortmöglichkeit
eine eigene Spalte mit nur `c` oder `r` als Wert (Wingdings-Trick fürs
Seriendruck-Dokument). Diese habe ich zu **16 logischen Gruppen**
zusammengefasst (eine Gruppe = eine Frage/ein Auswahlfeld im Dokument):

| Gruppe | Spalten | Vermutete Bedeutung | Auffälligkeit |
|---|---|---|---|
| GxP-relevant? | `GxP_Relevan_JA`, `GxP_Relevan_NEIN` | Ja/Nein | 2 Zeilen ohne Markierung |
| **GxP-Kritikalität** | `GxP-C`, `GxP-M`, `GxP-m2`, `GxP-NA` | Critical/Major/Minor/N.A. (**von dir bestätigt**) | 4 Zeilen ohne Markierung |
| Systemtyp | `Systemtyp_CIS`, `Systemtyp_CE` | z.B. Computerisiertes System / Compliant Equipment (?) | 170 Zeilen ohne Markierung |
| Subtyp | `Subtyp_PCS`, `Subtyp_LCE`, `Subtyp_EE`, `Subtyp_NA` | Prozesssteuerungssystem/... (?) | 5 Zeilen mit **2 Markierungen zugleich** |
| VNAP-Stufe | `VNAP_S0`, `VNAP_S1`, `VNAP_S2` | Stufe 0/1/2 (?) | nur 24 von 733 Zeilen überhaupt befüllt |
| Doku-Status | `Offen`, `Geschlossen`, `NA` | Bearbeitungsstatus | unauffällig |
| Kategorie | `KAT1`, `KAT3`, `KAT4`, `KAT5`, `KATNA` | GAMP-Kategorie 1/3/4/5/N.A. (`KAT2` existiert nicht) | 17 Zeilen ohne Markierung |
| E-Records-Typ | `ERESTYP1..4`, `ERESTYPNA` | Typ elektronischer Aufzeichnungen | 76 Zeilen ohne Markierung |
| Testtiefe | `TTIEFEHOCH/MITTEL/NIEDRIG` | Testtiefe der Qualifizierung | nur 405 von 733 befüllt |
| Zone/Stufe-Matrix | `Z1S1` … `Z3S3` (9 Spalten) | 3×3-Risikomatrix-Kombination | nur 402 von 733 befüllt |
| Business Critical | `BCkritisch`, `BCunkritisch` | Geschäftskritisch ja/nein | unauffällig |
| Dokumentart | `Neuerstellung`, `Revisioniert` | Doku-Historie-Typ | **1 Zeile mit `#REF!`-Fehler** |
| **GKAT** | `GKATA`, `GKATB1-3`, `GKATB`, `GKATC1-3`, `GKATC`, `GKATNA` | Gerätekategorie A/B(+Subkat.)/C(+Subkat.)/N.A. | **189 Zeilen mit mehreren Markierungen** – vermutlich Subkategorie *und* übergeordnete Kategorie werden zusammen markiert (z.B. `GKATB2` + `GKATB`), keine reine Radio-Gruppe |
| VQ/NVQ | `VQ`, `NVQ` | Verifizierung/Qualifizierung nötig ja/nein | 433 Zeilen ohne Markierung |
| **QUAL/VAL** | `QUAL`, `VAL` | Qualifizierung nötig / Validierung nötig | **334 Zeilen mit beiden Markierungen zugleich** → vermutlich zwei *unabhängige* Ja-Flags, keine Radio-Gruppe. `VAL` hat außerdem 1× `#REF!` |
| KI-Einstufung | `KI1..KI6`, `KINA` | KI-Nutzungskategorie | unauffällig |

## Offene Punkte, bevor ich das DB-Schema (Task #2) festlege

1. **GKAT-Gruppe**: Ist es korrekt, dass bei Subkategorie B2 z.B. sowohl
   `GKATB2` als auch `GKATB` markiert werden (Detail + Sammelfeld), oder
   bedeutet eine Doppelmarkierung etwas anderes?
2. **QUAL/VAL**: Sind das zwei unabhängige Ja/Nein-Flags (ein System kann
   gleichzeitig QUAL *und* VAL benötigen), oder sollten die sich
   eigentlich ausschließen (dann wären die 334 Fälle ein Datenfehler)?
3. **MLCSID**: Manche Zeilen enthalten mehrere MLCS-IDs in einem Feld
   (kommagetrennt, z.B. `"2916, mlcs 2917, mlcs 2918"`). Soll das **ein**
   Datensatz mit mehreren IDs bleiben, oder für die DB **aufgeteilt** in
   einen Datensatz pro MLCS-ID?
4. **Label-Texte**: Für Gruppen wie `Systemtyp_CIS/CE`, `Subtyp_PCS/LCE/EE`,
   `VNAP_S0-S2` will ich nicht raten, was die Buchstaben ausgeschrieben
   bedeuten. Falls du die (auch leere) **Word-Vorlage "Systembewertung"**
   hochladen kannst, aus der diese Spalten per Seriendruck befüllt wurden,
   lese ich die Beschriftungen direkt neben den Ankreuzfeldern ab statt zu
   raten.
5. **`#REF!`-Fehler** in `Neuerstellung`/`Revisioniert`/`VAL` (insgesamt
   2 betroffene Zeilen) – vermutlich eine defekte Formel im Original-Excel.
   Diese Zeilen müssen vor dem Import bereinigt bzw. mit dir abgeglichen
   werden.

## Update: Abgleich mit dem echten Word-Template (`Systembewertung_V11.docx`)

**Ja, ich kann die Serienbrief-Feldnamen (MERGEFIELD-Felder) direkt aus der
`.docx`-XML lesen** – das ist keine sichtbare Textstelle, sondern ein
Word-Feldcode (`{ MERGEFIELD feldname }`), den man im Dokument selbst nur
über Alt+F9 sichtbar machen könnte. Ich habe alle Felder inkl. des jeweils
direkt danebenstehenden Textes ("Label") extrahiert. Damit lassen sich die
Antworten zu deinen offenen Punkten bestätigen bzw. präzisieren:

### Zu 1) GKAT (Gerätekategorie)

Bestätigt durch das Referenzdokument (`QU-MT-0001344`, verweist auf
`QU-SOP-0021736`): Gerätekategorien nach ISPE/GAMP, **A / B / C / N/A**.
Im *aktuellen* Template (V11) gibt es dafür nur noch 4 Checkboxen:
`GKATA`, `GKATB`, `GKATC`, `GKATNA`. Die Subkategorie (B1/B2/B3, C1/C2/C3)
wird laut Template-Anleitung **nicht** mehr per eigener Checkbox erfasst,
sondern als **Freitext-Anmerkung neben der A/B/C-Checkbox** ergänzt: *"Bei
Gerätekategorien A, B und C, bitte die Subkategorisierung (z.B. B1, C2)
nach QU-SOP-0021736 hier ergänzen."*

→ Erklärt auch die 189 "doppelt markierten" Zeilen aus der ersten Analyse:
Das sind vermutlich **ältere Excel-Zeilen aus einer Vorgänger-Version**
des Templates, die noch die separaten `GKATB1/B2/B3`/`GKATC1/C2/C3`-
Checkboxen hatten (im aktuellen V11-Template kommen diese 6 Feldnamen gar
nicht mehr vor) – Detail-Checkbox *und* die neue Sammel-Checkbox (`GKATB`/
`GKATC`) wurden dabei beide gepflegt, nicht als Fehler.

**Offene Frage:** Sollen `B1/B2/B3/C1/C2/C3` in der neuen Datenbank als
eigenes (Freitext- oder Auswahl-)Feld weitergeführt werden (empfehlenswert,
da reale fachliche Information), auch wenn das aktuelle Word-Template sie
nur als Anmerkungstext statt als Checkbox zeigt?

### Zu 2) QUAL/VAL

Bestätigt und präzisiert: `QUAL` und `VAL` sind keine Ja/Nein-Flags mit
freier Bezeichnung, sondern zeigen jeweils **welche SOP** greift:
`QUAL` → *"QU-SOP-0021736*"* (vereinfachte Qualifizierung),
`VAL` → *"QU-SOP-0049866*"* (Validierung). Beide unabhängig ankreuzbar,
wie von dir beschrieben (CS meist beide, CIS meist nur VAL-SOP).

### Zu 3) MLCSID – wichtige Korrektur des Datenmodells

Du hast klargestellt: **eine Excel-Zeile = eine Dokumentversion**, nicht
ein System. Ein System, dessen Systembewertung von v1.0 auf v2.0
überarbeitet wird, erzeugt also **zwei Zeilen** (mit eigener/n MLCS-ID/s
je Version). Das ändert die Grundannahme aus `KONZEPT.md` Abschnitt 2:
**die primäre Entität ist nicht "System", sondern "Systembewertungs-
Dokument(version)".** Mehrere Dokumentversionen, die zum selben System
gehören, müssten über ein gemeinsames Merkmal verknüpft werden (z.B.
Dok.-Nr.-Stamm oder eine manuell vergebene System-Kennung) statt über eine
1:1-Beziehung. Das wird Teil von Task #2.

### Zu 4) Vollständige Label-Zuordnung (Auszug, restliche Gruppen)

| Excel-Spalte(n) | Merge-Feldname | Label im Dokument |
|---|---|---|
| `Systemtyp_CIS` | `Systemtyp_CIS` | "CIS" |
| `Subtyp_PCS/LCE/EE/NA` | gleich | "CE-PCS" / "CE-LCE" / "CE-EE" / "N/A" |
| `VNAP_S0/S1/S2` | gleich | "S0" / "S1" / "S2" |
| `Offen/Geschlossen` | gleich | "offen (ohne Zugangsbeschränkung)" / "geschlossen (Kontrollierter Zugang)" |
| `KAT1/3/4/5/NA` | gleich | "SW-Kat 1" … "SW-Kat 5" / "N/A" (GAMP-5-Software-Kategorie) |
| `ERESTYP1-4/NA` | gleich | "Typ 1" … "Typ 4" / "N/A" (Typ elektronischer Aufzeichnungen) |
| `TTIEFEHOCH/MITTEL/NIEDRIG` | gleich | "Hoch" / "Mittel" / "Gering" (Testtiefe) |
| `Z1S1` … `Z3S3` | gleich | Risikomatrix-Werte "Gering"/"Mittel"/"Hoch" je Zone/Stufe-Kombination |
| `BCkritisch/BCunkritisch` | gleich | "ja" / "nein" (Business critical) |
| `VQ/NVQ` | gleich | "Ja" / "Nein" |
| `KI1-6/NA` | gleich | "I" … "VI" / "N/A" (KI-Einstufung) |
| `Neuerstellung/Revisioniert` | gleich | "Neuerstellung" / "Änderung – im Einsatz / Aktualisierung" |
| `GxP-C/M/m2/NA` | `GxPC/GxPM/GxPm2/GxPNA` (Bindestrich im Merge-Feldnamen nicht erlaubt) | "Critical" / "Major" / "minor" / "N/A" |

`Systemtyp_CE` sowie `GKATB1/B2/B3/C1/C2/C3` kommen im aktuellen V11-
Template nicht mehr als eigene Felder vor (siehe oben).

### Technische Konsequenz für den Fill-Mechanismus (Task #4)

Dieses Template arbeitet mit **echten Word-Seriendruckfeldern
(MERGEFIELD)**, nicht mit `{{platzhalter}}`-Text wie in unserem bisherigen
`masterform`-Modul. Zwei Wege, das zu nutzen:

- **A – Fill-Engine um MERGEFIELD-Unterstützung erweitern** (empfohlen):
  Das bestehende, GxP-kontrollierte Template bleibt unverändert; wir lesen/
  schreiben die Feldcodes direkt. Etwas komplexer, aber ändert nichts an
  bereits freigegebenen Templates.
  - Zusatzkomplexität aus dieser Analyse: Feldnamen/Instruktionstext können
    über mehrere `<w:instrText>`-Runs verteilt sein (wie Text über
    mehrere Runs) – muss beim Parsen zusammengesetzt werden.
- **B – Template auf `{{platzhalter}}` umstellen**: einfacher für uns,
  aber verändert das kontrollierte Dokument (Change-Control nötig).

Ich würde A empfehlen und als eigenen Unterpunkt zu Task #4 einplanen.

