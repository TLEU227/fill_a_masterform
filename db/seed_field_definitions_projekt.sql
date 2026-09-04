-- ============================================================================
-- Start-Belegung: Objektarten + Felder der PROJEKT-Datenbank
-- ============================================================================
-- Zweite, eigenständige .sqlite-Datei (gleiches Schema wie die System-DB,
-- siehe schema.sql - EAV-Modell, kein neues DDL nötig). Grund für eine
-- eigene Datei statt weiterer Felder in der System-DB: die hier erfassten
-- Daten gehören zu einem konkreten VP-Projekt/einer konkreten Validierung,
-- nicht dauerhaft zum System selbst (ein System kann mehrere Projekte über
-- die Zeit durchlaufen). Verknüpfung zur System-DB über mlcs_id (Wert, keine
-- klassische Fremdschlüssel-Beziehung - die beiden Dateien sind unabhängig).
--
-- Bei der Erstellung eines CS-Validierungsplans werden BEIDE Datenbanken
-- gebraucht: Systemdaten (System-DB) + Projektdaten (diese DB).
-- ============================================================================

INSERT INTO entity_types (key, label) VALUES
    ('projekt',                    'Projekt'),
    ('versionshistorie_eintrag',   'Versionshistorie-Eintrag'),
    ('lieferant_verantwortlichkeit', 'Verantwortlichkeit des Lieferanten');

-- ---------------------------------------------------------------------------
-- Projekt: Verknüpfung + Vorgängerprojekt/Folgeversion-Logik.
--
-- Ableitung Folgeversion (FV) aus ist_folgeprojekt + vorgaenger_version:
--   ist_folgeprojekt = nein            -> FV = 1.0 (Erstprojekt)
--   ist_folgeprojekt = ja              -> FV = vorgaenger_version + 1 (Vorschlag,
--                                         manuell überschreibbar - siehe Feld
--                                         folgeversion)
--
-- Auswirkung auf den CS-Validierungsplan (die "V2.0 (CC Nummer): ..."-Zeilen):
--   FV = 1.0            -> diese Zeilen entfallen (kein Vorgänger, nichts zu
--                          berichten)
--   FV = 2.0            -> Zeilen bleiben erhalten, befüllt mit der
--                          change_control_nummer dieses Projekts
--   FV >= 3.0           -> die V2.0-Zeile bleibt (Historie, aus einem
--                          früheren Projekt), UND es kommt eine neue Zeile
--                          für die aktuelle FV + ihre CC-Nummer dazu
--                          (siehe Objektart 'versionshistorie_eintrag')
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('projekt', 'mlcs_id',               'MLCS-ID (Verknüpfung System-DB)', 'text', NULL, 1, NULL, NULL, '["immer"]', 'Verknüpfung', 10),

('projekt', 'ist_folgeprojekt',      'Folgeprojekt?',            'ja_nein', NULL, 1, NULL, NULL, '["CS-VP","CS-VB"]', 'Vorgängerprojekt', 10),
('projekt', 'vorgaenger_dok_id',     'Vorgänger-Dokument: Dok-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn ist_folgeprojekt = ja', '["CS-VP","CS-VB"]', 'Vorgängerprojekt', 20),
('projekt', 'vorgaenger_version',    'Vorgänger-Dokument: Version', 'text', NULL, 0, 'x.x', 'nur wenn ist_folgeprojekt = ja', '["CS-VP","CS-VB"]', 'Vorgängerprojekt', 30),
('projekt', 'folgeversion',          'Folgeversion (FV) dieses Dokuments', 'text', NULL, 1, 'x.x - Vorschlag: 1.0 bei Erstprojekt, sonst Vorgänger-Version + 1, bei Bedarf überschreibbar', NULL, '["CS-VP","CS-VB"]', 'Vorgängerprojekt', 40),
('projekt', 'change_control_nummer', 'Change-Control-Nummer dieses Projekts', 'text', NULL, 0, 'z.B. CC-2024-001234', NULL, '["CS-VP","CS-VB"]', 'Vorgängerprojekt', 50),

