# FVB: Vollständigkeits-Inventur CS-Validierungsbericht (CS-VB, QU-MT-0003543)

Stand: 05.09. (Demo v7). Analoge Doku zu
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

## Was in Demo v7 gefüllt wird

| Stelle | Quelle | Status |
|---|---|---|
| Legendebox | - | ✅ immer gestrichen |
| Folgedokument-Hinweis | PDB `vorgaenger_dok_id`/`_version` | ✅ |
| Kopf-Tabelle | SDB | ✅ |
| Tabelle 3 "Gegenstand des CS-VB" (System/SW/Hersteller) | SDB | ✅ |
| "(CC Nummer)"-Platzhalter im gesamten Dokument | PDB `change_control_nummer` | ✅ generischer Scan |
| Tabelle 5 "Lieferantenbewertung" - Lieferant A (Name + QualiPSO-ID) | SDB `hersteller`/`lieferantennummer` | ✅ Lieferant B bleibt Lücke; ganze Tabelle entfällt bei `lieferantenbewertung_neu_durchgefuehrt=nein` |
| "Validierungsplan XXXXX" im Fließtext | PDB `vp_dok_id` | ✅ |
| Tabelle "Dokumentation Initial-Validierung" (Kap. 6.1) | PDB, s. u. | ✅ **Update 05.09.**: alle 17 Zeilen (vorher 5 von 17) - restliche 9 Ergebnis-Dokumenttypen jetzt mit `{typ}_erstellt`-Gate: nein → Zeile entfernt, ja → Dok-ID+Version befüllt. Nur die 5 zwingenden Grundlagendokumente (Systembewertung/CS-VP/FDS/RA/IQ-OQ-Testplan) ohne Gate. |
| Tabelle "Weitere Validierungsdokumente" (Kap. 6.2, 18 Prüfpunkte) | PDB `wvd_{typ}_erforderlich`/`_dok_id`/`_titel`/`_begruendung` | ✅ **Update 05.09.**: alle 18 Zeilen (vorher nur PPQ-Checkbox) - Ja/Nein-Checkbox + letzte Spalte je nach Antwort mit Dok-ID(+Titel) oder Begründung. PPQ-Zeile nutzt `ppq_durchgefuehrt` wieder statt eigenem Feld. **Update 05.09. (2):** `_begruendung` ist jetzt ein Auswahlfeld mit 1-2 vorformulierten Standardbegründungen je Dokument (siehe unten) - im Dokument **blau** statt schwarz markiert (Vorschlag, keine gesicherte Tatsache). |
| Änderungshistorie | PDB `versionshistorie_eintrag` | ✅ |
| Kap. 4.1 KI-Einsatz - "ohne KI"/"MIT KI"-Block (beide Richtungen) | SDB `ki_vorhanden`/`ki_autonomie_stufe`/`ki_steuerungsdesign_stufe` (→ `ki_reifegrad` abgeleitet, wie in der Webapp) | ✅ beide Richtungen umgesetzt |
| Kap. 4.2/4.8/4.9 (DQ/OQ/PQ) - "offene Anforderungen"-Absatz | PDB `{phase}_offene_anforderungen` | ✅ |
| Kap. 4.7 IQ - "offene Anforderungen": echte 3-Wege-Weiche | PDB `iq_offene_anforderungen` + `iq_offene_anforderungen_unkritisch` (+ `_beschreibung`) | ✅ **Update 05.09.**: dritte Template-Variante ("unkritisch, per CC nachverfolgt") jetzt eigenständig statt immer gestrichen; CC-Nummer wiederverwendet `change_control_nummer` |
| Kap. 4.8/4.9/4.10 - "eigener Abschlussbericht" vs. "in diesem Bericht" | PDB `oq_abschlussbericht_erstellt`/`pq_abschlussbericht_erstellt`/`ppq_abschlussbericht_erstellt` | ✅ **Update 05.09.**: direkte Felder statt Ableitung aus `phase_pq_geplant`; zugehörige phasenspezifische "V2.0 (CC Nummer): Beschreibung der ...-Ergebnisse"-Zeile wird bei "ja" mitgelöscht, bei "nein" bewusst NICHT automatisch befüllt (keine erfundene GxP-Ergebnisaussage) |
| Kap. 4.10 PPQ - ganzes Kapitel bei ppq_durchgefuehrt=nein | PDB `ppq_durchgefuehrt` | ✅ |
| Kap. 4.12 / Tabelle 6 "Änderungen/Unexpected Events" | PDB `unexpected_event` (neue Liste) | ✅ inkl. "keine Änderungen"-Alternative |
| Kap. 3 "Vorgehensweise bei der Validierung" - wie geplant/angepasst | PDB `vorgehensweise_wie_geplant`/`_anpassung_beschreibung` | ✅ |
| Kap. 1.4 Systembeschreibung - unverändert vs. geändert | PDB `systembeschreibung_geaendert`/`_aenderung_beschreibung` | ✅ **NEU 05.09.** (hat "Oder:" im Template) |
| Kap. 2.1 Verantwortlichkeiten - unverändert vs. geändert | PDB `verantwortlichkeiten_geaendert`/`_aenderung_beschreibung` | ✅ **NEU 05.09.** (Template OHNE "Oder", inhaltlich trotzdem Alternative - siehe Begründung unten) |
| Kap. 2.2 Verantwortlichkeiten des/der Lieferanten - unverändert vs. geändert | PDB `lieferanten_verantwortlichkeiten_geaendert`/`_aenderung_beschreibung` | ✅ **NEU 05.09.** (Template OHNE "Oder") |
| Kap. 2.2.1 Lieferantenbewertung - Verweis auf CS-VP vs. neu durchgeführt | PDB `lieferantenbewertung_neu_durchgefuehrt` | ✅ **NEU 05.09.** (hat "Oder:"); steuert zusätzlich, ob Tabelle 5 überhaupt gebraucht wird |
| Kap. 3.x Testprozess - Standardtestvorschriften vs. angepasst | PDB `testprozess_angepasst`/`_anpassung_beschreibung` | ✅ **NEU 05.09.** (hat "Oder:") |
| Kap. 5 Zusammenfassung - neues System vs. Folgeprojekt | PDB `ist_folgeprojekt` (wiederverwendet) | ✅ **NEU 05.09.** (hat "Oder"); Business-Continuity-Block vs. Zweck-Erweiterungs-Block |
| Alle 8 "V2.0 (CC Nummer): ..."-Zeilen im gesamten Dokument | PDB `folgeversion` + `versionshistorie_eintrag` | ✅ generisch: FV≤1.0 entfernt, FV=2.0 befüllt, FV≥3.0 zusätzlich neue Zeile im gleichen Stil. Die 3 phasenspezifischen OQ/PQ/PPQ-Ergebnis-Varianten (s. Kap. 4.8/4.9/4.10 oben) sind davon bewusst ausgenommen (andere Semantik, siehe dort). |
| Kap. 1.2 "Initial-Validierung erfolgte im Rahmen des CC ..." | PDB `ist_folgeprojekt` (wiederverwendet) + `change_control_nummer` (wiederverwendet) | ✅ `ist_folgeprojekt=nein` (= das IST die Initial-Validierung) → CC-Nummer eingesetzt, Absatz bleibt; `=ja` (Folgeprojekt) → Absatz entfernt |

