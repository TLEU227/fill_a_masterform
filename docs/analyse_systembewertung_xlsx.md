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
