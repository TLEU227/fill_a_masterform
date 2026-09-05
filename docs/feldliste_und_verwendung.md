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

## Namensreferenz: Tabellen im CS-VP-Template (V9.0)

Damit wir uns eindeutig auf Stellen im Dokument beziehen können: das
Template hat **echte, benannte Tabellen-Captions** (Word-Formatvorlage
"Caption", steht direkt über der jeweiligen Tabelle) – "Tabelle 1" meint
also wirklich die Tabelle mit dieser Beschriftung im Dokument, nicht die
Reihenfolge in irgendeiner Liste. Drei Tabellen haben **keine** Caption
(unten als "–" markiert); für die verwenden wir einen beschreibenden
Namen.

| Name | Beschriftung im Dokument | Spalten |
|---|---|---|
| Kopf-Tabelle | – (keine Caption, ganz oben im Dokument) | Gebäude / Bereich / Systemname / MLCS-ID |
| **Tabelle 1** | Dokumentenfreigabe | Rolle / Funktion / Beschreibung |
| **Tabelle 2** | Gegenstand des Validierungsplans | System / Software / Hauptkomponenten / Hersteller-Lieferant |
| **Tabelle 3** | Abkürzungen und Definitionen | Abkürzung / Beschreibung |
| **Tabelle 4** | Definitionen | Definition / Beschreibung |
| **Tabelle 5** | Mitgeltende SOPs/Vorgabedokumente | Dok-ID / Beschreibung |
| **Tabelle 6** | Mitgeltende Unterlagen | Dok-ID / Beschreibung / Freigabedatum / Version |
| **Tabelle 7** | Verantwortlichkeiten Validierungsteam | (Zeile) / C&Q / PL / SME / BSO / TSO / BQR / CSQ / Lieferant |
| **Tabelle 8** | Lieferantenbewertung | Lieferant-Adresse / Dienstleistung-Service / Lieferantenbewertung |
| KI-Tabelle | – (keine Caption, in Kap. 3.2 KI) | IDs / AI Standard / AI High |
| **Tabelle 9** | Dokumentenübersicht | Dokumententyp / Verantwortlichkeit |
| **Tabelle 10** | Weitere Validierungsdokumente | Prüfpunkte / Erforderlich / Nachweis (Dok-ID)/Begründung |
| **Tabelle 11** | Anhänge | Anhang / Beschreibung-Dok-ID / Version |
| **Tabelle 12** | Änderungshistorie | Freigabedatum/Version / Change Control / Grund der Erstellung/Änderung |

(Eine weitere, ebenfalls unbeschriftete Tabelle steht in Kap. 3.7 –
Validierungsaktivitäten je GAMP-5-Software-Kategorie/Life-Cycle-Phase,
reine Nachschlagetabelle, wird nicht befüllt.)

---

## 1. System-DB (`db/seed_field_definitions.sql`)

Stammdaten des Systems selbst – gelten unabhängig vom konkreten Projekt/der
konkreten Validierung (siehe `KONZEPT.md` Abschnitt 2.1 zur Abgrenzung
gegenüber der Projekt-DB).

### 1.1 Objektart `person`

Eigene Objektart statt Freitext-Name je Rolle (dieselbe Person kommt in
mehreren Systemen/Dokumenten vor).

