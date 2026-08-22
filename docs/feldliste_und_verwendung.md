# Felder in den Datenbanken – und wo sie in die Word-Vorlagen eingesetzt werden

**Stand: 20.08. Diese Übersicht wird sich noch öfter ändern** – wir kennen
noch nicht alle vier Ziel-Templates (Systembewertung, CS-VP, CS-VB, VQ,
xQTP) im Detail. Am besten hier wieder reinschauen, wenn ein weiteres
Template genauer analysiert oder der Fill-Mechanismus für einen weiteren
Dokumenttyp gebaut wurde – dann wird diese Datei aktualisiert.

## Wie diese Übersicht zu lesen ist

Für jedes Feld gibt es eine Spalte **"Verwendung im Template"** mit einem
von vier Status:

| Symbol | Bedeutung |
|---|---|
| ✅ | Konkret bekannt (Kapitel/Tabelle benannt) **und** an einer echten Vorlage geprüft |
| 🟡 | Stelle im Template ist bekannt/dokumentiert, aber noch **kein** wiederverwendbarer Fill-Code dafür im Repo |
| ⬜ | Noch nicht untersucht bzw. unklar, ob/wo das Feld in einem Template landet |
| – | Kein Template-Feld – reines DB-internes Feld (Status, Verknüpfung, o.ä.) |

**Wichtig zum Umsetzungsstand:** Es gibt aktuell **keinen produktiven,
eingecheckten Fill-Mechanismus** für die vier echten Sanofi-Templates.
Was hinter den ✅-Markierungen steckt, ist ein **Proof-of-Concept-Skript**,
das interaktiv in dieser Session gegen die reale Vorlage
`FFICFQUMT0000722MDT__CSVP_Validierungsplan_9.0.docx` (CS-VP, Version 9.0)
entwickelt und geprüft wurde – es liegt bewusst **nicht** im Git-Repo (echte
Vorlagen/Demodaten bleiben lokal, siehe `KONZEPT.md` Abschnitt 0), sondern
nur als Wissen in dieser Übersicht und in `KONZEPT.md`. Für die anderen
Dokumenttypen gibt es bisher nur die strukturelle Analyse
(`docs/analyse_systembewertung_xlsx.md`, `docs/analyse_weitere_templates.md`,
`docs/konzept_fill_mechanismus.md`), aber noch kein geprüftes Skript.

**Umsetzungsstand je Dokumenttyp:**