-- Kap. 1.1/1.4 CS-VP: Hauptfunktion ist projektspezifisch (kann von Projekt
-- zu Projekt am selben System variieren), deshalb hier statt in der System-DB.
('projekt', 'hauptfunktion',         'Hauptfunktion des Systems (projektspezifisch)', 'mehrzeiliger_text', NULL, 0, NULL, NULL, '["CS-VP"]', 'Systembeschreibung', 10),

-- Kap. 1.4 / Tabelle "Mitgeltende Unterlagen" CS-VP: die zu DIESEM Projekt
-- gehörende Systembewertung (nicht notwendigerweise die im Excel-Import
-- gefundene - ein System kann mehrfach neu bewertet worden sein).
('projekt', 'systembewertung_dok_id', 'Systembewertung: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'gemäß QU-MT-0001344', '["CS-VP","CS-VB"]', 'Referenzdokumente', 10),
('projekt', 'systembewertung_version', 'Systembewertung: Version (dieses Projekt)', 'text', NULL, 0, 'x.x', NULL, '["CS-VP","CS-VB"]', 'Referenzdokumente', 20),

-- Kap. 1.6 Tabelle "Mitgeltende Unterlagen": VMP-Dok-ID, nur relevant wenn
-- vmp_erforderlich = ja.
('projekt', 'vmp_dok_id',            'VMP: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn vmp_erforderlich = ja', '["CS-VP"]', 'Referenzdokumente', 30),
('projekt', 'vmp_version',           'VMP: Version (dieses Projekt)', 'text', NULL, 0, 'x.x', 'nur wenn vmp_erforderlich = ja', '["CS-VP"]', 'Referenzdokumente', 35),

-- Tabelle "Mitgeltende Unterlagen": URS-Dok-ID/-Version dieses Projekts
-- (die vorhandene Zeile in der Tabelle wird damit befüllt statt unangetastet
-- zu bleiben).
('projekt', 'urs_dok_id',            'URS: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', NULL, '["CS-VP"]', 'Referenzdokumente', 40),
('projekt', 'urs_version',           'URS: Version (dieses Projekt)', 'text', NULL, 0, 'x.x', NULL, '["CS-VP"]', 'Referenzdokumente', 45),

-- Tabelle "Mitgeltende Unterlagen": Funktionsspezifikation (FS) - dafür gibt
-- es noch keine Zeile im Template, wird bei Bedarf als neue Zeile ergänzt.
('projekt', 'fs_dok_id',             'Funktionsspezifikation: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', NULL, '["CS-VP","CS-VB"]', 'Referenzdokumente', 50),
('projekt', 'fs_version',            'Funktionsspezifikation: Version (dieses Projekt)', 'text', NULL, 0, 'x.x', NULL, '["CS-VP","CS-VB"]', 'Referenzdokumente', 55),

-- Tabelle "Mitgeltende Unterlagen": Bericht Lieferantenauditierung - dafür
-- gibt es bereits eine (bisher unbefuellte) Zeile im Template.
('projekt', 'lieferantenaudit_dok_id',  'Bericht Lieferantenauditierung: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', NULL, '["CS-VP"]', 'Referenzdokumente', 60),
('projekt', 'lieferantenaudit_version', 'Bericht Lieferantenauditierung: Version (dieses Projekt)', 'text', NULL, 0, 'x.x', NULL, '["CS-VP"]', 'Referenzdokumente', 65),

-- Anhang 1 ("Risikobewertung") der Tabelle "Anhänge" - Dok-ID ersetzt das
-- "xxx" in der Beschreibungszelle, Version die (leere) Version-Spalte.
('projekt', 'ra_dok_id',             'Risikobewertung/RA: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', NULL, '["CS-VP","CS-VB"]', 'Referenzdokumente', 70),
('projekt', 'ra_version',            'Risikobewertung/RA: Version (dieses Projekt)', 'text', NULL, 0, 'x.x', NULL, '["CS-VP","CS-VB"]', 'Referenzdokumente', 75),

-- Anhang 2 ("Prüfplan/-Protokoll Dokumentation") der Tabelle "Anhänge" -
-- Dok-ID/Version werden dort eingesetzt, wo im Template bereits "Version
-- x.x" als Platzhalter in der Beschreibungszelle selbst steht (nicht in der
-- separaten Version-Spalte - das ist die Template-eigene Inkonsistenz, wir
-- folgen ihr, statt sie zu "reparieren").
('projekt', 'testplan_dok_id',       'Prüfplan/Testplan: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', NULL, '["CS-VP","CS-VB"]', 'Referenzdokumente', 80),
('projekt', 'testplan_version',      'Prüfplan/Testplan: Version (dieses Projekt)', 'text', NULL, 0, 'x.x', NULL, '["CS-VP","CS-VB"]', 'Referenzdokumente', 85),

