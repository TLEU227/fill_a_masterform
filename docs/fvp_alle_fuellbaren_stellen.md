# FVP (Fill CS-VP) – alle theoretisch füllbaren Stellen im Template

**Zweck dieser Datei:** anders als `docs/feldliste_und_verwendung.md` (die von
den DB-**Feldern** ausgeht) geht diese Liste vom **Template** aus - jede
Stelle im CS-VP V9.0, an der laut der eigenen Farbkonvention des Templates
("Blaue Schrift = Bei Bedarf anzupassen") oder durch ein Ankreuzfeld
überhaupt etwas eingesetzt/ausgewählt werden könnte, wurde systematisch
durchsucht (nicht nur die, die im Demo v8 zufällig vorkamen). Ziel: eine
vollständige Inventur, nicht nur ein Beispiel.

**Ergebnis vorab:** von allen gefundenen Stellen sind **die meisten bereits
abgedeckt** (✅, geprüft im Demo-Skript `fill_demo8.py`). Es gibt aber
**3 neu gefundene Lücken** (🟡, siehe unten) und mehrere Stellen, die
**bewusst nicht** aus der DB befüllt werden (–, feste Referenz-/
Beispielinhalte laut Template selbst).

Status-Symbole wie in `docs/feldliste_und_verwendung.md`: ✅ abgedeckt |
🟡 Lücke, noch kein DB-Feld | – bewusst nicht befüllbar (fixer Referenz-/
Beispielinhalt) | ⬜ unklar/offen

---

## Vor Tabelle 1 (Dokumentanfang)

| Stelle | Was steht dort | Feld/DB | Status |
|---|---|---|---|
| Hinweis + Folgedokument-Satz | "XXXXXX (Version 1.0) ist das Folgedokument von XXXXXX (Version xx)" - nur relevant, wenn ein Vorgängerdokument mit neuer Dok-ID existiert | PDB: `vorgaenger_dok_id`, `vorgaenger_version` (für den zweiten Teil "von XXXXXX (Version xx)") | 🟡 **NEU GEFUNDEN, nicht implementiert.** Der erste Teil ("XXXXXX (Version 1.0)" - die Dok-ID/Version DIESES Dokuments) ist ohnehin erst nach Erzeugung durch QualiPSO bekannt, könnte also nur teilweise vorausgefüllt werden. |

## Kopf-Tabelle

| Stelle | Feld/DB | Status |
|---|---|---|
| Gebäude, Bereich, Systemname, MLCS-ID | SDB: `gebaeude`, `bereich`, `systemname`, `mlcs_id` | ✅ |

## Tabelle 1: Dokumentenfreigabe

| Stelle | Feld/DB | Status |
|---|---|---|
| Funktion-Spalte je Rolle (Autor/Prüfer x3/Freigeber x2), Name+Funktion ergänzt | SDB: `rolle_ersteller`, `rolle_sme`, `rolle_si_pl`, `rolle_tso`, `rolle_bso`, `rolle_bqr`, `rolle_csq` (+ `person.name`/`person.funktion`) | ✅ Logik funktioniert, **aber**: Personen-Gruppe ist aktuell in der Webapp ausgeblendet - ohne Eingabemaske gibt's in der Praxis keine echten Werte dafür |

## Kap. 1.1 Ziel und Umfang

| Stelle | Feld/DB | Status |
|---|---|---|
| "<<System, MLCS ID>>" | SDB: `systemname`, `mlcs_id` | ✅ |
| "System zur/zum…." (Systembeschreibung) | SDB: `kurzbeschreibung` | ✅ |
| "Change Controls XXXXXXX" | PDB: `change_control_nummer` | ✅ |
| "V2.0 (CC Nummer): Beschreibung der Änderung…" (übergeordnete Versionshistorie-Zeile, ggf. + neue Zeile bei FV≥3.0) | PDB: `folgeversion` + `versionshistorie_eintrag` | ✅ |

## Kap. 1.2/1.3 Abkürzungen und Definitionen (Tabelle 3, Tabelle 4)