| Dokumenttyp | Technik im Template | Stand |
|---|---|---|
| Systembewertung | Serienbrief-Felder (`MERGEFIELD`, mit Namen) | Merge-Feldnamen ↔ DB-Feld ist für die meisten Checkbox-Gruppen dokumentiert (`docs/analyse_systembewertung_xlsx.md`), **kein Fill-Code** |
| CS-VP (Validierungsplan) | Normaler Absatz-/Tabellentext, feste Marker-Strings ("XXXX", "<<System>>", "Minor, Major, Critical", …) | **Am weitesten**: Proof-of-Concept-Skript gegen V9.0 geprüft (alle ✅ unten) |
| CS-VB (Validierungsbericht) | Vermutlich wie CS-VP (noch nicht im Detail geprüft) | Nur grob analysiert, **kein Fill-Code** |
| VQ (Vereinfachte Qualifizierung) | Echte Text-Content-Controls + Tabellen (URS/RA/IQ/OQ/PQ) | Tabellenstruktur bekannt (`docs/analyse_weitere_templates.md`), **kein Fill-Code** (Task #4) |
| xQTP (xQ-Testplan) | Wie VP/VB (Checkboxen), Prüfschritt-Tabellen | Nur grob analysiert, **kein Fill-Code** |

Die Spalte `benötigt_für` in den Datenbanken selbst (`db/seed_field_definitions*.sql`)
ist ebenfalls noch grob: bei den System-DB-Feldern steht dort fast überall
nur `"immer"`, weil noch nicht für jedes einzelne Feld geklärt ist, welche
der vier Dokumenttypen es tatsächlich braucht (siehe Kommentar am Anfang
dieser Datei). Verlässlicher ist deshalb aktuell die Spalte "Verwendung im
Template" unten – die basiert auf tatsächlicher Prüfung an der Vorlage,
nicht auf der (vorläufigen) Einstufung in der DB.

---

## 1. System-DB (`db/seed_field_definitions.sql`)

Stammdaten des Systems selbst – gelten unabhängig vom konkreten Projekt/der
konkreten Validierung (siehe `KONZEPT.md` Abschnitt 2.1 zur Abgrenzung
gegenüber der Projekt-DB).

### 1.1 Objektart `person`

Eigene Objektart statt Freitext-Name je Rolle (dieselbe Person kommt in
mehreren Systemen/Dokumenten vor).

| Feld | Label | Verwendung im Template |
|---|---|---|
| `name` | Name | ⬜ Vermutlich Rollen-/Freigabetabelle (Autor/Prüfer/Genehmiger) in allen vier Templates – laut `docs/analyse_weitere_templates.md` vorhanden, aber noch nicht konkret an einer Vorlage nachvollzogen. |
| `stelle` | Stelle/Funktion | ⬜ s.o. |
| `abteilung` | Abteilung | ⬜ s.o. |

### 1.2 Objektart `system` – Personen/Rollen

Jedes Feld verweist auf einen `person`-Datensatz (Auswahl/Neuanlage), kein
Freitext-Name.

| Feld | Label | Verwendung im Template |
|---|---|---|
| `rolle_ersteller` | Ersteller | ⬜ Noch nicht an einer Vorlage nachvollzogen (vermutlich Rollentabelle, s.o.) |
| `rolle_sme` | SME | ⬜ |
| `rolle_si_pl` | SI/PL | ⬜ |
| `rolle_tso` | TSO | ⬜ |
| `rolle_bso` | BSO | ⬜ |
| `rolle_bqr` | BQR | ⬜ |
| `rolle_csq` | CSQ | ⬜ |

### 1.3 Objektart `system` – Stammdaten

| Feld | Label | Verwendung im Template |
|---|---|---|
| `mlcs_id` | MLCS-ID | ✅ CS-VP Kopf-Tabelle (Zeile "MLCS-ID"); Kap. 1.1 Fließtext ("…, MLCS-ID …"); Kap. 1.5 Systemeinstufung ("MLCS-ID: …") |
| `bereich` | Bereich/Betrieb | ✅ CS-VP Kopf-Tabelle (Zeile "Bereich") |
| `gebaeude` | Gebäude | ✅ CS-VP Kopf-Tabelle (Zeile "Gebäude"); Kap. 1.4 Betriebsort ("wird im Gebäude XXX…") |
| `dok_version` | Dokumentversion (Systembewertung) | ⬜ Vermutlich Kopf-Merge-Feld der Systembewertung selbst, noch nicht bestätigt |
| `dok_nummer` | Dokumentnummer (Systembewertung) | ⬜ s.o. |
| `systemname` | Systemname | ✅ CS-VP Kopf-Tabelle; Kap. 1.1 Fließtext; Kap. 3.5 ("an dem System …" statt generisch "den Systemen"); Kap. 3.9 Systemfreigabe (beide `<<System>>`-Alternativen) |
| `anlage` | Anlage | ⬜ Noch nicht an einer Vorlage nachvollzogen |
| `raum` | Raum | 🟡 CS-VP Kap. 1.4 Betriebsort ("… Raum XXX") – Marker-Text "XXX" ist im Template **identisch** zum Gebäude-Marker in derselben Zeile; der Proof-of-Concept-Code trifft aktuell nur den ersten "XXX" zuverlässig (im geprüften Demo-Datensatz war `raum` leer, daher ungetestet) – **bekannte Einschränkung, noch zu verbessern** |
| `kurzbeschreibung` | Kurzbeschreibung | ✅ CS-VP Kap. 1.1 Systembeschreibung ("System zur/zum…."); außerdem Stichwort-Grundlage für Kap. 1.7 Schnittstellen (s.u.) |
| `sw_name` | Software-Name | 🟡 Nur indirekt: Stichwort-Grundlage für die Schnittstellen-Erkennung in Kap. 1.7 CS-VP (TCP/IP, PRODIS, SAP, Sanofi-Laufwerke) – kein eigener Platzhalter dafür bekannt |
| `sw_version` | Software-Version/Typ | ⬜ Noch nicht an einer Vorlage nachvollzogen |
| `sw_hersteller` | Software-Hersteller | ⬜ |
| `hersteller` | Hersteller/Lieferant | ✅ CS-VP Kap. 2.2 ("<<MUSTER>>" → Firmenname); Tabelle 8 Lieferantenbewertung (Zelle "Lieferant A" → Firmenname) |
| `lieferantennummer` | QualiPSO Third Party/Customer-ID | ✅ CS-VP Tabelle 8 Lieferantenbewertung: wenn vorhanden, wird "Ist durchzuführen" gestrichen und "QualiPSO-ID: …" ergänzt |

### 1.4 Objektart `system` – GxP-Bewertung

| Feld | Label | Verwendung im Template |
|---|---|---|
| `gxp_relevant` | GxP-relevant? | 🟡 Systembewertung: Checkbox-Gruppe `GxP_Relevan_JA`/`GxP_Relevan_NEIN` (Merge-Feldname bekannt, kein Fill-Code) |
| `gxp_kritikalitaet` | GxP-Kritikalität | ✅ CS-VP Kap. 1.5 ("Minor, Major, Critical" → konkreter Wert); steuert außerdem Kap. 3.4.2/3.4.3 (welcher Risikoanalyse-Absatzblock bleibt: "major/critical"-Block vs. "minor"-Block vs. "freigegebene RA muss vorliegen"-Satz). 🟡 Systembewertung: Checkbox-Gruppe `GxPC/GxPM/GxPm2/GxPNA` (Merge-Feldname bekannt, kein Fill-Code) |
| `systemtyp` | Systemtyp (CIS/CE-PCS/CE-LCE/CE-EE/S0-S2/N/A) | ✅ CS-VP Kap. 1.5 ("CS-Kategorisierung: X"). 🟡 Systembewertung: Checkbox-Gruppen `Systemtyp_CIS`/`Subtyp_PCS/LCE/EE/NA`/`VNAP_S0-S2` (Merge-Feldnamen bekannt, kein Fill-Code) |
| `gamp_kategorie` | GAMP-5-Software-Kategorie | ✅ CS-VP Kap. 1.5 ("Softwarekategorie: X"). 🟡 Systembewertung: Checkbox-Gruppe `KAT1/3/4/5/NA` |
| `eres_typ` | Typ elektronischer Aufzeichnungen | ✅ CS-VP Kap. 1.5 ("eRecord & eSignature Typ: X"). 🟡 Systembewertung: Checkbox-Gruppe `ERESTYP1-4/NA` |
| *(berechnet, kein Eingabefeld)* `testtiefe` | Testtiefe (Gering/Mittel/Hoch) | ✅ Wird aus `gxp_kritikalitaet` + `gamp_kategorie` abgeleitet (Ableitungstabelle Kap. 8 Systembewertung, QU-MT-0001344). CS-VP Kap. 1.5 Testtiefe-Legende: die nicht zutreffenden Zeilen werden gestrichen, die passende bleibt. 🟡 Systembewertung: Checkbox-Gruppe `TTIEFEHOCH/MITTEL/NIEDRIG` |
| `geraetekategorie` | Gerätekategorie (ISPE/GAMP, A/B1/B2/B3/C1/C2/N/A) | 🟡 Systembewertung: Checkbox-Gruppe `GKATA/GKATB/GKATC/GKATNA` + Freitext-Anmerkung für die Subkategorie (Merge-Feldname bekannt, kein Fill-Code). Kein bekanntes Vorkommen in CS-VP. |
| `business_critical` | Business critical? | 🟡 Systembewertung: Checkbox-Gruppe `BCkritisch/BCunkritisch` |
| `vq_erforderlich` | Vereinfachte Qualifizierung erforderlich? | 🟡 Systembewertung: Checkbox-Gruppe `VQ/NVQ` (steuert laut SOP QU-SOP-0021736, ob überhaupt ein VQ-Dokument nötig ist) |
| `val_erforderlich` | Validierung erforderlich? | 🟡 Systembewertung: Checkbox-Gruppe `QUAL/VAL` (unabhängige Flags – ein System kann beides gleichzeitig brauchen) |
| `ki_reifegrad` | KI-Reifegrad (N/A, I–VI) | ✅ CS-VP Kap. 3.2 "Einsatz von Künstlicher Intelligenz": steuert den kompletten OHNE/MIT-Block (inkl. AI-Standard/High-Tabelle bei MIT), welche Reifegrad-Zeile (I/II/III/IV) bzw. welche N/A-Zusatzzeilen bleiben. V/VI sind laut Template im GxP-Umfeld nicht zulässig, werden bewusst nicht automatisch befüllt. 🟡 Systembewertung: Checkbox-Gruppe `KI1-6/NA` |

### 1.5 Objektart `system` – Status/Nachverfolgung

| Feld | Label | Verwendung im Template |
|---|---|---|
| `ist_aktuelle_version` | Ist aktuelle Version? | – Internes Status-Flag (welche von mehreren Systembewertungs-Versionen zum selben System aktuell gilt), kein direkter Template-Platzhalter bekannt |
| `herkunft` | Herkunft | – Internes Feld (z.B. "aus Excel-Import"), kein Template-Bezug bekannt |

### 1.6 Objektart `anforderung` (URS-Punkt) – nur für VQ

| Feld | Label | Verwendung im Template |
|---|---|---|
| `urs_id` | URS-ID | 🟡 VQ: Spalte in der URS-Tabelle (`URS-ID \| Anforderung \| GxP-relevant? \| entspricht URS \| getestet in TP-ID`), Struktur bekannt, kein Fill-Code (Task #4: Tabellenzeilen klonen) |
| `beschreibung` | Anforderungsbeschreibung | 🟡 VQ: s.o. |
| `gxp_relevant` | GxP-relevant? | 🟡 VQ: s.o. |
| `quelle` | Entspricht URS in (DS/PH) | 🟡 VQ: s.o. |

### 1.7 Objektart `risiko` (RA-Eintrag) – nur für VQ

| Feld | Label | Verwendung im Template |
|---|---|---|
| `ra_id` | RA-ID | 🟡 VQ: Spalte in der RA-Tabelle (`RA-ID \| mögliche Fehlfunktion \| Einfluss \| Maßnahmen \| getestet in TP-ID`), Struktur bekannt, kein Fill-Code |
| `fehlfunktion` | Mögliche Fehlfunktion | 🟡 s.o. |
| `einfluss` | Einfluss (Patientenschutz/Produktqualität/Datenintegrität) | 🟡 s.o. |
| `massnahmen` | Mitigierende Maßnahmen | 🟡 s.o. |

### 1.8 Objektart `pruefschritt` (IQ/OQ/PQ/PPQ) – für VQ und xQTP

| Feld | Label | Verwendung im Template |
|---|---|---|
| `pruef_id` | IQ/OQ/PQ-ID | 🟡 VQ/xQTP: Spalte in den separaten IQ-/OQ-/PQ-Prüftabellen (`ID \| Beschreibung \| Akzeptanzkriterium \| Erfüllt \| Kürzel \| Datum \| Anhang`), Struktur bekannt, kein Fill-Code |
| `phase` | Phase (IQ/OQ/PQ/PPQ) | 🟡 s.o. – bestimmt außerdem, in welche der mehreren Tabellen (IQ/OQ/PQ) die Zeile gehört |
| `beschreibung` | Beschreibung der Prüfung | 🟡 s.o. |
| `akzeptanzkriterium` | Akzeptanzkriterium | 🟡 s.o. |
| `erfuellt` | Erfüllt? | 🟡 s.o. |
| `kuerzel` | Kürzel (Prüfer) | 🟡 s.o. |
| `datum` | Datum | 🟡 s.o. |
| `bemerkung` | Anhang/Verweis/Bemerkung | 🟡 s.o. |

---

## 2. Projekt-DB (`db/seed_field_definitions_projekt.sql`)

Daten, die zu einem **konkreten Validierungsprojekt** gehören (nicht
dauerhaft zum System) – Verknüpfung zur System-DB über den Feldwert
`mlcs_id`. Bei der Erstellung eines CS-Validierungsplans werden **beide**
Datenbanken gebraucht. Die Kapitelangaben unten beziehen sich auf CS-VP
V9.0 (`QU-MT-0000722`), da das der bisher am genauesten geprüfte Dokumenttyp ist.

### 2.1 Verknüpfung + Vorgängerprojekt/Folgeversion

| Feld | Label | Verwendung im Template |
|---|---|---|
| `mlcs_id` | MLCS-ID (Verknüpfung System-DB) | – Reines Verknüpfungsfeld (Wert, keine Fremdschlüssel-Beziehung), kein eigener Template-Platzhalter |
| `ist_folgeprojekt` | Folgeprojekt? | ✅ Steuert zusammen mit `folgeversion`, ob die Versionshistorie-Zeilen (s. `versionshistorie_eintrag` unten) überhaupt erscheinen |
| `vorgaenger_dok_id` / `vorgaenger_version` | Vorgänger-Dokument: Dok-ID/Version | ⬜ Aktuell nur zur Ableitung der Folgeversion gedacht, noch nicht selbst in einen Platzhalter eingesetzt |
| `folgeversion` | Folgeversion (FV) dieses Dokuments | ✅ FV ≤ 1.0 → alle Versionshistorie-Zeilen entfallen; FV = 2.0 → Zeilen bleiben, mit CC-Nummer befüllt; FV ≥ 3.0 → zusätzlich neue Zeile in Kap. 1.1 + Kapitel 6 Änderungshistorie-Tabelle |
| `change_control_nummer` | Change-Control-Nummer dieses Projekts | ✅ Kap. 1.1 ("Change Controls XXXXXXX" → echte CC-Nummer) |

### 2.2 Systembeschreibung + Referenzdokumente

| Feld | Label | Verwendung im Template |
|---|---|---|
| `hauptfunktion` | Hauptfunktion des Systems (projektspezifisch) | ✅ Kap. 1.4, nach der festen Einleitung "Das System dient der …" (Einleitung bleibt unangetastet, nur die Beschreibung danach wird ersetzt) |
| `systembewertung_dok_id` / `_version` | Systembewertung: Dok-ID/Version (dieses Projekt) | ✅ Kap. 1.5 ("durchgeführt (XXXX V x.y)"); Kap. 1.6 Systemgrenzen ("im folgenden Dokument XXXX festgelegt"); Tabelle 6 Mitgeltende Unterlagen (Zeile "Systembewertung gemäß …") |
| `vmp_dok_id` / `_version` | VMP: Dok-ID/Version (dieses Projekt) | ✅ Nur relevant wenn `vmp_erforderlich=ja`: Tabelle 6 (Zeile VMP) und Kap. 3.1 ("Gemäß Doc ID-xxx") |
| `urs_dok_id` / `_version` | URS: Dok-ID/Version (dieses Projekt) | ✅ Tabelle 6 Mitgeltende Unterlagen (Zeile "URS") |
| `fs_dok_id` / `_version` | Funktionsspezifikation: Dok-ID/Version (dieses Projekt) | ✅ Tabelle 6 Mitgeltende Unterlagen – dafür gibt es **noch keine Zeile** im Template, wird als **neue Zeile** eingefügt, wenn ein Wert vorliegt |
| `projektbezeichnung` | Projektbezeichnung | ✅ Kap. 3.5 ("bezogen auf das Projektbezeichnung" → echter Projektname) |

### 2.3 Vorgehensweise + Testkonzept (Kap. 3 CS-VP)

| Feld | Label | Verwendung im Template |
|---|---|---|
| `vmp_erforderlich` | VMP erforderlich? (Kap. 3.1) | ✅ `nein` → Kap. 3.1 (Heading + gesamter Inhalt) wird komplett gestrichen |
| `digital_beteiligt` | Unterstützung durch Digital? (Kap. 3.2, KI) | ✅ Nur wirksam, wenn `ki_reifegrad` (System-DB) III/IV ist: steuert den "Wenn Digital beteiligt…"-Unterblock inkl. AI-Standard/High-Tabelle (ServiceNow-Weg vs. Risk-Profile-Absatz) |
| `urs_bereits_erstellt` | URS bereits erstellt? | ✅ Kap. 3.4 ("werden"/"wurden User Requirement Specifications erstellt…") |
| `phase_dq_geplant` / `_iq_` / `_oq_` / `_pq_` / `_ppq_geplant` | Phase … geplant? | ✅ Kap. 3.4 ("(DQ, IQ, OQ, PQ)"-Liste); Kap. 3.4.1 ("(IQ, OQ, PQ)" für Standardtestvorschriften); Kap. 3.7.4 ("IQ, OQ und PQ" im "A, B und C"-Stil); Kap. 3.7.8 (ganzes PPQ-Unterkapitel entfällt, wenn `phase_ppq_geplant=nein`); Kap. 3.9 (Qualifizierungsphasen im Validierungsbericht) |
| `gep_pruefung_erforderlich` | GEP-Punkte sollen geprüft werden? | ✅ Kap. 3.4 ("GEP-relevante Punkte können geprüft werden…" bleibt/entfällt) |
| `testplan_art` | Testplan (separat/als Anhang/integriert) | ✅ Kap. 3.7.1: eine von drei Alternativtexten bleibt, die anderen werden gestrichen |
| `testdurchfuehrung_art` | Durchführung von Tests (2 Varianten) | ✅ Kap. 3.7.3: eine von zwei Alternativtexten bleibt |

### 2.4 Verantwortlichkeiten je Dokument

| Feld | Label | Verwendung im Template |
|---|---|---|
| `verantwortlich_funktionsspezifikation` | Verantwortlich: Funktionsspezifikation | ✅ Tabelle "Dokumententyp / Verantwortlichkeit" (Zelle "Firma/Lieferant" → Lieferant/Sanofi) |
| `verantwortlich_hds` | Verantwortlich: HDS | ✅ s.o. |
| `verantwortlich_sds` | Verantwortlich: SDS | ✅ s.o. |
| `verantwortlich_ra` | Verantwortlich: Risikoanalyse | ✅ s.o. |
| `verantwortlich_tm` | Verantwortlich: Traceability-Matrix | ✅ s.o. |
| `verantwortlich_iq_testvorschriften` | Verantwortlich: IQ-Testvorschriften | ✅ s.o. |
| `verantwortlich_iq_durchfuehrung` | Verantwortlich: Durchführung der IQ | ✅ Kap. 3.7.5 ("<<Lieferant/Sanofi>>") – **anderes** Vorkommen als die Tabelle oben |

### 2.5 Objektart `versionshistorie_eintrag` (Liste, eine Zeile pro Vorversion mit Change Control)

| Feld | Label | Verwendung im Template |
|---|---|---|
| `version` | Version | ✅ Kap. 1.1 übergeordnete Zeile + ggf. neue Zeile bei FV≥3.0; Kapitel 6 Änderungshistorie-Tabelle (neue Zeile je Eintrag, wenn FV≥2.0); außerdem: Abgleich gegen die 10 **kapitelspezifischen** "V-x.x (CC Nummer): …"-Zeilen, um dort **nur** die CC-Nummer einzusetzen |
| `cc_nummer` | Change-Control-Nummer | ✅ s.o. |
| `beschreibung` | Beschreibung der Änderung | ✅ Kap. 1.1 (übergeordnete Zeile + neue Zeilen); Kapitel 6 Änderungshistorie-Tabelle. **Nicht** in die 10 kapitelspezifischen Zeilen übernommen – dort bleibt der Beschreibungstext Freitext (siehe Einschränkung unten) |

**Bekannte Einschränkung:** CS-VP hat neben der einen übergeordneten
"V2.0 (CC Nummer): …"-Zeile (Kap. 1.1) noch **10 weitere**,
kapitelspezifische Varianten (Systembewertung, Verantwortlichkeiten,
Lieferanten, Risikoanalyse, DQ, Traceability Matrix, IQ, OQ, PQ – jeweils
mit eigener Ja/Nein-Alternative + Begründungstext). Bei diesen 10 wird
bisher **nur** die `(CC Nummer)`-Platzhalter-Klammer durch die echte
CC-Nummer der passenden Version ersetzt – die eigentliche
Alternative-Aussage ("… wurde aktualisiert oder … nicht, da…") bleibt
Freitext, weil dafür eine **kapitelspezifische** Beschreibung je Version
nötig wäre, die `versionshistorie_eintrag` aktuell nicht abbildet (offene
Frage, siehe `KONZEPT.md` Abschnitt 2.1).

### 2.6 Objektart `lieferant_verantwortlichkeit` (Liste, Kap. 2.2 CS-VP)

| Feld | Label | Verwendung im Template |
|---|---|---|
| `beschreibung` | Verantwortlichkeit (Auswahl + Freitext-Fluchtoption) | ✅ Kap. 2.2 Aufzählung "Die Fa. … ist verantwortlich für: …". **4 der 5 Standardoptionen** stehen bereits als Absatz im Template (werden je nach Auswahl beibehalten/gestrichen); "die Schulung des Sanofi-Personals am System" ist zwar eine DB-Standardoption, aber **keine** vorgeschriebene Template-Zeile – wird bei Auswahl wie eine echte Freitext-Ergänzung als neuer Absatz eingefügt. Frei ergänzte Werte (`freitext_erlaubt=1`) laufen über denselben "neuer Absatz"-Weg. |

---

## Kurz zusammengefasst: wo es noch am dünnsten ist

- **Personen/Rollen** (Ersteller/SME/SI-PL/TSO/BSO/BQR/CSQ): in keinem der
  vier Templates konkret nachvollzogen, obwohl alle vier vermutlich eine
  Rollen-/Freigabetabelle haben.
- **Systembewertung selbst**: Merge-Feldnamen für die meisten
  Checkbox-Gruppen sind bekannt, aber es existiert noch **kein**
  Fill-Code (MERGEFIELD-Unterstützung ist bisher nur analysiert, nicht
  gebaut).
- **CS-VB, VQ, xQTP**: nur strukturell analysiert (Content
  Controls/Checkboxen/Tabellenspalten bekannt), noch kein
  Proof-of-Concept wie bei CS-VP.
- **Anforderung/Risiko/Prüfschritt** (URS-/RA-/IQ-OQ-PQ-Tabellenzeilen):
  Tabellenspalten bekannt, aber das Klonen/Entfernen von Tabellenzeilen je
  nach Datenmenge (Task #4) ist noch nicht umgesetzt – ohne das lässt sich
  keines dieser Felder tatsächlich in ein Dokument schreiben.