**Stand 20.08.: In der Web-Oberfläche ausgeblendet. Stand 04.09.: auch aus
dem Fill-Mechanismus wieder entfernt.** Nutzer-Rückmeldung 04.09.: Tabelle 1
Dokumentenfreigabe soll KEINE Personen-Namen mehr enthalten ("die Tabelle
kann so bleiben wie sie ist") - die ursprünglich in den CS-VP-Demos (v7-v10)
umgesetzte Ergänzung wurde damit zurückgenommen, gilt für CS-VP und CS-VB
gleichermaßen. Die `field_definitions` bleiben unverändert in der DB (für
eine mögliche spätere Verwendung), werden aber weder im Formular angezeigt
noch im Fill-Mechanismus verwendet.

| Feld | Label | Verwendung im Template |
|---|---|---|
| `name` | Name | ❌ **Zurückgenommen 04.09.** - keine Personen-Ergänzung in Tabelle 1 mehr, Feld bleibt nur in der DB |
| `funktion` | Funktion (vorher "Stelle/Funktion") | ❌ s.o. |
| `abteilung` | Abteilung | ⬜ War nie Teil der Tabelle-1-Ergänzung – sonst kein bekanntes Template-Vorkommen |

### 1.2 Objektart `system` – Personen/Rollen

Jedes Feld verweist auf einen `person`-Datensatz (Auswahl/Neuanlage), kein
Freitext-Name. **In der Web-Oberfläche ausgeblendet, seit 04.09. auch nicht
mehr im Fill-Mechanismus verwendet** (s.o.) - alle `rolle_*`-Felder bleiben
nur noch als DB-Definition erhalten, ohne aktuelle Verwendung.

| Feld | Label | Verwendung im Template |
|---|---|---|
| `rolle_ersteller` | Ersteller | ❌ Zurückgenommen 04.09. (war: CS-VP Tabelle 1, Zeile "Autor") |
| `rolle_sme` | SME | ❌ Zurückgenommen 04.09. |
| `rolle_si_pl` | SI/PL | ❌ Zurückgenommen 04.09. |
| `rolle_tso` | TSO | ❌ Zurückgenommen 04.09. |
| `rolle_bso` | BSO | ❌ Zurückgenommen 04.09. |
| `rolle_bqr` | BQR | ❌ Zurückgenommen 04.09. |
| `rolle_csq` | CSQ | ❌ Zurückgenommen 04.09. |

### 1.3 Objektart `system` – Stammdaten

| Feld | Label | Verwendung im Template |
|---|---|---|
| `mlcs_id` | MLCS-ID | ✅ CS-VP Kopf-Tabelle (Zeile "MLCS-ID"); Kap. 1.1 Fließtext ("…, MLCS-ID …"); Kap. 1.5 Systemeinstufung ("MLCS-ID: …") |
| `bereich` | Bereich/Betrieb | ✅ CS-VP Kopf-Tabelle (Zeile "Bereich") |
| `gebaeude` | Gebäude | ✅ CS-VP Kopf-Tabelle (Zeile "Gebäude"); Kap. 1.4 Betriebsort ("wird im Gebäude XXX…") |
| `dok_version` | Dokumentversion (Systembewertung) | ⬜ Vermutlich Kopf-Merge-Feld der Systembewertung selbst, noch nicht bestätigt |
| `dok_nummer` | Dokumentnummer (Systembewertung) | ⬜ s.o. |
| `systemname` | Systemname | ✅ CS-VP Kopf-Tabelle; **Tabelle 2** (Spalte "System"); Kap. 1.1 Fließtext; Kap. 3.5 ("an dem System …" statt generisch "den Systemen"); Kap. 3.9 Systemfreigabe (beide `<<System>>`-Alternativen) |
| `anlage` | Anlage | ⬜ Noch nicht an einer Vorlage nachvollzogen |
| `raum` | Raum | ✅ **Behoben 23.08.** CS-VP Kap. 1.4 Betriebsort ("… Raum XXX") – Marker-Kollision mit dem Gebäude-Marker (identischer Text "XXX") war das Problem, jetzt über den eigenen Run direkt angesprochen statt per Text-Suche |
| `kurzbeschreibung` | Kurzbeschreibung | ✅ CS-VP Kap. 1.1 Systembeschreibung ("System zur/zum…."); außerdem Stichwort-Grundlage für Kap. 1.7 Schnittstellen (s.u.) |
| `sw_name` | Software-Name | ✅ **Neu 23.08.** CS-VP **Tabelle 2** (Spalte "Software", zusammen mit `sw_version`); außerdem Stichwort-Grundlage für die Schnittstellen-Erkennung in Kap. 1.7 (TCP/IP, PRODIS, SAP, Sanofi-Laufwerke) |
| `sw_version` | Software-Version/Typ | ✅ **Neu 23.08.** CS-VP Tabelle 2 (Spalte "Software", zusammen mit `sw_name`) |
| `sw_hersteller` | Software-Hersteller | ⬜ |
| `hersteller` | Hersteller/Lieferant | ✅ CS-VP Kap. 2.2 ("<<MUSTER>>" → Firmenname); **Tabelle 2** (Spalte "Hersteller/Lieferant"); Tabelle 8 Lieferantenbewertung (**beide** Zeilen "Lieferant A" und "Lieferant B" → Firmenname, seit 23.08.) |
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
| `ki_reifegrad` | KI-Reifegrad (N/A, I–VI) | ✅ CS-VP Kap. 3.2 UND CS-VB Kap. 4.1 "Einsatz von Künstlicher Intelligenz": steuert den kompletten OHNE/MIT-Block. Bei CS-VB (Stand 04.09.) beide Richtungen umgesetzt: N/A/I/II → "MIT KI"-Block (inkl. grauem Label + "oder"-Trenner) entfernt; III/IV/V/VI → "ohne KI"-Block entfernt. 🟡 Systembewertung: Checkbox-Gruppe `KI1-6/NA`. **Seit 04.09. KEIN Eingabefeld mehr** (wie `testtiefe`) - wird automatisch aus `ki_vorhanden`+`ki_autonomie_stufe`+`ki_steuerungsdesign_stufe` berechnet (`KI_REIFEGRAD_MATRIX` in `webapp/app.js`), nicht mehr manuell gewählt. |
| `ki_vorhanden` / `ki_autonomie_stufe` / `ki_steuerungsdesign_stufe` | Wird KI eingesetzt? / Autonomie-Stufe (0–5) / Steuerungsdesign-Stufe (1–5) | ✅ **Neu 04.09.** Ersetzen die direkte Auswahl von `ki_reifegrad` (s.o.) - `ki_vorhanden=nein` beendet die Abfrage sofort (häufigster Fall, kein Reifegrad nötig), sonst ergibt sich der Reifegrad aus der Kombination der beiden Stufen (Matrix vom Nutzer bestätigt). |

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
| `vorgaenger_dok_id` / `vorgaenger_version` | Vorgänger-Dokument: Dok-ID/Version | ✅ CS-VP + CS-VB: Folgedokument-Hinweis am Dokumentanfang ("… ist das Folgedokument von XXXXXX (Version xx)") |
| `folgeversion` | Folgeversion (FV) dieses Dokuments | ✅ FV ≤ 1.0 → alle Versionshistorie-Zeilen entfallen; FV = 2.0 → Zeilen bleiben, mit CC-Nummer befüllt; FV ≥ 3.0 → zusätzlich neue Zeile in Kap. 1.1 + Tabelle 12: Änderungshistorie |
| `change_control_nummer` | Change-Control-Nummer dieses Projekts | ✅ Kap. 1.1 ("Change Controls XXXXXXX" → echte CC-Nummer) |

### 2.2 Systembeschreibung + Referenzdokumente

| Feld | Label | Verwendung im Template |
|---|---|---|
| `hauptfunktion` | Hauptfunktion des Systems (projektspezifisch) | ✅ Kap. 1.4, nach der festen Einleitung "Das System dient der …" (Einleitung bleibt unangetastet, nur die Beschreibung danach wird ersetzt) |
| `systembewertung_dok_id` / `_version` | Systembewertung: Dok-ID/Version (dieses Projekt) | ✅ Kap. 1.5 ("durchgeführt (XXXX V x.y)"); Kap. 1.6 Systemgrenzen ("im folgenden Dokument XXXX festgelegt"); Tabelle 6 Mitgeltende Unterlagen (Zeile "Systembewertung gemäß …") |
| `vmp_dok_id` / `_version` | VMP: Dok-ID/Version (dieses Projekt) | ✅ Nur relevant wenn `vmp_erforderlich=ja`: Tabelle 6 (Zeile VMP) und Kap. 3.1 ("Gemäß Doc ID-xxx") |
| `urs_dok_id` / `_version` | URS: Dok-ID/Version (dieses Projekt) | ✅ Tabelle 6 Mitgeltende Unterlagen (Zeile "URS") |
| `fs_dok_id` / `_version` | Funktionsspezifikation: Dok-ID/Version (dieses Projekt) | ✅ Tabelle 6 Mitgeltende Unterlagen – dafür gibt es **noch keine Zeile** im Template, wird als **neue Zeile** eingefügt, wenn ein Wert vorliegt |
| `lieferantenaudit_dok_id` / `_version` | Bericht Lieferantenauditierung: Dok-ID/Version (dieses Projekt) | ✅ **Neu 23.08.** Tabelle 6 Mitgeltende Unterlagen (Zeile "\<Bericht Lieferantenauditierung\>", bis dahin unbefüllt) |
| `ra_dok_id` / `_version` | Risikobewertung/RA: Dok-ID/Version (dieses Projekt) | ✅ **Neu 23.08.** Tabelle 11 Anhänge (Anhang 1, "xxx Risikobewertung" → Dok-ID; Version-Spalte) |
| `testplan_dok_id` / `_version` | Prüfplan/Testplan: Dok-ID/Version (dieses Projekt) | ✅ **Neu 23.08.** Tabelle 11 Anhänge (Anhang 2, "Prüfplan/-Protokoll Dokumentation; Version x.x" → Version wird im Platzhalter *innerhalb* der Beschreibungszelle ersetzt, Template-Eigenheit; Dok-ID wird in die sonst leere Version-Spalte ergänzt, da dort kein eigener Platz vorgesehen ist). Auch CS-VB: Tabelle "Dokumentation Initial-Validierung" (Zeile "IQ/OQ-Testplan"). |
| `vp_dok_id` / `_version` | Validierungsplan (CS-VP): Dok-ID/Version (dieses Projekt) | ✅ **Neu 04.09.** Nur CS-VB: ersetzt den 5-X-Marker "XXXXX" nach "Validierungsplan" an >10 Stellen im Fließtext (generischer Scan über das ganze Dokument, kein Text-Matching pro Absatz nötig) sowie in der Tabelle "Dokumentation Initial-Validierung" (Zeile "CS Validierungsplan (CS-VP)") |
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
| `verantwortlich_funktionsspezifikation` | Verantwortlich: Funktionsspezifikation | ✅ Tabelle 9: Dokumentenübersicht (Zelle "Firma/Lieferant" → Lieferant/Sanofi) |
| `verantwortlich_hds` | Verantwortlich: HDS | ✅ s.o. |
| `verantwortlich_sds` | Verantwortlich: SDS | ✅ s.o. |
| `verantwortlich_ra` | Verantwortlich: Risikoanalyse | ✅ s.o. |
| `verantwortlich_tm` | Verantwortlich: Traceability-Matrix | ✅ s.o. |
| `verantwortlich_iq_testvorschriften` | Verantwortlich: IQ-Testvorschriften | ✅ s.o. |
| `verantwortlich_iq_durchfuehrung` | Verantwortlich: Durchführung der IQ | ✅ Kap. 3.7.5 ("<<Lieferant/Sanofi>>") – **anderes** Vorkommen als die Tabelle oben |

### 2.5 Objektart `versionshistorie_eintrag` (Liste, eine Zeile pro Vorversion mit Change Control)

| Feld | Label | Verwendung im Template |
|---|---|---|
| `version` | Version | ✅ Kap. 1.1 übergeordnete Zeile + ggf. neue Zeile bei FV≥3.0; Tabelle 12: Änderungshistorie (neue Zeile je Eintrag, wenn FV≥2.0); außerdem: Abgleich gegen die 10 **kapitelspezifischen** "V-x.x (CC Nummer): …"-Zeilen, um dort **nur** die CC-Nummer einzusetzen |
| `cc_nummer` | Change-Control-Nummer | ✅ s.o. |
| `beschreibung` | Beschreibung der Änderung | ✅ Kap. 1.1 (übergeordnete Zeile + neue Zeilen); Tabelle 12: Änderungshistorie. **Nicht** in die 10 kapitelspezifischen Zeilen übernommen – dort bleibt der Beschreibungstext Freitext (siehe Einschränkung unten) |

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

### 2.7 Validierungsergebnisse (nur CS-VB, Kap. 4.2/4.7-4.10/4.12)

| Feld | Label | Verwendung im Template |
|---|---|---|
| `dq_offene_anforderungen` | DQ: offene Anforderungen aufgetreten? | ✅ Kap. 4.2 - steuert, welcher der beiden Alternativ-Absätze stehen bleibt |
| `iq_offene_anforderungen` | IQ: offene Anforderungen aufgetreten? | ✅ Kap. 4.7 - **Update 05.09.**: echte 3-Wege-Weiche zusammen mit `iq_offene_anforderungen_unkritisch` (statt binärer Vereinfachung) |
| `iq_offene_anforderungen_unkritisch` / `_beschreibung` | IQ: als unkritisch bewertet? / Beschreibung | ✅ **Neu 05.09.** Kap. 4.7, dritte Template-Variante ("unkritisch, per CC nachverfolgt") - nur wenn `iq_offene_anforderungen=ja`. CC-Nummer im Text wiederverwendet `change_control_nummer` |
| `oq_offene_anforderungen` | OQ: offene Anforderungen aufgetreten? | ✅ Kap. 4.8 |
| `pq_offene_anforderungen` | PQ: offene Anforderungen aufgetreten? | ✅ Kap. 4.9 |
| `ppq_offene_anforderungen` | PPQ: offene Anforderungen aufgetreten? | ✅ Kap. 4.10, nur relevant wenn `ppq_durchgefuehrt=ja` |
| `ppq_durchgefuehrt` | PPQ tatsächlich durchgeführt? | ✅ Kap. 4.10 - bei `nein` entfällt das ganze Kapitel |
| `oq_abschlussbericht_erstellt` / `pq_abschlussbericht_erstellt` / `ppq_abschlussbericht_erstellt` | Eigener Abschlussbericht erstellt? | ✅ **Neu 05.09.** Kap. 4.8/4.9/4.10 - steuert "... im X-Abschlussbericht zusammengefasst" vs. "... in diesem Validierungsbericht zusammengefasst" (ersetzt die alte Ableitung aus `phase_pq_geplant`). PPQ nur relevant wenn `ppq_durchgefuehrt=ja`. Werden auch in Tabelle "Dokumentation Initial-Validierung" (2.9) wiederverwendet. |
| `systembeschreibung_geaendert` / `_aenderung_beschreibung` | Systembeschreibung gegenüber CS-VP geändert? / Beschreibung | ✅ **Neu 05.09.** Kap. 1.4 (hat "Oder:") |
| `verantwortlichkeiten_geaendert` / `_aenderung_beschreibung` | Verantwortlichkeiten (Kap. 2.1) geändert? / Beschreibung | ✅ **Neu 05.09.** Kap. 2.1 (Template OHNE "Oder", inhaltlich trotzdem Alternative) |
| `lieferanten_verantwortlichkeiten_geaendert` / `_aenderung_beschreibung` | Verantwortlichkeiten des/der Lieferanten (Kap. 2.2) geändert? / Beschreibung | ✅ **Neu 05.09.** Kap. 2.2 (Template OHNE "Oder") |
| `lieferantenbewertung_neu_durchgefuehrt` | Lieferantenbewertung neu durchgeführt (statt Verweis auf CS-VP)? | ✅ **Neu 05.09.** Kap. 2.2.1 (hat "Oder:"); bei `nein` entfällt zusätzlich die gesamte Tabelle 5 "Lieferantenbewertung" |
| `testprozess_angepasst` / `_anpassung_beschreibung` | Testprozess angepasst (statt Standardtestvorschriften)? / Beschreibung | ✅ **Neu 05.09.** Kap. 3.x (hat "Oder:") |

**Kap. 5 Zusammenfassung** (hat "Oder"): "neues System" (Business-Continuity-
Bewertung) vs. "Folgeprojekt" (Zweck-Erweiterung um CC-Inhalt) - nutzt das
schon vorhandene `ist_folgeprojekt` (2.1) wieder, kein neues Feld.

### 2.8 Objektart `unexpected_event` (Liste, Kap. 4.12 CS-VB, Tabelle 6)

| Feld | Label | Verwendung im Template |
|---|---|---|
| `dokumenten_nr` | Dokumenten-Nr. (QU-OPE) | ✅ Tabelle 6 "Änderungen/Unexpected Events", Spalte "Dokumenten-Nr." |
| `titel` | Titel | ✅ Tabelle 6, Spalte "Titel" |
| `version` | Version | ✅ Tabelle 6, Spalte "Version" |

Wenn die Liste leer ist, bleibt stattdessen der "keine Änderungen"-Absatz
stehen (Template-Alternative). Der "Formblatt"-Mechanismus (weitere
Template-Alternative) wird nicht modelliert.

### 2.9 Tabelle "Dokumentation Initial-Validierung" (nur CS-VB, Kap. 6.1)

**Neu 05.09.** Nutzer-Anfrage: Dok-ID + Version pro Zeile abfragen, UND für
Dokumente, die gar nicht erstellt wurden, die Zeile aus der Tabelle
entfernen (statt Platzhalter "XXXX" stehen zu lassen). Fünf Zeilen sind
zwingende Grundlagendokumente jeder GxP-Systemvalidierung (kein
"nicht erstellt" möglich) und behalten ihr bestehendes Feld ohne Gate:
Systembewertung, CS-VP, FDS, RA, IQ/OQ-Testplan (siehe 2.2). Die
restlichen 11 Zeilen (Ergebnis-Dokumente) haben je ein `{typ}_erstellt`
(ja/nein) + `{typ}_dok_id` + `{typ}_version`:

| Feld-Präfix | Dokumententyp |
|---|---|
| `hds` | Hardware Designspezifikation (HDS) |
| `sds` | Software Designspezifikation (SDS) |
| `urs_tm` | URS/Traceability-Matrix |
| `dq_abschlussbericht` | DQ Abschlussbericht |
| `iq_testvorschriften` | IQ-Testvorschriften (projektspezifisch) |
| `iq_abschlussbericht` | IQ-Abschlussbericht |
| `oq_testvorschriften` | OQ-Testvorschriften (projektspezifisch) |
| `oq_abschlussbericht` | OQ-Abschlussbericht (nur `_dok_id`/`_version` neu - `_erstellt` ist das wiederverwendete Feld aus 2.7) |
| `pq_testplan` | PQ-Testplan |
| `pq_abschlussbericht` | PQ-Abschlussbericht (nur `_dok_id`/`_version` neu, s.o.) |
| `afu` | Authorisation for Use (AFU) |

Bei `{typ}_erstellt=nein` wird die komplette Tabellenzeile entfernt; bei
`ja` werden Dok-ID/Version eingesetzt; ist der Wert nicht gesetzt, bleibt
die Zeile mit Platzhalter "XXXX" unangetastet stehen.

### 2.10 Tabelle "Weitere Validierungsdokumente" (nur CS-VB, Kap. 6.2, 18 Prüfpunkte)

**Neu 05.09.** Nutzer-Anfrage: pro Prüfpunkt abfragen, ob das Dokument
erforderlich war (echte Ja/Nein-Checkbox im Template). Bei `nein` wird die
Begründung in die letzte Spalte ("Nachweis (Dokumenten ID) / Begründung,
wenn nicht erforderlich") übertragen, bei `ja` die Dokumenten-ID (+
optional Titel). Jede Zeile hat `wvd_{slug}_erforderlich` (ja/nein) +
`wvd_{slug}_dok_id` + `wvd_{slug}_titel` (optional) + `wvd_{slug}_begruendung`
- mit einer Ausnahme: die PPQ-Zeile nutzt für "erforderlich?" das schon
vorhandene Feld `ppq_durchgefuehrt` (2.7) wieder statt eines eigenen Feldes
(hat kein eigenes `wvd_ppq_erforderlich`).

**Update 05.09. (Nutzer-Anfrage):** `wvd_{slug}_begruendung` ist jetzt
`auswahl` statt `mehrzeiliger_text`, mit 1-2 vorformulierten, fachlich
plausibelsten Standardbegründungen je Dokument (`freitext_erlaubt=1` als
Fluchtoption). Beim Einsetzen in den Fließtext wird der gewählte Text -
anders als aus der DB übernommene gesicherte Fakten (Dok-ID: schwarz) -
**blau** markiert (`SUGGEST_COLOR`, entspricht der Farbkonvention der
Vorlage selbst, siehe `KONZEPT.md` Abschnitt 3): ein Vorschlag, keine
gesicherte Aussage, muss vor Freigabe von einem Menschen bestätigt/
angepasst und dann schwarz formatiert werden.

| Slug | Prüfpunkt |
|---|---|
| `datenflussdiagramm` | Datenflussdiagramm |
| `audit_trail_review_konzept` | Audit Trail Review Konzept |
| `berechtigungskonzept` | Berechtigungskonzept |
| `trainingsplan` | Trainingsplan |
| `ppq` | Process Performance Qualification (PPQ) - "erforderlich?" = `ppq_durchgefuehrt` |
| `user_process_monitoring` | User Process Monitoring (UPM) |
| `datenmigration` | Datenmigration (DM) |
| `wartung_monitoring` | Festlegung Wartung und Monitoring |
| `archivierung_daten` | Prozedur zur Archivierung der Daten |
| `backup_restore_konzept` | Back-up & Restore Konzept |
| `business_continuity_plan` | Business Continuity Plan |
| `incident_stoerungsmanagement` | Incident- und Störungsmanagement |
| `aenderungs_konfigurationsmanagement` | Änderungs- und Konfigurationsmanagement |
| `logbuch_system` | Logbuch (Server, CS, Equipment, etc.) |
| `lieferantenbewertung_nachweis` | Lieferantenbewertung (Nachweis, andere Stelle als 2.7 `lieferantenbewertung_neu_durchgefuehrt`) |
| `quality_agreement` | Quality Agreement |
| `bedienungsanweisungen` | Anweisungen zur Bedienung des CS |
| `bedienungshandbuch` | Handbuch mit Anleitungen zur Bedienung des CS |

---

## Kurz zusammengefasst: wo es noch am dünnsten ist

- **Personen/Rollen** (Ersteller/SME/SI-PL/TSO/BSO/BQR/CSQ): **Zurückgenommen
  04.09.** - werden nicht mehr in Tabelle 1 (Dokumentenfreigabe) ergänzt,
  weder bei CS-VP noch bei CS-VB. Felder bleiben nur noch als DB-Definition
  erhalten.
- **Systembewertung selbst**: Merge-Feldnamen für die meisten
  Checkbox-Gruppen sind bekannt, aber es existiert noch **kein**
  Fill-Code (MERGEFIELD-Unterstützung ist bisher nur analysiert, nicht
  gebaut).
- **CS-VB**: erster Fill-Durchlauf gegen die reale Vorlage existiert (siehe
  `docs/fvb_alle_fuellbaren_stellen.md`) - Kopf/Referenzdok./Checkbox-
  Wiederverwendung/DQ-PPQ-Ergebnisse abgedeckt, Ergebnis-Prosa (Zusammen-
  fassung, Systemfreigabe) weiterhin bewusst nicht automatisiert.
- **VQ, xQTP**: nur strukturell analysiert (Content
  Controls/Checkboxen/Tabellenspalten bekannt), noch kein
  Proof-of-Concept wie bei CS-VP/CS-VB.
- **Anforderung/Risiko/Prüfschritt** (URS-/RA-/IQ-OQ-PQ-Tabellenzeilen):
  Tabellenspalten bekannt, aber das Klonen/Entfernen von Tabellenzeilen je
  nach Datenmenge (Task #4) ist noch nicht umgesetzt – ohne das lässt sich
  keines dieser Felder tatsächlich in ein Dokument schreiben.