| Stelle | Status |
|---|---|
| Glossar-Tabellen | – feste Nachschlagetabellen, bleiben bei jedem Dokument identisch (bestätigt in `docs/analyse_weitere_templates.md`) |

## Kap. 1.4 Systembeschreibung

| Stelle | Feld/DB | Status |
|---|---|---|
| "Das System dient der …" (Hauptfunktion) | PDB: `hauptfunktion` | ✅ |
| "wird im Gebäude XXX" | SDB: `gebaeude` | ✅ |
| "Raum XXX" | SDB: `raum` | 🟡 Feld existiert, aber Marker "XXX" ist identisch zum Gebäude-Marker in derselben Zeile - aktueller Code trifft nur den ersten Treffer zuverlässig (bekannte Einschränkung aus `docs/feldliste_und_verwendung.md`) |

## Kap. 1.5 Systemeinstufung

| Stelle | Feld/DB | Status |
|---|---|---|
| "durchgeführt (XXXX V x.y)" | PDB: `systembewertung_dok_id`, `systembewertung_version` | ✅ |
| "MLCS-ID: " | SDB: `mlcs_id` | ✅ |
| "GMP-Kritikalität: Minor, Major, Critical" | SDB: `gxp_kritikalitaet` | ✅ |
| "Softwarekategorie: X" | SDB: `gamp_kategorie` | ✅ |
| "eRecord & eSignature Typ: X" | SDB: `eres_typ` | ✅ |
| "CS-Kategorisierung: X" | SDB: `systemtyp` | ✅ |
| Testtiefe-Legende (3 Zeilen, 1 bleibt) | berechnet aus `gxp_kritikalitaet` + `gamp_kategorie` | ✅ |
| Gerätekategorie (`geraetekategorie`) | – kommt in CS-VP nirgends vor, nur in der Systembewertung (MERGEFIELD `GKATA/GKATB/GKATC/GKATNA`) | – (kein Gap, einfach nicht relevant für FVP) |

## Kap. 1.6 Systemgrenzen

| Stelle | Feld/DB | Status |
|---|---|---|
| "im folgenden Dokument XXXX festgelegt" | PDB: `systembewertung_dok_id` | ✅ |

## Kap. 1.7 Schnittstellen

| Stelle | Feld/DB | Status |
|---|---|---|
| 4 feste Kandidaten-Sätze (TCP/IP, PRODIS, SAP, Sanofi-Laufwerke) | SDB: Stichwortsuche in `kurzbeschreibung`/`sw_name`/`systemname` | ✅ (heuristisch, geprüft) |

## Tabelle 6: Mitgeltende Unterlagen

| Stelle | Feld/DB | Status |
|---|---|---|
| Zeile "Validierungs-Master-Plan" | PDB: `vmp_erforderlich`, `vmp_dok_id`, `vmp_version` | ✅ |
| Zeile "Systembewertung gemäß…" | PDB: `systembewertung_dok_id`, `systembewertung_version` | ✅ |
| Zeile "URS" | PDB: `urs_dok_id`, `urs_version` | ✅ |
| Neue Zeile "Funktionsspezifikation" | PDB: `fs_dok_id`, `fs_version` | ✅ |
| Zeile "\<Bericht Lieferantenauditierung\>" | – | 🟡 **NEU GEFUNDEN.** Kein passendes PDB-Feld (z.B. `lieferantenaudit_dok_id`/`_version`) - Zeile bleibt komplett unangetastet |

## Kap. 2.2 Verantwortlichkeiten des Lieferanten

| Stelle | Feld/DB | Status |
|---|---|---|
| "<<MUSTER>>" (Firmenname) | SDB: `hersteller` | ✅ |
| 4 Standardzeilen + Freitext-Ergänzungen | PDB: `lieferant_verantwortlichkeit` | ✅ |

## Tabelle 7: Verantwortlichkeiten Validierungsteam (RACI-Matrix)

