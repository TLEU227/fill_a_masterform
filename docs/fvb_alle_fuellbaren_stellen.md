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
  Template) wird grundsätzlich komplett entfernt.
- **Tabelle 1 Dokumentenfreigabe (Rollen)**: KEINE Personen-Ergänzung mehr
  (Rücknahme der ursprünglichen CS-VP-Funktion) - Tabelle bleibt in allen
  Dokumenttypen unangetastet.
- **Grauer Text** (#A6A6A6, "Info: ..."/"Nach finaler Eintragung...") wird
  im gesamten Dokument entfernt.
- **Konventions-Update 04.09. (Nachmittag): Löschungen werden tatsächlich
  ausgeführt, nicht mehr nur durchgestrichen/rot markiert.** Bisheriges
  "nichts real entfernen"-Prinzip war unnötige Nacharbeit für die
  menschliche Prüfung - Nutzer-Entscheidung: "das gilt für alles". Betroffen:
  Legendebox, grauer Text, nicht zutreffende Alternativ-Absätze (inkl. der
  dazwischenliegenden "Oder:"-Trenner), komplett entfallende Kapitel (KI-
  Block, PPQ). Einzige technisch bedingte Ausnahme: der letzte Absatz einer
  Tabellenzelle kann laut OOXML nie vollständig entfernt werden (mind. 1
  Absatz Pflicht) - dort bleibt es beim Durchstreichen (z. B. Tabelle 6
  Beispielzeile). Gelbe Markierung für eingefügte/beibehaltene Werte bleibt
  unverändert - betrifft nur die Löschungen.

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
| Kap. 4.1 KI-Einsatz - "ohne KI"/"MIT KI"-Block (beide Richtungen) | SDB `ki_vorhanden`/`ki_autonomie_stufe`/`ki_steuerungsdesign_stufe` (→ `ki_reifegrad` abgeleitet, wie in der Webapp) | ✅ **Update 04.09.**: Umkehrfall (KI wird genutzt, Reifegrad III-VI) jetzt auch umgesetzt - vorher nur "ohne KI"-Richtung |
| Kap. 4.2/4.7/4.8/4.9 (DQ/IQ/OQ/PQ) - "offene Anforderungen"-Absatz | PDB `{phase}_offene_anforderungen` | ✅ binäre Vereinfachung, siehe Lücken |
| Kap. 4.10 PPQ - ganzes Kapitel bei ppq_durchgefuehrt=nein | PDB `ppq_durchgefuehrt` | ✅ |
| Kap. 4.12 / Tabelle 6 "Änderungen/Unexpected Events" | PDB `unexpected_event` (neue Liste) | ✅ inkl. "keine Änderungen"-Alternative |
| Kap. 3 "Vorgehensweise bei der Validierung" - wie geplant/angepasst | PDB `vorgehensweise_wie_geplant`/`_anpassung_beschreibung` | ✅ **einziger** solcher Textbaustein im Dokument, siehe Hinweis unten |
| Alle 8 "V2.0 (CC Nummer): ..."-Zeilen im gesamten Dokument | PDB `folgeversion` + `versionshistorie_eintrag` | ✅ generisch: FV≤1.0 entfernt, FV=2.0 befüllt, FV≥3.0 zusätzlich neue Zeile im gleichen Stil |
| Kap. 1.2 "Initial-Validierung erfolgte im Rahmen des CC ..." | PDB `ist_folgeprojekt` (wiederverwendet) + `change_control_nummer` (wiederverwendet) | ✅ `ist_folgeprojekt=nein` (= das IST die Initial-Validierung) → CC-Nummer eingesetzt, Absatz bleibt; `=ja` (Folgeprojekt) → Absatz entfernt |

## Gefundene, noch offene Lücken (nicht gefüllt) und bewusste Vereinfachungen

| Stelle | Grund |
|---|---|
| Tabelle 2 "Referenzdokumente" (nach Kap. 1.1) | Nur 1 Beispielzeile, Struktur noch unklar - nicht analysiert. |
| Tabelle "Dokumentation Initial-Validierung" - 11 von 17 Zeilen | Ergebnis-Dokumente (Abschlussberichte, Testvorschriften, AFU, HDS/SDS, URS/TM) ohne PDB-Feld. |
| Tabelle "Weitere Validierungsdokumente" - 17 von 18 Prüfpunkten | Gleiche Lücke wie bei CS-VP Tabelle 10. |
| ~~Kap. 4.1 KI-Einsatz - Umkehrfall~~ | **Geschlossen 04.09. (Nachmittag).** Beide Richtungen jetzt umgesetzt, inkl. dem grauen "MIT Künstliche Intelligenz:"-Label (Bedienungshilfe, wird durch die bestehende Grautext-Regel entfernt) und dem "oder"-Trenner dazwischen. |
| Kap. 4.7 IQ - "unkritisch, per Change Control nachverfolgt"-Variante | Template hat hier 3 statt 2 Alternativen; aktuell binär vereinfacht (ja=behoben bis PQ / nein=keine aufgetreten), die dritte Variante wird immer gestrichen. |
| Kap. 4.8 OQ - "OQ-Abschlussbericht" vs. "in diesem Bericht" | Abgeleitet aus `phase_pq_geplant` (Annahme: Abschlussbericht existiert nur, wenn danach noch eine PQ-Phase folgt - im Template nicht 1:1 so benannt, aber konsistent zur Formulierung "(Falls keine PQ durchgeführt...)"). |
| Kap. 4.9 PQ / Kap. 4.10 PPQ - "Abschlussbericht" vs. "in diesem Bericht" | Keine explizite Bedingung im Template (anders als bei OQ) - nicht automatisiert, beide Absätze bleiben unangetastet. |
| Kap. 4.12 - "Formblatt"-Mechanismus (Alternative zu Tabelle 6) | Nicht modelliert, wird immer gestrichen (wir gehen davon aus, dass Änderungen immer über Tabelle 6/Unexpected Events laufen). |
| Tabelle "Unerwartete Ereignisse/Anomalien" (2 separate Tabellen, andere Struktur als Tabelle 6) | Eigene Spalten (Behebung zu Meilensteinen, Ja/Nein "erfolgreich abgeschlossen") - noch nicht mit `unexpected_event` verknüpft, möglicherweise dieselben Datensätze wie Tabelle 6 (Terminologie "Unexpected Event" laut Nutzer deckungsgleich) - als Folgeschritt vorgemerkt. |
| Anhänge-Tabelle, Zusammenfassung, Systemfreigabe (AFU-CS) | Ergebnis-Text, weiterhin bewusst nicht automatisiert. |

## Dok-ID-Format vereinheitlicht (Stand 04.09.)

Nutzer-Rückmeldung: bei Sanofi sind Dokument-Nummern grundsätzlich im
**QU-OPE-XXXXXXX**-Format (nicht die zuvor in den Demo-Daten verwendete
"FRA-PLAN-G-XXXXX"-Fantasienummer). Alle `*_dok_id`-Felder in der
Projekt-DB (`vorgaenger_dok_id`, `systembewertung_dok_id`, `vmp_dok_id`,
`urs_dok_id`, `fs_dok_id`, `lieferantenaudit_dok_id`, `ra_dok_id`,
`testplan_dok_id`, `vp_dok_id`) haben jetzt `QU-OPE-XXXXXXX` als
`format_hinweis` in `seed_field_definitions_projekt.sql`.

## "Wie geplant / anders durchgeführt" - nur EIN Textbaustein, nicht pro Phase

Nutzer-Anfrage: ob es pro Phase (DQ/IQ/OQ/PQ/PPQ) eine "wurde anders als
geplant durchgeführt"-Option geben kann. Nutzer-Vorgabe dabei: **nur
vorhandene Textbausteine nutzen, keine neuen Sätze erfinden.** Ergebnis der
erneuten Prüfung: DQ/IQ/OQ/PQ/PPQ haben dafür **keinen eigenen** Textblock
im Template - nur Kap. 3 "Vorgehensweise bei der Validierung" hat ein
einziges, übergreifendes "wie geplant"/"angepasst"-Alternativenpaar (mit
"Kap. 2.0 Titel"-Platzhalter + Freitextbeschreibung + "V2.0 (CC Nummer)"-
Zeile). Genau dieses wird jetzt befüllt - **kein** separates Feld pro
Phase, weil es dafür keine Textgrundlage im Dokument gibt. Der "Kap. 2.0
Titel"-Platzhalter (mutmaßlich ein einzufügender Kapiteltitel für die
Änderungsbeschreibung) bleibt unangetastet - kein PDB-Feld dafür vorgesehen.

