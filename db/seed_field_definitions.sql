-- ============================================================================
-- Start-Belegung: Objektarten + Felder
-- ============================================================================
-- Das ist eine erste, arbeitsfähige Auswahl an Feldern (nicht alle 123
-- Excel-Spalten) auf Basis der Analyse der Systembewertung und von
-- VP/VB/VQ/xQTP (siehe docs/analyse_*.md). Neue Felder können jederzeit
-- als weitere INSERT-Zeile ergänzt werden, ohne das Schema zu ändern.
-- ============================================================================

INSERT INTO entity_types (key, label) VALUES
    ('system',      'System'),
    ('anforderung', 'Anforderung (URS)'),
    ('risiko',      'Risiko (RA)'),
    ('pruefschritt','Prüfschritt (IQ/OQ/PQ)');

-- ---------------------------------------------------------------------------
-- System: Stammdaten
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, gruppe, sortierung) VALUES
('system', 'systemname',         'Systemname',            'text', NULL, 1, 'Stammdaten', 10),
('system', 'mlcs_id',            'MLCS-ID',                'text', NULL, 0, 'Stammdaten', 20),
('system', 'gebaeude',           'Gebäude',                'text', NULL, 0, 'Stammdaten', 30),
('system', 'bereich',            'Bereich/Betrieb',        'text', NULL, 0, 'Stammdaten', 40),
('system', 'anlage',             'Anlage',                 'text', NULL, 0, 'Stammdaten', 50),
('system', 'raum',               'Raum',                   'text', NULL, 0, 'Stammdaten', 60),
('system', 'kurzbeschreibung',   'Kurzbeschreibung',       'mehrzeiliger_text', NULL, 0, 'Stammdaten', 70),
('system', 'sw_name',            'Software-Name',          'text', NULL, 0, 'Stammdaten', 80),
('system', 'sw_version',         'Software-Version/Typ',   'text', NULL, 0, 'Stammdaten', 90),
('system', 'sw_hersteller',      'Software-Hersteller',    'text', NULL, 0, 'Stammdaten', 100),
('system', 'hersteller',         'Hersteller/Lieferant',   'text', NULL, 0, 'Stammdaten', 110),
('system', 'lieferantennummer',  'Lieferantennummer',      'text', NULL, 0, 'Stammdaten', 120);

-- ---------------------------------------------------------------------------
-- System: GxP-Bewertung (die Checkbox-Gruppen aus der Systembewertung,
-- jetzt als einzelne, saubere Auswahlfelder statt c/r-Spalten)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, gruppe, sortierung) VALUES
('system', 'gxp_relevant',       'GxP-relevant?',          'ja_nein', NULL, 1, 'GxP-Bewertung', 10),
('system', 'gxp_kritikalitaet',  'GxP-Kritikalität',       'auswahl', '["Critical","Major","Minor","N/A"]', 1, 'GxP-Bewertung', 20),
('system', 'geraetekategorie',  'Gerätekategorie (ISPE/GAMP)', 'auswahl', '["A","B1","B2","B3","C1","C2","N/A"]', 0, 'GxP-Bewertung', 30),
('system', 'gamp_kategorie',     'GAMP-5-Software-Kategorie', 'auswahl', '["1","3","4","5","N/A"]', 0, 'GxP-Bewertung', 40),
('system', 'systemtyp',          'Systemtyp',              'auswahl', '["CIS","CE"]', 0, 'GxP-Bewertung', 50),
('system', 'subtyp',             'Subtyp',                 'auswahl', '["CE-PCS","CE-LCE","CE-EE","N/A"]', 0, 'GxP-Bewertung', 60),
('system', 'testtiefe',          'Testtiefe',              'auswahl', '["Hoch","Mittel","Gering"]', 0, 'GxP-Bewertung', 70),
('system', 'eres_typ',           'Typ elektronischer Aufzeichnungen', 'auswahl', '["Typ 1","Typ 2","Typ 3","Typ 4","N/A"]', 0, 'GxP-Bewertung', 80),
('system', 'business_critical',  'Business critical?',    'ja_nein', NULL, 0, 'GxP-Bewertung', 90),
('system', 'vq_erforderlich',    'Vereinfachte Qualifizierung (VQ-SOP)?', 'ja_nein', NULL, 0, 'GxP-Bewertung', 100),
('system', 'val_erforderlich',   'Validierung (VAL-SOP)?', 'ja_nein', NULL, 0, 'GxP-Bewertung', 110);