| Stelle | Status |
|---|---|
| Ganze Matrix (P/A/G je Rolle, "Firma XY") | – feste Beispiel-/Nachschlagematrix, bewusst nicht aus der DB befüllt (bestätigt in `docs/analyse_weitere_templates.md`) |

## Tabelle 8: Lieferantenbewertung

| Stelle | Feld/DB | Status |
|---|---|---|
| Lieferantenname | SDB: `hersteller` | ✅ |
| "Ist durchzuführen" / QualiPSO-ID | SDB: `lieferantennummer` | ✅ |

## Kap. 3.1 Validierungsstrategie gemäß VMP

| Stelle | Feld/DB | Status |
|---|---|---|
| Ganzes Kapitel oder "Doc ID-xxx" | PDB: `vmp_erforderlich`, `vmp_dok_id` | ✅ |

## Kap. 3.2 Einsatz von Künstlicher Intelligenz

| Stelle | Feld/DB | Status |
|---|---|---|
| OHNE/MIT-Block-Auswahl + Reifegrad-Zeilen I-IV | SDB: `ki_reifegrad` | ✅ |
| Tabelle "IDs / AI Standard / AI High" - Block behalten/streichen | SDB: `ki_reifegrad`, PDB: `digital_beteiligt` | ✅ |
| **Inhalt** der Tabelle (Beispiel-IDs "DEL-16", "NFR-43" etc.) | – | – projektspezifische Traceability-IDs, dafür gibt's (noch) keine strukturierten Felder - bewusst nicht befüllt, kein Gap im engeren Sinn, da hierfür bislang keine Datenmodellierung vorgesehen war |
| "Wenn Digital beteiligt…"-Unterblock | PDB: `digital_beteiligt` | ✅ |

## Kap. 3.4 Designqualifizierung

| Stelle | Feld/DB | Status |
|---|---|---|
| "werden/wurden User Requirement Specifications" | PDB: `urs_bereits_erstellt` | ✅ |
| "(DQ, IQ, OQ, PQ)" Phasenliste | PDB: `phase_dq/iq/oq/pq/ppq_geplant` | ✅ |
| "GEP-relevante Punkte können geprüft werden" | PDB: `gep_pruefung_erforderlich` | ✅ |

## Kap. 3.4.1 / 3.4.2 / 3.4.3

| Stelle | Feld/DB | Status |
|---|---|---|
| "(IQ, OQ, PQ)" Standardtestvorschrift-Phasen | PDB: `phase_*_geplant` | ✅ |
| RA-Absatzblöcke (major/critical vs. minor/N.A. vs. "freigegebene RA muss vorliegen") | SDB: `gxp_kritikalitaet` | ✅ |

## Kap. 3.5

| Stelle | Feld/DB | Status |
|---|---|---|
| "bezogen auf das Projektbezeichnung" | PDB: `projektbezeichnung` | ✅ |
| "an den Systemen" → Systemname | SDB: `systemname` | ✅ |

## Kap. 3.7.1 / 3.7.3 / 3.7.4 / 3.7.5 / 3.7.8

| Stelle | Feld/DB | Status |
|---|---|---|
| Testplan (3 Varianten) | PDB: `testplan_art` | ✅ |
| Testdurchführung (2 Varianten) | PDB: `testdurchfuehrung_art` | ✅ |
| "Abschlussberichte zur IQ, OQ und PQ" | PDB: `phase_*_geplant` | ✅ |
| "<<Liferant/Sanofi>>" (IQ-Durchführung) | PDB: `verantwortlich_iq_durchfuehrung` | ✅ |
| Ganzes Kap. 3.7.8 (PPQ) behalten/streichen | PDB: `phase_ppq_geplant` | ✅ |

## Tabelle 9: Dokumentenübersicht (Verantwortlichkeiten je Dokument)