-- Projektname/-bezeichnung: taucht als Freitext-Ersetzung in Fließtext-
-- Passagen auf (z.B. Kap. 3.4.1 "...bezogen auf das Projektbezeichnung...").
('projekt', 'projektbezeichnung', 'Projektbezeichnung', 'text', NULL, 0, NULL, NULL, '["CS-VP"]', 'Projekt', 5),

-- CS-VB verweist an > 10 Stellen im Fließtext auf "Validierungsplan XXXXX"
-- (5-X-Marker, immer als eigener Run) - dessen Dok-ID war bisher nirgends
-- erfasst, weil sie erst nach Freigabe des CS-VP feststeht und CS-VP selbst
-- sie nicht braucht. Neu fuer CS-VB.
('projekt', 'vp_dok_id',              'Validierungsplan (CS-VP): Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'erst nach Freigabe des CS-VP bekannt', '["CS-VB"]', 'Referenzdokumente', 90),
('projekt', 'vp_version',             'Validierungsplan (CS-VP): Version (dieses Projekt)', 'text', NULL, 0, 'x.x', NULL, '["CS-VB"]', 'Referenzdokumente', 95),

-- ---------------------------------------------------------------------------
-- Vorgehensweise bei der Validierung (Kap. 3 CS-VP) - Weichen für ganze
-- Kapitel/Absätze.
-- ---------------------------------------------------------------------------
-- vmp_erforderlich = nein -> Kap. 3.1 (Validierungsstrategie gemäß VMP)
-- kann komplett entfallen.
('projekt', 'vmp_erforderlich', 'VMP erforderlich? (Kap. 3.1)', 'ja_nein', NULL, 1, NULL, NULL, '["CS-VP"]', 'Vorgehensweise', 10),

-- digital_beteiligt = ja -> im KI-Abschnitt (Kap. 3.2) gilt der ServiceNow-
-- Risk-Profile-Prozess, der nachfolgende Absatz (KI-Kontrollmaßnahmen/Risk
-- Profile Outcome/Maßnahmentabelle) entfällt dann. = nein -> dieser Absatz
-- bleibt (das ist die "anderenfalls"-Vorgehensweise aus dem Template).
('projekt', 'digital_beteiligt', 'Unterstützung durch Digital? (Kap. 3.2, KI)', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VP"]', 'Vorgehensweise', 20),

-- ---------------------------------------------------------------------------
-- Testkonzept (Kap. 3.4.1 / 3.7 CS-VP).
-- ---------------------------------------------------------------------------
-- urs_bereits_erstellt steuert "werden" (nein, zukünftig) vs. "wurden" (ja,
-- bereits erstellt) in "Es werden / wurden User Requirement Specifications
-- (URS) erstellt...".
('projekt', 'urs_bereits_erstellt', 'URS bereits erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 10),

-- Geplante Phasen für "GMP-relevante Punkte werden einer CS Validierung
-- (DQ, IQ, OQ, PQ) unterzogen." - je Phase ein eigenes ja/nein-Feld statt
-- einer Mehrfachauswahl (kein neuer Datentyp nötig, gleiches Muster wie die
-- übrigen ja/nein-Felder).
('projekt', 'phase_dq_geplant',  'Phase DQ geplant?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 20),
('projekt', 'phase_iq_geplant',  'Phase IQ geplant?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 21),
('projekt', 'phase_oq_geplant',  'Phase OQ geplant?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 22),
('projekt', 'phase_pq_geplant',  'Phase PQ geplant?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 23),
('projekt', 'phase_ppq_geplant', 'Phase PPQ geplant?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 24),

-- gep_pruefung_erforderlich = nein -> Absatz "GEP-relevante Punkte können
-- geprüft werden..." entfällt.
('projekt', 'gep_pruefung_erforderlich', 'GEP-Punkte sollen geprüft werden?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 30),

('projekt', 'testplan_art', 'Testplan', 'auswahl',
 '[{"wert":"separat_freigegeben","erklaerung":"Testplan wird separat vor Beginn der Testphase freigegeben."},
   {"wert":"als_anhang","erklaerung":"Testplan wird als Anhang zu diesem Validierungsplan freigegeben (TM + RA liegen bereits vollständig vor)."},
   {"wert":"integriert_im_vp","erklaerung":"Testplan ist in diesem Validierungsplan integriert (TM + RA liegen bereits vollständig vor)."}]',
 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 40),

('projekt', 'testdurchfuehrung_art', 'Durchführung von Tests', 'auswahl',
 '[{"wert":"lieferant_ergebnisse_uebernehmen","erklaerung":"Übernahme von Testergebnissen/Testprotokollen des Lieferanten (Vollständigkeit/Richtigkeit/GxP-Konformität ist sicherzustellen, Dokumente werden im V-Plan/Testplan gelistet)."},
   {"wert":"lieferant_durchfuehrung_sanofi_aufsicht","erklaerung":"Durchführung durch Hersteller/Lieferant unter Aufsicht von Sanofi, anschließend durch Sanofi geprüft und gegengezeichnet."}]',
 0, NULL, NULL, '["CS-VP"]', 'Testkonzept', 50),

-- ---------------------------------------------------------------------------
-- Verantwortlichkeiten je Dokumenttyp (Tabelle "Dokumententyp/
-- Verantwortlichkeit") + Kap. 3.7.5 IQ-Durchführung ("<<Lieferant/Sanofi>>").
-- ---------------------------------------------------------------------------
('projekt', 'verantwortlich_funktionsspezifikation', 'Verantwortlich: Funktionsspezifikation', 'auswahl', '["Lieferant","Sanofi"]', 0, NULL, NULL, '["CS-VP"]', 'Verantwortlichkeiten je Dokument', 10),
('projekt', 'verantwortlich_hds', 'Verantwortlich: Hardware Designspezifikation (HDS)', 'auswahl', '["Lieferant","Sanofi"]', 0, NULL, NULL, '["CS-VP"]', 'Verantwortlichkeiten je Dokument', 20),
('projekt', 'verantwortlich_sds', 'Verantwortlich: Software Designspezifikation (SDS)', 'auswahl', '["Lieferant","Sanofi"]', 0, NULL, NULL, '["CS-VP"]', 'Verantwortlichkeiten je Dokument', 30),
('projekt', 'verantwortlich_ra', 'Verantwortlich: Risikoanalyse (RA)', 'auswahl', '["Lieferant","Sanofi"]', 0, NULL, NULL, '["CS-VP"]', 'Verantwortlichkeiten je Dokument', 40),
('projekt', 'verantwortlich_tm', 'Verantwortlich: Traceability-Matrix (TM)', 'auswahl', '["Lieferant","Sanofi"]', 0, NULL, NULL, '["CS-VP"]', 'Verantwortlichkeiten je Dokument', 50),
('projekt', 'verantwortlich_iq_testvorschriften', 'Verantwortlich: IQ-Testvorschriften', 'auswahl', '["Lieferant","Sanofi"]', 0, NULL, NULL, '["CS-VP"]', 'Verantwortlichkeiten je Dokument', 60),
('projekt', 'verantwortlich_iq_durchfuehrung', 'Verantwortlich: Durchführung der IQ (Applikation)', 'auswahl', '["Lieferant","Sanofi"]', 0, NULL, NULL, '["CS-VP"]', 'Verantwortlichkeiten je Dokument', 70);

-- ---------------------------------------------------------------------------
-- Versionshistorie-Eintrag: eine Zeile pro dokumentierter Vorversion mit
-- Change Control. Deckt vorerst nur die EINE übergeordnete "V2.0 (CC Nummer):
-- Beschreibung der Änderung, die die Versionierung des V-Plans erforderlich
-- macht"-Zeile ab. Der CS-Validierungsplan hat daneben noch 10 weitere,
-- kapitelspezifische "V2.0 (CC Nummer): ..."-Zeilen (Systembewertung,
-- Verantwortlichkeiten, Lieferanten, Risikoanalyse, DQ, Traceability Matrix,
-- IQ, OQ, PQ) - je mit eigener Ja/Nein-Alternative + Begründungstext. Ob die
-- ebenfalls strukturiert (je Kapitel ein eigener Eintrag) statt weiterhin
-- per Hand erfasst werden sollen, ist eine offene Frage (siehe Rückmeldung
-- an den Nutzer) - aktuell bewusst nicht abgebildet, um das Modell nicht
-- vorzeitig zu verkomplizieren.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('versionshistorie_eintrag', 'version',      'Version',                 'text', NULL, 1, 'x.x, z.B. 2.0', NULL, '["CS-VP","CS-VB"]', NULL, 10),
('versionshistorie_eintrag', 'cc_nummer',    'Change-Control-Nummer',   'text', NULL, 1, NULL, NULL, '["CS-VP","CS-VB"]', NULL, 20),
('versionshistorie_eintrag', 'beschreibung', 'Beschreibung der Änderung', 'mehrzeiliger_text', NULL, 1, NULL, NULL, '["CS-VP","CS-VB"]', NULL, 30);

-- ---------------------------------------------------------------------------
-- Verantwortlichkeit des Lieferanten (Kap. 2.2 CS-VP, "Die Fa. <<MUSTER>>
-- ist verantwortlich für: ..."-Aufzählung). Liste statt fixer Checkboxen,
-- weil laut Nutzer erweiterbar sein soll - freitext_erlaubt=1 deckt "eigene,
-- nicht vorgesehene Verantwortlichkeit" ab, ohne die Optionsliste selbst
-- ändern zu müssen. Eine Zeile pro ausgewählter/ergänzter Verantwortlichkeit,
-- verknüpft mit 'projekt' über eine relation (analog zu Anforderung/Risiko/
-- Prüfschritt).
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, freitext_erlaubt, benoetigt_fuer, gruppe, sortierung) VALUES
('lieferant_verantwortlichkeit', 'beschreibung', 'Verantwortlichkeit', 'auswahl',
 '["die Erstellung der Spezifikationen","die technische Umsetzung der Anforderungen","die ordnungsgemäße Installation des Systems","die Durchführung der Validierung","die Schulung des Sanofi-Personals am System"]',
 1, NULL, NULL, 1, '["CS-VP"]', NULL, 10);

-- ---------------------------------------------------------------------------
-- CS-VB Kap. 4.2/4.7/4.8/4.9/4.10 (DQ/IQ/OQ/PQ/PPQ): steuert je Phase, ob der
-- "offene Anforderungen aufgetreten"- oder der "keine aufgetreten"-Absatz
-- stehen bleibt (Nutzer-Rückmeldung 04.09.: das lässt sich als Abfragefeld
-- modellieren statt als nicht befüllbare Ergebnis-Prosa).
-- VEREINFACHUNG (bewusst, siehe docs/fvb_alle_fuellbaren_stellen.md): bei IQ
-- gibt es im Template eigentlich 3 Varianten (keine / aufgetreten+behoben
-- bis PQ / aufgetreten+unkritisch+per CC nachverfolgt) - hier nur binär
-- (keine / aufgetreten) abgebildet, die "unkritisch"-Variante bleibt Text.
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('projekt', 'dq_offene_anforderungen', 'DQ: offene Anforderungen aufgetreten?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse', 10),
('projekt', 'iq_offene_anforderungen',  'IQ: offene Anforderungen aufgetreten?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse', 20),
('projekt', 'oq_offene_anforderungen',  'OQ: offene Anforderungen aufgetreten?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse', 30),
('projekt', 'pq_offene_anforderungen',  'PQ: offene Anforderungen aufgetreten?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse', 40),
('projekt', 'ppq_offene_anforderungen', 'PPQ: offene Anforderungen aufgetreten?', 'ja_nein', NULL, 0, NULL, 'nur wenn ppq_durchgefuehrt = ja', '["CS-VB"]', 'Validierungsergebnisse', 51),

-- Ausführungs-Tatsache (nicht zu verwechseln mit phase_ppq_geplant, das die
-- PLANUNG im CS-VP steuert): wurde PPQ am Ende tatsächlich durchgeführt?
-- nein -> ganzes PPQ-Kapitel im CS-VB entfällt.
('projekt', 'ppq_durchgefuehrt', 'PPQ tatsächlich durchgeführt? (Kap. 4.10 CS-VB)', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse', 50);

-- Kap. 3 CS-VB "Vorgehensweise bei der Validierung": EINZIGER "wie geplant /
-- angepasst"-Textbaustein im ganzen Dokument (Nutzer-Rückmeldung 04.09.:
-- nur vorhandene Textbausteine nutzen, keine pro Phase DQ/IQ/OQ/PQ/PPQ -
-- die gibt es im Template naemlich nicht, nur diesen EINEN, uebergreifenden).
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('projekt', 'vorgehensweise_wie_geplant', 'Validierung wie im CS-VP geplant durchgeführt? (Kap. 3 CS-VB)', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse', 60),
('projekt', 'vorgehensweise_anpassung_beschreibung', 'Beschreibung der Anpassung der Validierungsstrategie', 'mehrzeiliger_text', NULL, 0, NULL, 'nur wenn vorgehensweise_wie_geplant = nein', '["CS-VB"]', 'Validierungsergebnisse', 65);

-- ---------------------------------------------------------------------------
-- CS-VB Kap. 4.12 "Änderungen während der Validierung" / Tabelle 6
-- ("Änderungen / Change Requests"). Nutzer-Rückmeldung 04.09.: heißen
-- mittlerweile "Unexpected Event", werden mit QU-OPE-Nummer in QualiPSO
-- angelegt - eine Zeile pro Änderung, bis zu 5 (kein hartes Limit im Schema,
-- nur als Richtwert genannt). Liste statt Einzelfeld, analog zu
-- versionshistorie_eintrag/lieferant_verantwortlichkeit.
-- ---------------------------------------------------------------------------
INSERT INTO entity_types (key, label) VALUES
    ('unexpected_event', 'Änderung während der Validierung (Unexpected Event)');

INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('unexpected_event', 'dokumenten_nr', 'Dokumenten-Nr. (QU-OPE)', 'text', NULL, 1, 'QU-OPE-XXXXXX', NULL, '["CS-VB"]', NULL, 10),
('unexpected_event', 'titel',         'Titel', 'text', NULL, 1, NULL, NULL, '["CS-VB"]', NULL, 20),
('unexpected_event', 'version',       'Version', 'text', NULL, 0, 'x.x', NULL, '["CS-VB"]', NULL, 30);
