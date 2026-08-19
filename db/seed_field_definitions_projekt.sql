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
    ('projekt',               'Projekt'),
    ('versionshistorie_eintrag', 'Versionshistorie-Eintrag');

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

('projekt', 'ist_folgeprojekt',      'Folgeprojekt?',            'ja_nein', NULL, 1, NULL, NULL, '["CS-VP"]', 'Vorgängerprojekt', 10),
('projekt', 'vorgaenger_dok_id',     'Vorgänger-Dokument: Dok-ID', 'text', NULL, 0, NULL, 'nur wenn ist_folgeprojekt = ja', '["CS-VP"]', 'Vorgängerprojekt', 20),
('projekt', 'vorgaenger_version',    'Vorgänger-Dokument: Version', 'text', NULL, 0, 'x.x', 'nur wenn ist_folgeprojekt = ja', '["CS-VP"]', 'Vorgängerprojekt', 30),
('projekt', 'folgeversion',          'Folgeversion (FV) dieses Dokuments', 'text', NULL, 1, 'x.x - Vorschlag: 1.0 bei Erstprojekt, sonst Vorgänger-Version + 1, bei Bedarf überschreibbar', NULL, '["CS-VP"]', 'Vorgängerprojekt', 40),
('projekt', 'change_control_nummer', 'Change-Control-Nummer dieses Projekts', 'text', NULL, 0, 'z.B. CC-2024-001234', NULL, '["CS-VP","CS-VB"]', 'Vorgängerprojekt', 50),

-- Kap. 1.1/1.4 CS-VP: Hauptfunktion ist projektspezifisch (kann von Projekt
-- zu Projekt am selben System variieren), deshalb hier statt in der System-DB.
('projekt', 'hauptfunktion',         'Hauptfunktion des Systems (projektspezifisch)', 'mehrzeiliger_text', NULL, 0, NULL, NULL, '["CS-VP"]', 'Systembeschreibung', 10),

-- Kap. 1.4 / Tabelle "Mitgeltende Unterlagen" CS-VP: die zu DIESEM Projekt
-- gehörende Systembewertung (nicht notwendigerweise die im Excel-Import
-- gefundene - ein System kann mehrfach neu bewertet worden sein).
('projekt', 'systembewertung_dok_id', 'Systembewertung: Dok-ID (dieses Projekt)', 'text', NULL, 0, NULL, 'gemäß QU-MT-0001344', '["CS-VP"]', 'Referenzdokumente', 10),
('projekt', 'systembewertung_version', 'Systembewertung: Version (dieses Projekt)', 'text', NULL, 0, 'x.x', NULL, '["CS-VP"]', 'Referenzdokumente', 20);

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
('versionshistorie_eintrag', 'version',      'Version',                 'text', NULL, 1, 'x.x, z.B. 2.0', NULL, '["CS-VP"]', NULL, 10),
('versionshistorie_eintrag', 'cc_nummer',    'Change-Control-Nummer',   'text', NULL, 1, NULL, NULL, '["CS-VP"]', NULL, 20),
('versionshistorie_eintrag', 'beschreibung', 'Beschreibung der Änderung', 'mehrzeiliger_text', NULL, 1, NULL, NULL, '["CS-VP"]', NULL, 30);