17 Zeilen insgesamt, aber nur 6 davon haben überhaupt die Alternative
"Firma/Lieferant / SANOFI" - die anderen 11 (CS-VP, Systembewertung, DQ-
Abschlussbericht, IQ/OQ-Testplan, IQ-/OQ-/PQ-Abschlussbericht, OQ-
Testvorschriften, PQ-Testplan, CS-Validierungsbericht) sind **immer**
"SANOFI", keine Wahlmöglichkeit, kein Feld nötig.

| Stelle | Feld/DB | Status |
|---|---|---|
| Funktionsspezifikation, HDS, SDS, RA, TM, IQ-Testvorschriften | PDB: `verantwortlich_*` | ✅ Alle 6 wählbaren Zeilen abgedeckt |

## Kap. 3.9 Validierungsbericht / Systemfreigabe

| Stelle | Feld/DB | Status |
|---|---|---|
| "(DQ, IQ, OQ, PQ)" Qualifizierungsphasen | PDB: `phase_*_geplant` | ✅ |
| "<<System>>" (2x, Freigabe-Alternativen) + "Oder" | SDB: `systemname` | ✅ |

## Die 10 kapitelspezifischen "V-x.x (CC Nummer): …"-Zeilen

| Stelle | Feld/DB | Status |
|---|---|---|
| Nur die "(CC Nummer)"-Klammer wird ersetzt | PDB: `versionshistorie_eintrag` | ✅ mit bekannter Einschränkung: der Rest bleibt Freitext (siehe `docs/feldliste_und_verwendung.md`) |

## Tabelle 10: Weitere Validierungsdokumente (18 Ja/Nein-Ankreuzfelder)

| Stelle | Feld/DB | Status |
|---|---|---|
| Process Performance Qualification (PPQ) | PDB: `phase_ppq_geplant` | ✅ |
| Die anderen 17 Prüfpunkte (Datenflussdiagramm, Audit Trail Review Konzept, Berechtigungskonzept, Trainingsplan, UPM, Datenmigration, Wartung/Monitoring, Archivierung, Backup&Restore, Business Continuity, Incident-Management, Change-/Konfigurationsmanagement, Logbuch, Lieferantenbewertung, Quality Agreement, Bedienungsanweisungen, Handbuch) | – | 🟡 **bereits in v8 dokumentiert:** kein PDB-Feld vorhanden, bewusst unangekreuzt |

## Tabelle 11: Anhänge

| Stelle | Was steht dort | Feld/DB | Status |
|---|---|---|---|
| Anhang 1 "xxx Risikobewertung", Version-Spalte leer | vermutlich Version der Risikoanalyse | – | 🟡 **NEU GEFUNDEN.** Kein PDB-Feld für die Version der RA/des Prüfplans an dieser Stelle |
| Anhang 2 "Prüfplan/-Protokoll Dokumentation", Version-Spalte leer | vermutlich Version des Testplans | – | 🟡 **NEU GEFUNDEN.** s.o. |

## Tabelle 12: Änderungshistorie

| Stelle | Feld/DB | Status |
|---|---|---|
| Neue Zeile(n) je Versionshistorie-Eintrag, wenn FV≥2.0 | PDB: `versionshistorie_eintrag` | ✅ |

---

## Zusammenfassung der 3 neu gefundenen Lücken (nicht implementiert)

1. **Folgedokument-Hinweis am Dokumentanfang** ("XXXXXX (Version 1.0) ist das
   Folgedokument von XXXXXX (Version xx)") - `vorgaenger_dok_id`/
   `vorgaenger_version` existieren in der PDB, werden aber an dieser Stelle
   noch nicht eingesetzt.
2. **Tabelle 6, Zeile "Bericht Lieferantenauditierung"** - kein PDB-Feld.
3. **Tabelle 11 (Anhänge), Version-Spalte** für Risikobewertung/Prüfplan -
   kein PDB-Feld.

Alles andere im Template ist entweder ✅ bereits abgedeckt oder – bewusst
fixer Referenz-/Beispielinhalt (Glossare, RACI-Matrix, GAMP-5-Lifecycle-
Tabelle, die konkreten Traceability-IDs in der AI-Tabelle).
