# FVB: Vollständigkeits-Inventur CS-Validierungsbericht (CS-VB, QU-MT-0003543)

Stand: 04.09. Erster Fill-Durchlauf (Demo v1) gegen die reale Vorlage
(`FFICFQUMT0003543MDT__CSVB_Validierungsbericht_1.docx`). Analoge Doku zu
`docs/fvp_alle_fuellbaren_stellen.md`, gleiche Farbcode-/Nummerierungs-
konvention.

## Wichtiger Unterschied zum CS-VP

Der CS-VB ist ein **Ergebnis-Bericht**, kein Plan. Der überwiegende Teil
des Fließtexts beschreibt Ausführungs-Ergebnisse (DQ/RA/IQ/OQ/PQ/PPQ-
Ergebnisse, offene Anforderungen, Zusammenfassung, Systemfreigabe) - das
sind keine Stammdaten, die vorab in SDB/PDB stehen, sondern Fakten, die
erst während/nach der eigentlichen Validierungsdurchführung entstehen.
Diese Abschnitte werden **bewusst nicht** automatisch befüllt (keine
erfundenen GxP-Aussagen) - anders als beim CS-VP, wo der Großteil des
Inhalts tatsächlich aus Plan-Stammdaten ableitbar war.

## Technischer Befund: gleiche Fill-Mechanismen wie CS-VP wiederverwendbar

- Gleiche Content-Control-Checkbox-Technik (Tabelle "Weitere Validierungs-
  dokumente" - identische 18-Zeilen-Prüfpunktliste wie CS-VP Tabelle 10,
  inkl. derselben SOP-Referenzen).
- Gleicher Farbcode/Nummerierungsmechanismus, gleiche Helper-Funktionen
  1:1 aus `fill_demo10.py` übernommen (kein neuer Fill-Mechanismus nötig).
- **Neuer 5-X-Marker-Fund:** "Validierungsplan XXXXX" kommt an >10 Stellen
  im Fließtext vor, immer als eigener, konsistenter Run - lässt sich
  **generisch** (ein Scan über das ganze Dokument) ersetzen statt pro
  Absatz einzeln behandelt zu werden. Neues PDB-Feld `vp_dok_id`/
  `vp_version` (Dok-ID/Version des zugehörigen CS-VP - vorher nirgends
  erfasst, weil der CS-VP selbst sie nicht braucht).

## Was in Demo v1 gefüllt wurde

| Stelle | Quelle | Status |
|---|---|---|
| Folgedokument-Hinweis (Anfang) | PDB `vorgaenger_dok_id`/`_version` | ✅ (identisch zu CS-VP) |
| Kopf-Tabelle (Gebäude/Bereich/Systemname/MLCS-ID) | SDB | ✅ |
| Tabelle 1 Dokumentenfreigabe (Rollen+Personen) | SDB `person` | ✅ (identisch zu CS-VP, UI weiterhin ausgeblendet) |
| "Validierungsplan XXXXX" im Fließtext (>10 Stellen) | PDB `vp_dok_id` (NEU) | ✅ |
| Tabelle "Dokumentation Initial-Validierung" - Systembewertung, CS-VP, FDS, RA, IQ/OQ-Testplan (5 von 17 Zeilen) | PDB (bestehende Referenzdok-Felder) | ✅ |
| Tabelle "Weitere Validierungsdokumente" - PPQ-Zeile (1 von 18) | PDB `phase_ppq_geplant` | ✅ (echte Checkbox) |
| Änderungshistorie-Tabelle | PDB `versionshistorie_eintrag` | ✅ |

## Gefundene, noch offene Lücken (nicht gefüllt)

| Stelle | Grund |
|---|---|
| Tabelle 2 "Referenzdokumente" (nach Kap. 1.1) | Nur 1 Beispielzeile ("xQ-Abschlussbericht"), Struktur/Zuordnung noch unklar - nicht analysiert. |
| Tabelle "Dokumentation Initial-Validierung" - 11 von 17 Zeilen (HDS, SDS, URS/TM, DQ-/IQ-/OQ-/PQ-Abschlussberichte, IQ-/OQ-Testvorschriften, PQ-Testplan, AFU) | Ergebnis-Dokumente, deren Dok-ID erst bei/nach Validierungsdurchführung entsteht - keine Stammdaten. |
| Tabelle "Weitere Validierungsdokumente" - 17 von 18 Prüfpunkten | Wie bei CS-VP Tabelle 10: kein PDB-Feld vorhanden (gleiche Liste, gleiche Lücke). |
| Tabelle "Änderungen / Change Requests" | Ergebnis-Tabelle (welche CRs während der Validierung tatsächlich auftraten) - nicht vorab bekannt. |
| Tabelle "Unerwartete Ereignisse/Anomalien" (2 Tabellen) | Ergebnis-Tabellen, gleicher Grund. |
| Anhänge-Tabelle | Andere Inhalte als beim CS-VP (Test-Protokolle, UE/Anomalien-Liste statt Risikobewertung/Prüfplan) - kein Feld-Mapping übertragbar. |
| Alle DQ/RA/Systembewertung/IQ/OQ/PQ/PPQ-Ergebnistext-Abschnitte | Ausführungs-Ergebnisse, siehe oben - bewusst nicht automatisiert. |
| Kap. 3 "Einsatz von Künstlicher Intelligenz" | Verzweigt je nach `ki_reifegrad`/`digital_beteiligt` (SDB/PDB vorhanden) - Verzweigungslogik selbst noch nicht implementiert, wäre aber ähnlich zu bestehenden CS-VP-Weichen. Für einen späteren Durchlauf vorgemerkt. |
| Zusammenfassung, Systemfreigabe (AFU-CS) | Ergebnis-Text, bewusst nicht automatisiert. |

## Einordnung

Dieser erste Durchlauf deckt die Stellen ab, die **eindeutig aus
Stammdaten ableitbar sind** (Kopf, Rollen, Referenzdokumente, Checkbox-
Wiederverwendung, Versionshistorie) - vergleichbar mit dem CS-VP nach
Demo 7/8, nicht mit dem finalen Stand nach Demo 10. Ein vollständigerer
Durchlauf (analog zu den 4 CS-VP-Feedback-Runden) ist ein guter nächster
Schritt, aber aus Aufwandsgründen (Ressourcenlage, siehe Rückmeldung vom
24.08.) hier bewusst nicht in einem Schritt gemacht worden.
