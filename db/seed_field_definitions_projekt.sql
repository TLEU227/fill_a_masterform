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

-- Update 06.09. (Nutzer-Feedback: "ein Pflichtfeld muss als erstes eine
-- Dok-ID des Dokumentes und Version sein"): eigene Gruppe 'Dokument' fuer
-- die Identitaet des jeweils gerade bearbeiteten Dokuments selbst, steht
-- laut GROUP_ORDER (app.js) als erste Gruppe im VP- bzw. VB-Tab - noch vor
-- Projekt-Stammdaten. vp_dok_id/vp_version sind dabei geteilt (CS-VP+CS-VB,
-- s.u.), vb_dok_id/vb_version nur CS-VB (der CS-VP hat keine "Referenz auf
-- sich selbst" noetig, seine eigene Dok-ID IST vp_dok_id).
('projekt', 'vb_dok_id',  'Dieser CS-Validierungsbericht: Dok-ID', 'text', NULL, 1, 'QU-OPE-XXXXXXX', NULL, '["CS-VB"]', 'Dokument', 1),
('projekt', 'vb_version', 'Dieser CS-Validierungsbericht: Version', 'text', NULL, 1, 'x.x', NULL, '["CS-VB"]', 'Dokument', 5),

-- CS-VB verweist an > 10 Stellen im Fließtext auf "Validierungsplan XXXXX"
-- (5-X-Marker, immer als eigener Run) - dessen Dok-ID war bisher nirgends
-- erfasst, weil sie erst nach Freigabe des CS-VP feststeht und CS-VP selbst
-- sie nicht braucht. Neu fuer CS-VB.
-- Update 05.09. (Nutzer-Feedback): vp_dok_id/vp_version jetzt geteilt
-- (CS-VP+CS-VB) statt nur CS-VB - im VP-Tab wird die eigene Dok-ID erfasst,
-- sobald sie nach Erstellung/Freigabe bekannt ist (Pflichtfeld dort, im
-- selben Sinn wie systembewertung_dok_id ein "Muss" fuer die laufende
-- Referenzdokumentation ist); im VB-Tab erscheint sie automatisch wieder
-- (geteiltes Feld), weil der CS-VB staendig auf den CS-VP verweist.
-- Update 06.09.: Gruppe von 'Referenzdokumente' -> 'Dokument' (s.o.), damit
-- sie im VP-Tab ganz vorne steht; im VB-Tab landet sie dadurch direkt nach
-- vb_dok_id/vb_version - "erst die eigene Dokument-Identität, dann der
-- Verweis auf den zugehörigen CS-VP".
('projekt', 'vp_dok_id',              'Validierungsplan (CS-VP): Dok-ID (dieses Projekt)', 'text', NULL, 1, 'QU-OPE-XXXXXXX', 'im VP-Tab erfassen, sobald nach Erstellung/Freigabe bekannt - wird im VB-Tab als Referenz auf den Validierungsplan wiederverwendet', '["CS-VP","CS-VB"]', 'Dokument', 10),
('projekt', 'vp_version',             'Validierungsplan (CS-VP): Version (dieses Projekt)', 'text', NULL, 1, 'x.x', NULL, '["CS-VP","CS-VB"]', 'Dokument', 15),

-- Update 06.09. (Nutzer-Feedback: "die ganzen Personen sind projektrelevant
-- ... wir sollten wenigstens Rolle und Person erfassen, auch wenn wir sie
-- nicht in die Dokumente einbauen"): Tabelle "Dokumentenfreigabe" (Rolle/
-- Funktion/Beschreibung) ist in CS-VP UND CS-VB identisch (6 Rollenzeilen),
-- deshalb geteiltes Feld. Bewusst NICHT dieselben Felder wie
-- system.rolle_* (Personen-Gruppe, aktuell versteckt) - die gehoeren zur
-- Systembewertung (QU-MT-0001344) und sind system-, nicht projektbezogen;
-- die Rollenbezeichnungen der beiden Tabellen ueberschneiden sich nur
-- teilweise ("Projektleiter/SME" als EINE Zeile gibt es nur hier).
-- Reine Datenerfassung (siehe Konvention): wird aktuell NICHT ins .docx
-- geschrieben (Nutzer-Entscheidung 04.09. bei Tabelle 1 Dokumentenfreigabe:
-- "dort brauchen keine Namen hinterlegt zu werden, die Tabelle kann so
-- bleiben wie sie ist") - dient nur der eigenen Nachverfolgung.
('projekt', 'df_autor_cq',               'Autor: C&Q (Commissioning & Qualification)', 'person_referenz', NULL, 0, NULL, 'wird aktuell nicht ins Dokument übernommen, s. Kommentar in der Seed-Datei', '["CS-VP","CS-VB"]', 'Personen (Dokumentenfreigabe)', 1),
('projekt', 'df_pruefer_projektleiter_sme', 'Prüfer: Projektleiter/SME', 'person_referenz', NULL, 0, NULL, NULL, '["CS-VP","CS-VB"]', 'Personen (Dokumentenfreigabe)', 2),
('projekt', 'df_pruefer_tso',            'Prüfer: Technical System Owner (TSO)', 'person_referenz', NULL, 0, NULL, NULL, '["CS-VP","CS-VB"]', 'Personen (Dokumentenfreigabe)', 3),
('projekt', 'df_pruefer_bso',            'Prüfer: Business System Owner (BSO)', 'person_referenz', NULL, 0, NULL, NULL, '["CS-VP","CS-VB"]', 'Personen (Dokumentenfreigabe)', 4),
('projekt', 'df_freigeber_bqr',          'Freigeber: Business Quality Representative (BQR)', 'person_referenz', NULL, 0, NULL, NULL, '["CS-VP","CS-VB"]', 'Personen (Dokumentenfreigabe)', 5),
('projekt', 'df_freigeber_csq',          'Freigeber: Computerized System Quality Expert (CSQ)', 'person_referenz', NULL, 0, NULL, NULL, '["CS-VP","CS-VB"]', 'Personen (Dokumentenfreigabe)', 6),

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
('projekt', 'dq_offene_anforderungen', 'DQ: offene Anforderungen aufgetreten?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: DQ', 10),
('projekt', 'iq_offene_anforderungen',  'IQ: offene Anforderungen aufgetreten?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: IQ', 20),
('projekt', 'oq_offene_anforderungen',  'OQ: offene Anforderungen aufgetreten?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: OQ', 30),
('projekt', 'pq_offene_anforderungen',  'PQ: offene Anforderungen aufgetreten?',  'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: PQ', 40),
('projekt', 'ppq_offene_anforderungen', 'PPQ: offene Anforderungen aufgetreten?', 'ja_nein', NULL, 0, NULL, 'nur wenn ppq_durchgefuehrt = ja', '["CS-VB"]', 'Validierungsergebnisse: PPQ', 51),

-- Ausführungs-Tatsache (nicht zu verwechseln mit phase_ppq_geplant, das die
-- PLANUNG im CS-VP steuert): wurde PPQ am Ende tatsächlich durchgeführt?
-- nein -> ganzes PPQ-Kapitel im CS-VB entfällt.
('projekt', 'ppq_durchgefuehrt', 'PPQ tatsächlich durchgeführt? (Kap. 4.10 CS-VB)', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: PPQ', 50);

-- Kap. 3 CS-VB "Vorgehensweise bei der Validierung": EINZIGER "wie geplant /
-- angepasst"-Textbaustein im ganzen Dokument (Nutzer-Rückmeldung 04.09.:
-- nur vorhandene Textbausteine nutzen, keine pro Phase DQ/IQ/OQ/PQ/PPQ -
-- die gibt es im Template naemlich nicht, nur diesen EINEN, uebergreifenden).
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('projekt', 'vorgehensweise_wie_geplant', 'Validierung wie im CS-VP geplant durchgeführt? (Kap. 3 CS-VB)', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: Vorgehensweise & Testprozess', 60),
('projekt', 'vorgehensweise_anpassung_beschreibung', 'Beschreibung der Anpassung der Validierungsstrategie', 'mehrzeiliger_text', NULL, 0, NULL, 'nur wenn vorgehensweise_wie_geplant = nein', '["CS-VB"]', 'Validierungsergebnisse: Vorgehensweise & Testprozess', 65);

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

-- ---------------------------------------------------------------------------
-- CS-VB: vollständige Inventur aller Entweder-Oder-Textstellen (Stand 05.09.).
-- Alle Felder hier bilden "unveraendert (wie im CS-VP geplant) vs. waehrend
-- der Validierung geaendert/angepasst"-Entscheidungen ab - dasselbe
-- Grundmuster wie vorgehensweise_wie_geplant oben, nur an anderen Stellen
-- im Dokument. Bei einigen Stellen (Verantwortlichkeiten, Verantwort-
-- lichkeiten des Lieferanten) fehlt im Template das Wort "Oder" zwischen
-- den beiden Absaetzen - inhaltlich sind es trotzdem echte Alternativen
-- (widerspruechlich, beides gleichzeitig zu behaupten), daher gleiche
-- ja/nein-Logik wie bei den expliziten "Oder"-Stellen.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
-- Kap. 1.4 Systembeschreibung (hat "Oder:" im Template)
('projekt', 'systembeschreibung_geaendert', 'Systembeschreibung/-struktur/-komponenten/Schnittstellen gegenüber CS-VP geändert?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: Systembeschreibung & Verantwortlichkeiten', 70),
('projekt', 'systembeschreibung_aenderung_beschreibung', 'Beschreibung der Änderung der Systemstruktur/des Datenflusses', 'mehrzeiliger_text', NULL, 0, NULL, 'nur wenn systembeschreibung_geaendert = ja', '["CS-VB"]', 'Validierungsergebnisse: Systembeschreibung & Verantwortlichkeiten', 71),
-- Kap. 2.1 Verantwortlichkeiten (im Template OHNE "Oder", aber inhaltlich Alternative)
('projekt', 'verantwortlichkeiten_geaendert', 'Verantwortlichkeiten (Kap. 2.1) gegenüber CS-VP geändert?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: Systembeschreibung & Verantwortlichkeiten', 72),
('projekt', 'verantwortlichkeiten_aenderung_beschreibung', 'Beschreibung der Änderung der Verantwortlichkeiten', 'mehrzeiliger_text', NULL, 0, NULL, 'nur wenn verantwortlichkeiten_geaendert = ja', '["CS-VB"]', 'Validierungsergebnisse: Systembeschreibung & Verantwortlichkeiten', 73),
-- Kap. 2.2 Verantwortlichkeiten des/der Lieferanten (im Template OHNE "Oder")
('projekt', 'lieferanten_verantwortlichkeiten_geaendert', 'Verantwortlichkeiten des/der Lieferanten (Kap. 2.2) gegenüber CS-VP geändert?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: Systembeschreibung & Verantwortlichkeiten', 74),
('projekt', 'lieferanten_verantwortlichkeiten_aenderung_beschreibung', 'Beschreibung der Änderung der Lieferanten-Verantwortlichkeiten', 'mehrzeiliger_text', NULL, 0, NULL, 'nur wenn lieferanten_verantwortlichkeiten_geaendert = ja', '["CS-VB"]', 'Validierungsergebnisse: Systembeschreibung & Verantwortlichkeiten', 75),
-- Kap. 2.2.1 Lieferantenbewertung (hat "Oder:") - steuert ob Tabelle 5 ueberhaupt befuellt wird
('projekt', 'lieferantenbewertung_neu_durchgefuehrt', 'Lieferantenbewertung im Rahmen DIESER Validierung neu durchgeführt (statt nur Verweis auf CS-VP)?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: Systembeschreibung & Verantwortlichkeiten', 76),
-- Kap. 3.x Testprozess (hat "Oder:")
('projekt', 'testprozess_angepasst', 'Testprozess während der Validierung angepasst (statt Standardtestvorschriften)?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: Vorgehensweise & Testprozess', 77),
('projekt', 'testprozess_anpassung_beschreibung', 'Beschreibung der Anpassung des Testprozesses', 'mehrzeiliger_text', NULL, 0, NULL, 'nur wenn testprozess_angepasst = ja', '["CS-VB"]', 'Validierungsergebnisse: Vorgehensweise & Testprozess', 78),
-- Kap. 4.7 IQ: dritte Template-Variante (bisher immer gestrichen) jetzt echtes Unterfeld
('projekt', 'iq_offene_anforderungen_unkritisch', 'IQ: offene Anforderungen als unkritisch bewertet (statt bis PQ behoben)?', 'ja_nein', NULL, 0, NULL, 'nur wenn iq_offene_anforderungen = ja', '["CS-VB"]', 'Validierungsergebnisse: IQ', 79),
('projekt', 'iq_offene_anforderungen_beschreibung', 'Beschreibung der als unkritisch bewerteten offenen IQ-Anforderungen', 'mehrzeiliger_text', NULL, 0, NULL, 'nur wenn iq_offene_anforderungen_unkritisch = ja', '["CS-VB"]', 'Validierungsergebnisse: IQ', 80),
-- Kap. 4.8/4.9/4.10: direkte Tatsache statt Ableitung ueber phase_pq_geplant
-- (ein Abschlussbericht kann unabhaengig davon erstellt werden oder nicht)
('projekt', 'oq_abschlussbericht_erstellt', 'Eigener OQ-Abschlussbericht erstellt (statt Ergebnisse nur in diesem CS-VB)?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: OQ', 81),
('projekt', 'pq_abschlussbericht_erstellt', 'Eigener PQ-Abschlussbericht erstellt (statt Ergebnisse nur in diesem CS-VB)?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Validierungsergebnisse: PQ', 82),
('projekt', 'ppq_abschlussbericht_erstellt', 'Eigener PPQ-Abschlussbericht erstellt (statt Ergebnisse nur in diesem CS-VB)?', 'ja_nein', NULL, 0, NULL, 'nur wenn ppq_durchgefuehrt = ja', '["CS-VB"]', 'Validierungsergebnisse: PPQ', 83);

-- ---------------------------------------------------------------------------
-- CS-VB Tabelle 'Dokumentation Initial-Validierung' (Kap. 6.1): fuer die
-- restlichen Zeilen ohne Feld (Ergebnis-Dokumente: HDS/SDS/URS-TM/
-- Abschlussberichte/Testvorschriften/AFU) wird jetzt zusaetzlich abgefragt,
-- OB das Dokument ueberhaupt erstellt wurde (Nutzer-Anfrage 05.09.: 'Doks
-- die nicht erstellt wurden sollen ebenfalls mit angefragt werden. Wenn dort
-- die Entscheidung getroffen wurde dass sie nicht erstellt worden sind die
-- jeweiligen Zeilen aus der Tabelle zu entfernen'). Bewusst NICHT fuer die
-- bereits vorhandenen Zeilen Systembewertung/CS-VP/FDS/RA/IQ-OQ-Testplan -
-- diese sind fuer JEDE GxP-Systemvalidierung zwingende Grundlagendokumente,
-- ein 'nicht erstellt' ist dort kein realistischer Fall. OQ/PQ-Abschluss-
-- bericht: 'erstellt?'-Feld existiert schon (Kap. 4.8/4.9 Entweder-Oder),
-- hier nur Dok-ID/Version ergaenzt statt Duplikat.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('projekt', 'hds_erstellt', 'Hardware Designspezifikation (HDS): erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 100),
('projekt', 'hds_dok_id', 'Hardware Designspezifikation (HDS): Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn hds_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 101),
('projekt', 'hds_version', 'Hardware Designspezifikation (HDS): Version', 'text', NULL, 0, 'x.x', 'nur wenn hds_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 102),
('projekt', 'sds_erstellt', 'Software Designspezifikation (SDS): erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 110),
('projekt', 'sds_dok_id', 'Software Designspezifikation (SDS): Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn sds_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 111),
('projekt', 'sds_version', 'Software Designspezifikation (SDS): Version', 'text', NULL, 0, 'x.x', 'nur wenn sds_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 112),
('projekt', 'urs_tm_erstellt', 'URS/Traceability-Matrix: erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 120),
('projekt', 'urs_tm_dok_id', 'URS/Traceability-Matrix: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn urs_tm_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 121),
('projekt', 'urs_tm_version', 'URS/Traceability-Matrix: Version', 'text', NULL, 0, 'x.x', 'nur wenn urs_tm_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 122),
('projekt', 'dq_abschlussbericht_erstellt', 'DQ Abschlussbericht: erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 130),
('projekt', 'dq_abschlussbericht_dok_id', 'DQ Abschlussbericht: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn dq_abschlussbericht_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 131),
('projekt', 'dq_abschlussbericht_version', 'DQ Abschlussbericht: Version', 'text', NULL, 0, 'x.x', 'nur wenn dq_abschlussbericht_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 132),
('projekt', 'iq_testvorschriften_erstellt', 'IQ-Testvorschriften (projektspezifisch): erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 140),
('projekt', 'iq_testvorschriften_dok_id', 'IQ-Testvorschriften (projektspezifisch): Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn iq_testvorschriften_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 141),
('projekt', 'iq_testvorschriften_version', 'IQ-Testvorschriften (projektspezifisch): Version', 'text', NULL, 0, 'x.x', 'nur wenn iq_testvorschriften_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 142),
('projekt', 'iq_abschlussbericht_erstellt', 'IQ-Abschlussbericht: erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 150),
('projekt', 'iq_abschlussbericht_dok_id', 'IQ-Abschlussbericht: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn iq_abschlussbericht_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 151),
('projekt', 'iq_abschlussbericht_version', 'IQ-Abschlussbericht: Version', 'text', NULL, 0, 'x.x', 'nur wenn iq_abschlussbericht_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 152),
('projekt', 'oq_testvorschriften_erstellt', 'OQ-Testvorschriften (projektspezifisch): erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 160),
('projekt', 'oq_testvorschriften_dok_id', 'OQ-Testvorschriften (projektspezifisch): Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn oq_testvorschriften_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 161),
('projekt', 'oq_testvorschriften_version', 'OQ-Testvorschriften (projektspezifisch): Version', 'text', NULL, 0, 'x.x', 'nur wenn oq_testvorschriften_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 162),
('projekt', 'pq_testplan_erstellt', 'PQ-Testplan: erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 170),
('projekt', 'pq_testplan_dok_id', 'PQ-Testplan: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn pq_testplan_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 171),
('projekt', 'pq_testplan_version', 'PQ-Testplan: Version', 'text', NULL, 0, 'x.x', 'nur wenn pq_testplan_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 172),
('projekt', 'afu_erstellt', 'Authorisation for Use (AFU): erstellt?', 'ja_nein', NULL, 0, NULL, NULL, '["CS-VB"]', 'Referenzdokumente', 180),
('projekt', 'afu_dok_id', 'Authorisation for Use (AFU): Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn afu_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 181),
('projekt', 'afu_version', 'Authorisation for Use (AFU): Version', 'text', NULL, 0, 'x.x', 'nur wenn afu_erstellt = ja', '["CS-VB"]', 'Referenzdokumente', 182),
('projekt', 'oq_abschlussbericht_dok_id', 'OQ-Abschlussbericht: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn oq_abschlussbericht_erstellt = ja (wiederverwendetes Feld aus Kap. 4.8/4.9)', '["CS-VB"]', 'Referenzdokumente', 190),
('projekt', 'oq_abschlussbericht_version', 'OQ-Abschlussbericht: Version', 'text', NULL, 0, 'x.x', 'nur wenn oq_abschlussbericht_erstellt = ja (wiederverwendetes Feld aus Kap. 4.8/4.9)', '["CS-VB"]', 'Referenzdokumente', 191),
('projekt', 'pq_abschlussbericht_dok_id', 'PQ-Abschlussbericht: Dok-ID (dieses Projekt)', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn pq_abschlussbericht_erstellt = ja (wiederverwendetes Feld aus Kap. 4.8/4.9)', '["CS-VB"]', 'Referenzdokumente', 200),
('projekt', 'pq_abschlussbericht_version', 'PQ-Abschlussbericht: Version', 'text', NULL, 0, 'x.x', 'nur wenn pq_abschlussbericht_erstellt = ja (wiederverwendetes Feld aus Kap. 4.8/4.9)', '["CS-VB"]', 'Referenzdokumente', 201);

-- ---------------------------------------------------------------------------
-- CS-VB Tabelle 'Weitere Validierungsdokumente' (Kap. 6.2, 18 Prüfpunkte).
-- Nutzer-Anfrage 05.09.: pro Prüfpunkt abfragen, ob das Dokument erforderlich
-- war. Wenn nein -> Begründung (fuellt Spalte 'Nachweis/Begründung'). Wenn
-- ja -> Dokumenten-ID (+ optional Titel) in dieselbe Spalte. Die 'Erforder-
-- lich'-Checkbox der PPQ-Zeile nutzt das bereits vorhandene Feld
-- ppq_durchgefuehrt (Kap. 4.10) wieder, statt ein Duplikat anzulegen.
--
-- Update 05.09. (Nutzer-Anfrage): die Begründungsfelder sind jetzt 'auswahl'
-- mit 1-2 vorformulierten, fachlich plausibelsten Standardbegründungen je
-- Dokument (freitext_erlaubt=1 als Fluchtoption fuer abweichende Faelle).
-- Beim Einfuegen in den Fließtext wird die gewaehlte Begruendung - anders
-- als sonstige, aus der DB uebernommene FAKTEN (schwarz) - in BLAU (548DD4)
-- markiert: das entspricht der Farbkonvention der Vorlage selbst (siehe
-- Legendebox: 'Blaue Schrift = Bei Bedarf anzupassen. Vor Freigabe ist die
-- Schrift schwarz zu formatieren') - es ist ein Vorschlag, keine gesicherte
-- Tatsache, und muss vor Freigabe von einem Menschen bestaetigt werden.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, freitext_erlaubt, benoetigt_fuer, gruppe, sortierung) VALUES
('projekt', 'wvd_datenflussdiagramm_erforderlich', 'Weitere Validierungsdokumente: Datenflussdiagramm - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 10),
('projekt', 'wvd_datenflussdiagramm_dok_id', 'Weitere Validierungsdokumente: Datenflussdiagramm - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_datenflussdiagramm_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 11),
('projekt', 'wvd_datenflussdiagramm_titel', 'Weitere Validierungsdokumente: Datenflussdiagramm - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_datenflussdiagramm_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 12),
('projekt', 'wvd_datenflussdiagramm_begruendung', 'Weitere Validierungsdokumente: Datenflussdiagramm - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Das System besteht aus einer einzelnen, in sich abgeschlossenen Komponente ohne Datenaustausch mit anderen Systemen; ein Datenflussdiagramm ist daher nicht erforderlich."]', 0, NULL, 'nur wenn wvd_datenflussdiagramm_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 13),
('projekt', 'wvd_audit_trail_review_konzept_erforderlich', 'Weitere Validierungsdokumente: Audit Trail Review Konzept - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 20),
('projekt', 'wvd_audit_trail_review_konzept_dok_id', 'Weitere Validierungsdokumente: Audit Trail Review Konzept - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_audit_trail_review_konzept_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 21),
('projekt', 'wvd_audit_trail_review_konzept_titel', 'Weitere Validierungsdokumente: Audit Trail Review Konzept - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_audit_trail_review_konzept_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 22),
('projekt', 'wvd_audit_trail_review_konzept_begruendung', 'Weitere Validierungsdokumente: Audit Trail Review Konzept - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Das System verfügt über keine elektronische Aufzeichnungsfunktion mit Audit Trail; ein Audit Trail Review Konzept ist daher nicht erforderlich.", "Es liegt bereits ein gültiges Audit Trail Review Konzept aus einem vorangegangenen Projekt vor, das durch dieses Change Control unverändert weiter gültig ist."]', 0, NULL, 'nur wenn wvd_audit_trail_review_konzept_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 23),
('projekt', 'wvd_berechtigungskonzept_erforderlich', 'Weitere Validierungsdokumente: Berechtigungskonzept - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 30),
('projekt', 'wvd_berechtigungskonzept_dok_id', 'Weitere Validierungsdokumente: Berechtigungskonzept - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_berechtigungskonzept_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 31),
('projekt', 'wvd_berechtigungskonzept_titel', 'Weitere Validierungsdokumente: Berechtigungskonzept - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_berechtigungskonzept_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 32),
('projekt', 'wvd_berechtigungskonzept_begruendung', 'Weitere Validierungsdokumente: Berechtigungskonzept - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Das System verfügt über keine individuellen Benutzerkonten bzw. keine rollenbasierte Zugriffsdifferenzierung; ein Berechtigungskonzept ist daher nicht erforderlich."]', 0, NULL, 'nur wenn wvd_berechtigungskonzept_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 33),
('projekt', 'wvd_trainingsplan_erforderlich', 'Weitere Validierungsdokumente: Trainingsplan - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 40),
('projekt', 'wvd_trainingsplan_dok_id', 'Weitere Validierungsdokumente: Trainingsplan - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_trainingsplan_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 41),
('projekt', 'wvd_trainingsplan_titel', 'Weitere Validierungsdokumente: Trainingsplan - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_trainingsplan_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 42),
('projekt', 'wvd_trainingsplan_begruendung', 'Weitere Validierungsdokumente: Trainingsplan - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Es werden keine neuen Funktionen eingeführt und kein neues Personal am System eingesetzt; ein zusätzlicher Trainingsplan ist daher nicht erforderlich."]', 0, NULL, 'nur wenn wvd_trainingsplan_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 43),
-- 'Erforderlich' fuer PPQ-Zeile: wiederverwendet ppq_durchgefuehrt (Kap. 4.10), kein eigenes Feld.
('projekt', 'wvd_ppq_dok_id', 'Weitere Validierungsdokumente: Process Performance Qualification (PPQ) - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn ppq_durchgefuehrt = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 51),
('projekt', 'wvd_ppq_titel', 'Weitere Validierungsdokumente: Process Performance Qualification (PPQ) - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn ppq_durchgefuehrt = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 52),
('projekt', 'wvd_ppq_begruendung', 'Weitere Validierungsdokumente: Process Performance Qualification (PPQ) - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["PPQ für dieses Projekt nicht durchgeführt (siehe Kap. 4.10)."]', 0, NULL, 'nur wenn ppq_durchgefuehrt = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 53),
('projekt', 'wvd_user_process_monitoring_erforderlich', 'Weitere Validierungsdokumente: User Process Monitoring (UPM) - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 60),
('projekt', 'wvd_user_process_monitoring_dok_id', 'Weitere Validierungsdokumente: User Process Monitoring (UPM) - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_user_process_monitoring_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 61),
('projekt', 'wvd_user_process_monitoring_titel', 'Weitere Validierungsdokumente: User Process Monitoring (UPM) - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_user_process_monitoring_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 62),
('projekt', 'wvd_user_process_monitoring_begruendung', 'Weitere Validierungsdokumente: User Process Monitoring (UPM) - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Im Rahmen der Risikobewertung wurde kein erhöhtes Datenintegritätsrisiko identifiziert, das ein gesondertes User Process Monitoring erfordert; der Standard-Audit-Trail ist ausreichend."]', 0, NULL, 'nur wenn wvd_user_process_monitoring_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 63),
('projekt', 'wvd_datenmigration_erforderlich', 'Weitere Validierungsdokumente: Datenmigration (DM) - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 70),
('projekt', 'wvd_datenmigration_dok_id', 'Weitere Validierungsdokumente: Datenmigration (DM) - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_datenmigration_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 71),
('projekt', 'wvd_datenmigration_titel', 'Weitere Validierungsdokumente: Datenmigration (DM) - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_datenmigration_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 72),
('projekt', 'wvd_datenmigration_begruendung', 'Weitere Validierungsdokumente: Datenmigration (DM) - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Im Rahmen dieses Change Controls werden keine Bestandsdaten aus einem Vorgängersystem übernommen; eine Datenmigration ist daher nicht erforderlich."]', 0, NULL, 'nur wenn wvd_datenmigration_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 73),
('projekt', 'wvd_wartung_monitoring_erforderlich', 'Weitere Validierungsdokumente: Festlegung Wartung und Monitoring - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 80),
('projekt', 'wvd_wartung_monitoring_dok_id', 'Weitere Validierungsdokumente: Festlegung Wartung und Monitoring - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_wartung_monitoring_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 81),
('projekt', 'wvd_wartung_monitoring_titel', 'Weitere Validierungsdokumente: Festlegung Wartung und Monitoring - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_wartung_monitoring_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 82),
('projekt', 'wvd_wartung_monitoring_begruendung', 'Weitere Validierungsdokumente: Festlegung Wartung und Monitoring - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Die bestehenden Festlegungen zu Wartung und Monitoring aus dem laufenden Regelbetrieb bleiben durch dieses Change Control unverändert gültig."]', 0, NULL, 'nur wenn wvd_wartung_monitoring_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 83),
('projekt', 'wvd_archivierung_daten_erforderlich', 'Weitere Validierungsdokumente: Prozedur zur Archivierung der Daten - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 90),
('projekt', 'wvd_archivierung_daten_dok_id', 'Weitere Validierungsdokumente: Prozedur zur Archivierung der Daten - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_archivierung_daten_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 91),
('projekt', 'wvd_archivierung_daten_titel', 'Weitere Validierungsdokumente: Prozedur zur Archivierung der Daten - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_archivierung_daten_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 92),
('projekt', 'wvd_archivierung_daten_begruendung', 'Weitere Validierungsdokumente: Prozedur zur Archivierung der Daten - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Die bestehende Prozedur zur Archivierung der Daten aus dem laufenden Regelbetrieb bleibt durch dieses Change Control unverändert gültig."]', 0, NULL, 'nur wenn wvd_archivierung_daten_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 93),
('projekt', 'wvd_backup_restore_konzept_erforderlich', 'Weitere Validierungsdokumente: Back-up & Restore Konzept - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 100),
('projekt', 'wvd_backup_restore_konzept_dok_id', 'Weitere Validierungsdokumente: Back-up & Restore Konzept - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_backup_restore_konzept_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 101),
('projekt', 'wvd_backup_restore_konzept_titel', 'Weitere Validierungsdokumente: Back-up & Restore Konzept - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_backup_restore_konzept_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 102),
('projekt', 'wvd_backup_restore_konzept_begruendung', 'Weitere Validierungsdokumente: Back-up & Restore Konzept - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Das bestehende Back-up & Restore Konzept aus dem laufenden Regelbetrieb bleibt durch dieses Change Control unverändert gültig.", "Die Datensicherung erfolgt vollständig über die zentrale IT-Infrastruktur gemäß den geltenden IT-Sicherheits-SOPs; ein systemspezifisches Konzept ist nicht erforderlich."]', 0, NULL, 'nur wenn wvd_backup_restore_konzept_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 103),
('projekt', 'wvd_business_continuity_plan_erforderlich', 'Weitere Validierungsdokumente: Business Continuity Plan - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 110),
('projekt', 'wvd_business_continuity_plan_dok_id', 'Weitere Validierungsdokumente: Business Continuity Plan - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_business_continuity_plan_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 111),
('projekt', 'wvd_business_continuity_plan_titel', 'Weitere Validierungsdokumente: Business Continuity Plan - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_business_continuity_plan_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 112),
('projekt', 'wvd_business_continuity_plan_begruendung', 'Weitere Validierungsdokumente: Business Continuity Plan - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Das System ist gemäß Risikobewertung nicht als geschäftskritisch eingestuft; ein Business Continuity Plan ist daher nicht erforderlich.", "Es liegt bereits ein gültiger Business Continuity Plan vor, der durch dieses Change Control unverändert weiter gültig ist."]', 0, NULL, 'nur wenn wvd_business_continuity_plan_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 113),
('projekt', 'wvd_incident_stoerungsmanagement_erforderlich', 'Weitere Validierungsdokumente: Incident- und Störungsmanagement - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 120),
('projekt', 'wvd_incident_stoerungsmanagement_dok_id', 'Weitere Validierungsdokumente: Incident- und Störungsmanagement - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_incident_stoerungsmanagement_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 121),
('projekt', 'wvd_incident_stoerungsmanagement_titel', 'Weitere Validierungsdokumente: Incident- und Störungsmanagement - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_incident_stoerungsmanagement_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 122),
('projekt', 'wvd_incident_stoerungsmanagement_begruendung', 'Weitere Validierungsdokumente: Incident- und Störungsmanagement - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Das bestehende Incident- und Störungsmanagement aus dem laufenden Regelbetrieb bleibt durch dieses Change Control unverändert gültig."]', 0, NULL, 'nur wenn wvd_incident_stoerungsmanagement_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 123),
('projekt', 'wvd_aenderungs_konfigurationsmanagement_erforderlich', 'Weitere Validierungsdokumente: Änderungs- und Konfigurationsmanagement - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 130),
('projekt', 'wvd_aenderungs_konfigurationsmanagement_dok_id', 'Weitere Validierungsdokumente: Änderungs- und Konfigurationsmanagement - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_aenderungs_konfigurationsmanagement_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 131),
('projekt', 'wvd_aenderungs_konfigurationsmanagement_titel', 'Weitere Validierungsdokumente: Änderungs- und Konfigurationsmanagement - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_aenderungs_konfigurationsmanagement_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 132),
('projekt', 'wvd_aenderungs_konfigurationsmanagement_begruendung', 'Weitere Validierungsdokumente: Änderungs- und Konfigurationsmanagement - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Das bestehende Änderungs- und Konfigurationsmanagement aus dem laufenden Regelbetrieb bleibt durch dieses Change Control unverändert gültig."]', 0, NULL, 'nur wenn wvd_aenderungs_konfigurationsmanagement_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 133),
('projekt', 'wvd_logbuch_system_erforderlich', 'Weitere Validierungsdokumente: Logbuch (Server, CS, Equipment, etc.) - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 140),
('projekt', 'wvd_logbuch_system_dok_id', 'Weitere Validierungsdokumente: Logbuch (Server, CS, Equipment, etc.) - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_logbuch_system_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 141),
('projekt', 'wvd_logbuch_system_titel', 'Weitere Validierungsdokumente: Logbuch (Server, CS, Equipment, etc.) - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_logbuch_system_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 142),
('projekt', 'wvd_logbuch_system_begruendung', 'Weitere Validierungsdokumente: Logbuch (Server, CS, Equipment, etc.) - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Für das System besteht keine Logbuchpflicht (kein physisches Equipment mit entsprechender Anforderung); ein Logbuch ist daher nicht erforderlich."]', 0, NULL, 'nur wenn wvd_logbuch_system_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 143),
('projekt', 'wvd_lieferantenbewertung_nachweis_erforderlich', 'Weitere Validierungsdokumente: Lieferantenbewertung - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 150),
('projekt', 'wvd_lieferantenbewertung_nachweis_dok_id', 'Weitere Validierungsdokumente: Lieferantenbewertung - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_lieferantenbewertung_nachweis_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 151),
('projekt', 'wvd_lieferantenbewertung_nachweis_titel', 'Weitere Validierungsdokumente: Lieferantenbewertung - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_lieferantenbewertung_nachweis_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 152),
('projekt', 'wvd_lieferantenbewertung_nachweis_begruendung', 'Weitere Validierungsdokumente: Lieferantenbewertung - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Für den/die Lieferanten liegt bereits eine gültige, innerhalb der Gültigkeitsfrist erfolgte Lieferantenbewertung aus einem vorangegangenen Projekt vor."]', 0, NULL, 'nur wenn wvd_lieferantenbewertung_nachweis_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 153),
('projekt', 'wvd_quality_agreement_erforderlich', 'Weitere Validierungsdokumente: Quality Agreement - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 160),
('projekt', 'wvd_quality_agreement_dok_id', 'Weitere Validierungsdokumente: Quality Agreement - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_quality_agreement_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 161),
('projekt', 'wvd_quality_agreement_titel', 'Weitere Validierungsdokumente: Quality Agreement - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_quality_agreement_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 162),
('projekt', 'wvd_quality_agreement_begruendung', 'Weitere Validierungsdokumente: Quality Agreement - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Mit dem/der Lieferanten besteht bereits ein gültiges Quality Agreement, das diesen Systemumfang abdeckt und durch dieses Change Control unverändert gültig bleibt."]', 0, NULL, 'nur wenn wvd_quality_agreement_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 163),
('projekt', 'wvd_bedienungsanweisungen_erforderlich', 'Weitere Validierungsdokumente: Anweisungen zur Bedienung des CS - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 170),
('projekt', 'wvd_bedienungsanweisungen_dok_id', 'Weitere Validierungsdokumente: Anweisungen zur Bedienung des CS - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_bedienungsanweisungen_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 171),
('projekt', 'wvd_bedienungsanweisungen_titel', 'Weitere Validierungsdokumente: Anweisungen zur Bedienung des CS - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_bedienungsanweisungen_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 172),
('projekt', 'wvd_bedienungsanweisungen_begruendung', 'Weitere Validierungsdokumente: Anweisungen zur Bedienung des CS - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Die Bedienung des Systems ändert sich gegenüber der Vorversion nicht; die bestehenden Anweisungen zur Bedienung bleiben unverändert gültig."]', 0, NULL, 'nur wenn wvd_bedienungsanweisungen_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 173),
('projekt', 'wvd_bedienungshandbuch_erforderlich', 'Weitere Validierungsdokumente: Handbuch mit Anleitungen zur Bedienung des CS - erforderlich?', 'ja_nein', NULL, 0, NULL, NULL, 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 180),
('projekt', 'wvd_bedienungshandbuch_dok_id', 'Weitere Validierungsdokumente: Handbuch mit Anleitungen zur Bedienung des CS - Dokumenten-ID', 'text', NULL, 0, 'QU-OPE-XXXXXXX', 'nur wenn wvd_bedienungshandbuch_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 181),
('projekt', 'wvd_bedienungshandbuch_titel', 'Weitere Validierungsdokumente: Handbuch mit Anleitungen zur Bedienung des CS - Titel (optional)', 'text', NULL, 0, NULL, 'nur wenn wvd_bedienungshandbuch_erforderlich = ja', 0, '["CS-VB"]', 'Weitere Validierungsdokumente', 182),
('projekt', 'wvd_bedienungshandbuch_begruendung', 'Weitere Validierungsdokumente: Handbuch mit Anleitungen zur Bedienung des CS - Begründung, warum nicht erforderlich (Vorschlag, vor Freigabe zu bestätigen/anzupassen)', 'auswahl', '["Die Bedienung des Systems ändert sich gegenüber der Vorversion nicht; das bestehende Handbuch bleibt unverändert gültig."]', 0, NULL, 'nur wenn wvd_bedienungshandbuch_erforderlich = nein', 1, '["CS-VB"]', 'Weitere Validierungsdokumente', 183);