-- ---------------------------------------------------------------------------
-- System: Rollen (wer hat die Systembewertung erstellt/geprüft/freigegeben)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, gruppe, sortierung) VALUES
('system', 'rolle_ersteller', 'Ersteller',   'text', NULL, 0, 'Rollen', 10),
('system', 'rolle_sme',       'SME',         'text', NULL, 0, 'Rollen', 20),
('system', 'rolle_si_pl',     'SI/PL',       'text', NULL, 0, 'Rollen', 30),
('system', 'rolle_tso',       'TSO',         'text', NULL, 0, 'Rollen', 40),
('system', 'rolle_bso',       'BSO',         'text', NULL, 0, 'Rollen', 50),
('system', 'rolle_bqr',       'BQR',         'text', NULL, 0, 'Rollen', 60),
('system', 'rolle_csq',       'CSQ',         'text', NULL, 0, 'Rollen', 70);

-- ---------------------------------------------------------------------------
-- System: Status/Nachverfolgung (die "final vs. draft"-Erkenntnis)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, gruppe, sortierung) VALUES
('system', 'dok_nummer',        'Dokumentnummer (Systembewertung)', 'text', NULL, 0, 'Status', 10),
('system', 'dok_version',       'Dokumentversion',        'text', NULL, 0, 'Status', 20),
('system', 'ist_aktuelle_version', 'Ist aktuelle Version?', 'ja_nein', NULL, 0, 'Status', 30);

-- ---------------------------------------------------------------------------
-- Anforderung (URS-Punkt) – für URS-Tabelle / Traceability Matrix
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, gruppe, sortierung) VALUES
('anforderung', 'urs_id',        'URS-ID',                 'text', NULL, 1, 'Anforderung', 10),
('anforderung', 'beschreibung',  'Anforderungsbeschreibung', 'mehrzeiliger_text', NULL, 1, 'Anforderung', 20),
('anforderung', 'gxp_relevant',  'GxP-relevant?',           'ja_nein', NULL, 0, 'Anforderung', 30),
('anforderung', 'quelle',        'Entspricht URS in (DS/PH)', 'text', NULL, 0, 'Anforderung', 40);

-- ---------------------------------------------------------------------------
-- Risiko (RA-Eintrag)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, gruppe, sortierung) VALUES
('risiko', 'ra_id',           'RA-ID',                    'text', NULL, 1, 'Risiko', 10),
('risiko', 'fehlfunktion',    'Mögliche Fehlfunktion',    'mehrzeiliger_text', NULL, 1, 'Risiko', 20),
('risiko', 'einfluss',        'Einfluss (Patientenschutz/Produktqualität/Datenintegrität)', 'mehrzeiliger_text', NULL, 0, 'Risiko', 30),
('risiko', 'massnahmen',      'Mitigierende Maßnahmen',   'mehrzeiliger_text', NULL, 0, 'Risiko', 40);

-- ---------------------------------------------------------------------------
-- Prüfschritt (IQ/OQ/PQ)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, gruppe, sortierung) VALUES
('pruefschritt', 'pruef_id',        'IQ/OQ/PQ-ID',           'text', NULL, 1, 'Prüfschritt', 10),
('pruefschritt', 'phase',           'Phase',                 'auswahl', '["IQ","OQ","PQ"]', 1, 'Prüfschritt', 20),
('pruefschritt', 'beschreibung',    'Beschreibung der Prüfung', 'mehrzeiliger_text', NULL, 1, 'Prüfschritt', 30),
('pruefschritt', 'akzeptanzkriterium', 'Akzeptanzkriterium', 'mehrzeiliger_text', NULL, 0, 'Prüfschritt', 40),
('pruefschritt', 'erfuellt',        'Erfüllt?',              'ja_nein', NULL, 0, 'Prüfschritt', 50),
('pruefschritt', 'kuerzel',         'Kürzel (Prüfer)',       'text', NULL, 0, 'Prüfschritt', 60),
('pruefschritt', 'datum',           'Datum',                 'datum', NULL, 0, 'Prüfschritt', 70),
('pruefschritt', 'bemerkung',       'Anhang/Verweis/Bemerkung', 'mehrzeiliger_text', NULL, 0, 'Prüfschritt', 80);

-- Verknüpfungs-Typen (relation_type-Werte, zur Orientierung, keine eigene Tabelle nötig):
--   'gehoert_zu'       anforderung/risiko/pruefschritt -> system
--   'bezieht_sich_auf' risiko -> anforderung
--   'getestet_in'      anforderung/risiko -> pruefschritt