## Versionshistorie generisch für alle 8 "V2.0 (CC Nummer)"-Zeilen (Stand 04.09., Nachmittag)

Bisher (v2/v3) wurde bei den 8 blau markierten "V2.0 (CC Nummer): ..."-
Instruktionszeilen (Kap. 1.2, Lieferantenbewertung, Vorgehensweise, DQ, IQ,
OQ, PQ, PPQ) nur der Platzhalter "(CC Nummer)" ersetzt - unabhängig von der
tatsächlichen Dokumentversion. Nutzer-Rückmeldung: das Formular hat dafür
schon ein Feld (`folgeversion`) - das soll jetzt generisch für **alle**
diese Zeilen gelten, nicht nur für die eine Haupt-Zeile:
- `folgeversion` ≤ 1.0 → Zeile komplett entfernt (kein Vorgänger).
- `folgeversion` = 2.0 → Zeile bleibt, befüllt mit dem "2.0"-Eintrag aus
  `versionshistorie_eintrag` (CC-Nummer + Beschreibung).
- `folgeversion` ≥ 3.0 → die "2.0"-Zeile bleibt (Historie), **zusätzlich**
  wird eine neue Zeile im gleichen Stil (Schriftart/-größe kopiert) für die
  aktuelle Version eingefügt.

**Bewusste Vereinfachung:** es gibt nur EINE allgemeine Beschreibung pro
Version (`versionshistorie_eintrag.beschreibung`), keine kapitelspezifische
- dieselbe Beschreibung wird daher in allen 8 Zeilen eingesetzt. Passt zum
vom Nutzer selbst als Stil-Beispiel genannten Text ("Beschreibung der
Änderung, die die Versionierung ... erforderlich macht"), der ebenfalls
generisch statt kapitelspezifisch ist.

Wechselwirkung mit anderen Regeln: liegt eine dieser Zeilen in einem später
komplett gestrichenen Kapitel (z. B. PPQ bei `ppq_durchgefuehrt=nein`),
verschwindet sie automatisch mit - kein Sonderfall nötig.

## Neue PDB-Felder (Stand 04.09.)

`vp_dok_id`/`_version`, `dq_offene_anforderungen`, `iq_offene_anforderungen`,
`oq_offene_anforderungen`, `pq_offene_anforderungen`,
`ppq_offene_anforderungen`, `ppq_durchgefuehrt` (alle Gruppe
"Validierungsergebnisse"), sowie die neue Liste `unexpected_event`
(Dokumenten-Nr./Titel/Version) - siehe `webapp` mit 3. "Hinzufügen"-Button
im Projekt-Formular.
