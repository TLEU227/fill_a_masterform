# FVB: Vollständigkeits-Inventur CS-Validierungsbericht (CS-VB, QU-MT-0003543)

Stand: 04.09. (Demo v2, nach Feedback-Runde). Analoge Doku zu
`docs/fvp_alle_fuellbaren_stellen.md`, gleiche Farbcode-/Nummerierungs-
konvention.

## Wichtiger Unterschied zum CS-VP

Der CS-VB ist ein **Ergebnis-Bericht**, kein Plan. Ein Teil der
Ausführungs-Ergebnisse lässt sich aber - anders als ursprünglich
angenommen - doch über einfache Ja/Nein-Abfragefelder modellieren (siehe
"DQ/IQ/OQ/PQ/PPQ" unten), sofern diese Fakten nach Abschluss der jeweiligen
Phase, aber vor Erstellung des CS-VB in der Projekt-DB erfasst werden.
Reine Ergebnis-PROSA (Beschreibungstexte, Zusammenfassung, Systemfreigabe)
bleibt weiterhin unangetastet.

## Generelle Konvention (ab jetzt, alle Dokumenttypen)

- **Legendebox** ("Diese Legendebox dient nur zur Orientierung...", jedes
  Template) wird grundsätzlich komplett gestrichen.
- **Tabelle 1 Dokumentenfreigabe (Rollen)**: KEINE Personen-Ergänzung mehr
  (Rücknahme der ursprünglichen CS-VP-Funktion) - Tabelle bleibt in allen
  Dokumenttypen unangetastet.
- **Grauer Text** (#A6A6A6, "Info: ..."/"Nach finaler Eintragung...") wird
  im gesamten Dokument durchgestrichen/rot markiert (wie beim CS-VP).

## Was in Demo v2 gefüllt wird

| Stelle | Quelle | Status |
|---|---|---|
| Legendebox | - | ✅ immer gestrichen |
| Folgedokument-Hinweis | PDB `vorgaenger_dok_id`/`_version` | ✅ |
| Kopf-Tabelle | SDB | ✅ |
| Tabelle 3 "Gegenstand des CS-VB" (System/SW/Hersteller) | SDB | ✅ |
| "(CC Nummer)"-Platzhalter im gesamten Dokument | PDB `change_control_nummer` | ✅ generischer Scan |
| Tabelle 5 "Lieferantenbewertung" - Lieferant A (Name + QualiPSO-ID) | SDB `hersteller`/`lieferantennummer` | ✅ Lieferant B bleibt Lücke |
| "Validierungsplan XXXXX" im Fließtext | PDB `vp_dok_id` | ✅ |
| Tabelle "Dokumentation Initial-Validierung" (5 von 17 Zeilen) | PDB | ✅ |
| Tabelle "Weitere Validierungsdokumente" (PPQ-Checkbox) | PDB `phase_ppq_geplant` | ✅ |
| Änderungshistorie | PDB `versionshistorie_eintrag` | ✅ |
| Kap. 4.1 KI-Einsatz - "MIT KI"-Block bei ki_reifegrad N/A/I/II | SDB `ki_reifegrad` | ✅ nur diese Richtung, siehe Lücken |
| Kap. 4.2/4.7/4.8/4.9 (DQ/IQ/OQ/PQ) - "offene Anforderungen"-Absatz | PDB `{phase}_offene_anforderungen` | ✅ binäre Vereinfachung, siehe Lücken |
| Kap. 4.10 PPQ - ganzes Kapitel bei ppq_durchgefuehrt=nein | PDB `ppq_durchgefuehrt` | ✅ |
| Kap. 4.12 / Tabelle 6 "Änderungen/Unexpected Events" | PDB `unexpected_event` (neue Liste) | ✅ inkl. "keine Änderungen"-Alternative |

## Gefundene, noch offene Lücken (nicht gefüllt) und bewusste Vereinfachungen

| Stelle | Grund |
|---|---|
| Tabelle 2 "Referenzdokumente" (nach Kap. 1.1) | Nur 1 Beispielzeile, Struktur noch unklar - nicht analysiert. |
| Tabelle "Dokumentation Initial-Validierung" - 11 von 17 Zeilen | Ergebnis-Dokumente (Abschlussberichte, Testvorschriften, AFU, HDS/SDS, URS/TM) ohne PDB-Feld. |
| Tabelle "Weitere Validierungsdokumente" - 17 von 18 Prüfpunkten | Gleiche Lücke wie bei CS-VP Tabelle 10. |
| Kap. 4.1 KI-Einsatz - Umkehrfall (KI wird genutzt, ki_reifegrad III-VI) | Nur "keine KI" (N/A/I/II) umgesetzt, wie explizit angefordert ("wenigstens bei KI nicht verfügbar"). Bei aktiver KI-Nutzung bleiben aktuell BEIDE Blöcke stehen (Widerspruch im Dokument) - nächster Schritt. |
| Kap. 4.7 IQ - "unkritisch, per Change Control nachverfolgt"-Variante | Template hat hier 3 statt 2 Alternativen; aktuell binär vereinfacht (ja=behoben bis PQ / nein=keine aufgetreten), die dritte Variante wird immer gestrichen. |
| Kap. 4.8 OQ - "OQ-Abschlussbericht" vs. "in diesem Bericht" | Abgeleitet aus `phase_pq_geplant` (Annahme: Abschlussbericht existiert nur, wenn danach noch eine PQ-Phase folgt - im Template nicht 1:1 so benannt, aber konsistent zur Formulierung "(Falls keine PQ durchgeführt...)"). |
| Kap. 4.9 PQ / Kap. 4.10 PPQ - "Abschlussbericht" vs. "in diesem Bericht" | Keine explizite Bedingung im Template (anders als bei OQ) - nicht automatisiert, beide Absätze bleiben unangetastet. |
| Kap. 4.12 - "Formblatt"-Mechanismus (Alternative zu Tabelle 6) | Nicht modelliert, wird immer gestrichen (wir gehen davon aus, dass Änderungen immer über Tabelle 6/Unexpected Events laufen). |
| Tabelle "Unerwartete Ereignisse/Anomalien" (2 separate Tabellen, andere Struktur als Tabelle 6) | Eigene Spalten (Behebung zu Meilensteinen, Ja/Nein "erfolgreich abgeschlossen") - noch nicht mit `unexpected_event` verknüpft, möglicherweise dieselben Datensätze wie Tabelle 6 (Terminologie "Unexpected Event" laut Nutzer deckungsgleich) - als Folgeschritt vorgemerkt. |
| Anhänge-Tabelle, Zusammenfassung, Systemfreigabe (AFU-CS) | Ergebnis-Text, weiterhin bewusst nicht automatisiert. |

## Neue PDB-Felder (Stand 04.09.)

`vp_dok_id`/`_version`, `dq_offene_anforderungen`, `iq_offene_anforderungen`,
`oq_offene_anforderungen`, `pq_offene_anforderungen`,
`ppq_offene_anforderungen`, `ppq_durchgefuehrt` (alle Gruppe
"Validierungsergebnisse"), sowie die neue Liste `unexpected_event`
(Dokumenten-Nr./Titel/Version) - siehe `webapp` mit 3. "Hinzufügen"-Button
im Projekt-Formular.