## Vollständige Inventur aller Entweder-Oder-Textstellen (Stand 05.09.)

Nutzer-Auftrag: "Durchsuche das VB nach Textpassagen, die eine Entscheidung
erfordern. Entweder oder." Vorgehen: Volltext-Suche nach "Oder"/"oder" als
Absatz-Anfang (17 Treffer) plus zusätzlicher Scan nach inhaltlich
alternativen Absatzpaaren ohne das Wort "Oder" (Muster "ist im
Validierungsplan beschrieben" / "hat sich gegenüber dem Validierungsplan
... geändert" - 2 weitere Treffer: Kap. 2.1 und Kap. 2.2). Pharma-Domain-
Reasoning dahinter: ein CS-VB dokumentiert IMMER genau EINEN tatsächlichen
Zustand je Aspekt (z. B. "Verantwortlichkeiten unverändert" ODER
"Verantwortlichkeiten geändert") - beide Aussagen gleichzeitig stehen zu
lassen wäre GxP-widersprüchlich, unabhängig davon, ob das Template das
Wort "Oder" explizit gesetzt hat.

Alle so gefundenen Entscheidungspunkte sind jetzt mit einem PDB-Feld
verdrahtet (siehe Tabelle oben) - **eine** Stelle bleibt bewusst
unangetastet:

| Stelle | Grund |
|---|---|
| Kap. 2.1 Verantwortlichkeiten - Duplikat direkt nach der "V2.0 (CC Nummer)"-Zeile | Fast identischer Absatz-Block, der im Template unmittelbar nach der V2.0-Zeile noch einmal auftaucht (mutmaßlich ein Kopierfehler in der Vorlage selbst, keine echte dritte Alternative) - bewusst nicht angetastet, um nichts Falsches zu raten. |

## Tabelle "Weitere Validierungsdokumente" - vorformulierte Standardbegründungen (Stand 05.09.)

Nutzer-Anfrage: für jedes der 18 Prüfpunkte eine möglichst plausible,
häufig zutreffende Begründung vorformulieren, warum das Dokument NICHT
erforderlich war - bei zwei genauso plausiblen Fällen beide anbieten. Im
Web ein Auswahlfeld (Dropdown, `freitext_erlaubt=1` als Fluchtoption für
abweichende Fälle), im Dokument beim Einsetzen **blau** markiert (Vorschlag,
siehe oben).

| Prüfpunkt | Vorschlag/Vorschläge |
|---|---|
| Datenflussdiagramm | System besteht aus einer einzelnen Komponente ohne Datenaustausch |
| Audit Trail Review Konzept | (a) kein Audit Trail vorhanden **oder** (b) gültiges Konzept aus Vorprojekt weiter gültig |
| Berechtigungskonzept | keine individuellen Benutzerkonten/Zugriffsdifferenzierung |
| Trainingsplan | keine neuen Funktionen/kein neues Personal |
| Process Performance Qualification (PPQ) | PPQ nicht durchgeführt (automatisch aus `ppq_durchgefuehrt`) |
| User Process Monitoring (UPM) | kein erhöhtes DI-Risiko laut Risikobewertung, Standard-Audit-Trail ausreichend |
| Datenmigration (DM) | keine Übernahme von Bestandsdaten |
| Festlegung Wartung und Monitoring | bestehende Festlegung aus Regelbetrieb bleibt gültig |
| Prozedur zur Archivierung der Daten | bestehende Prozedur aus Regelbetrieb bleibt gültig |
| Back-up & Restore Konzept | (a) bestehendes Konzept bleibt gültig **oder** (b) Datensicherung über zentrale IT-Infrastruktur |
| Business Continuity Plan | (a) nicht geschäftskritisch **oder** (b) gültiger Plan bereits vorhanden |
| Incident- und Störungsmanagement | bestehendes Management aus Regelbetrieb bleibt gültig |
| Änderungs- und Konfigurationsmanagement | bestehendes Management aus Regelbetrieb bleibt gültig |
| Logbuch | keine Logbuchpflicht (kein physisches Equipment) |
| Lieferantenbewertung | gültige Bewertung aus Vorprojekt innerhalb der Gültigkeitsfrist |
| Quality Agreement | gültiges Agreement deckt Systemumfang bereits ab |
| Anweisungen zur Bedienung des CS | Bedienung unverändert, bestehende Anweisungen gültig |
| Handbuch mit Anleitungen zur Bedienung | Bedienung unverändert, bestehendes Handbuch gültig |

## Gefundene, noch offene Lücken (nicht gefüllt) und bewusste Vereinfachungen

| Stelle | Grund |
|---|---|
| Tabelle 2 "Referenzdokumente" (nach Kap. 1.1) | Nur 1 Beispielzeile, Struktur noch unklar - nicht analysiert. |
| Kap. 4.12 - "Formblatt"-Mechanismus (Alternative zu Tabelle 6) | Nicht modelliert, wird immer gestrichen (wir gehen davon aus, dass Änderungen immer über Tabelle 6/Unexpected Events laufen). |
| Tabelle "Unerwartete Ereignisse/Anomalien" (2 separate Tabellen, andere Struktur als Tabelle 6) | Eigene Spalten (Behebung zu Meilensteinen, Ja/Nein "erfolgreich abgeschlossen") - noch nicht mit `unexpected_event` verknüpft, möglicherweise dieselben Datensätze wie Tabelle 6 (Terminologie "Unexpected Event" laut Nutzer deckungsgleich) - als Folgeschritt vorgemerkt. |
| Anhänge-Tabelle, Zusammenfassung (restlicher Fließtext), Systemfreigabe (AFU-CS) | Ergebnis-Text, weiterhin bewusst nicht automatisiert. |

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
