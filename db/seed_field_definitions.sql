-- ============================================================================
-- Start-Belegung: Objektarten + Felder
-- ============================================================================
-- Erste, arbeitsfähige Auswahl an Feldern (nicht alle 123 Excel-Spalten) auf
-- Basis der Analyse der Systembewertung und von VP/VB/VQ/xQTP (siehe
-- docs/analyse_*.md). Neue Felder können jederzeit als weitere INSERT-Zeile
-- ergänzt werden, ohne das Schema zu ändern.
--
-- Reihenfolge (sortierung) spiegelt die Reihenfolge im Systembewertungs-
-- dokument wider, mit einer Ausnahme: die Personen/Rollen stehen laut
-- Vorgabe immer am Anfang, unabhängig von ihrer Position im Originaldokument.
--
-- WICHTIG: 'benoetigt_fuer' ist noch unvollständig. Alle Felder hier stammen
-- aus der Systembewertung und werden (soweit bekannt) von allen Dokumenten
-- gemeinsam genutzt, daher aktuell '["immer"]'. Die zusätzlichen, nur für
-- VQ/CS-VP/CS-VB/xQTP jeweils spezifischen Felder (z.B. Change-Control-Nr.,
-- Anhänge, Ergebnislisten) sind noch nicht einzeln erfasst - das ist ein
-- offener Folgeschritt, kein Versehen.
-- ============================================================================

INSERT INTO entity_types (key, label) VALUES
    ('system',      'System'),
    ('anforderung', 'Anforderung (URS)'),
    ('risiko',      'Risiko (RA)'),
    ('pruefschritt','Prüfschritt (IQ/OQ/PQ)');

-- ---------------------------------------------------------------------------
-- System: Personen/Rollen (laut Vorgabe immer am Anfang des Formulars)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('system', 'rolle_ersteller', 'Ersteller',   'text', NULL, 1, 'Nachname, Vorname', NULL, '["immer"]', 'Personen', 10),
('system', 'rolle_sme',       'SME',         'text', NULL, 0, 'Nachname, Vorname', NULL, '["immer"]', 'Personen', 20),
('system', 'rolle_si_pl',     'SI/PL',       'text', NULL, 0, 'Nachname, Vorname', NULL, '["immer"]', 'Personen', 30),
('system', 'rolle_tso',       'TSO',         'text', NULL, 0, 'Nachname, Vorname', NULL, '["immer"]', 'Personen', 40),
('system', 'rolle_bso',       'BSO',         'text', NULL, 0, 'Nachname, Vorname', NULL, '["immer"]', 'Personen', 50),
('system', 'rolle_bqr',       'BQR',         'text', NULL, 0, 'Nachname, Vorname', NULL, '["immer"]', 'Personen', 60),
('system', 'rolle_csq',       'CSQ',         'text', NULL, 0, 'Nachname, Vorname', NULL, '["immer"]', 'Personen', 70);

-- ---------------------------------------------------------------------------
-- System: Stammdaten (Reihenfolge wie am Anfang der Systembewertung: MLCS-ID,
-- Betrieb, Gebäude, Version, Dok.-Nr., AS/BDIS-Name, Anlage, ...)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('system', 'mlcs_id',            'MLCS-ID',                'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 10),
('system', 'bereich',            'Bereich/Betrieb',        'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 20),
('system', 'gebaeude',           'Gebäude',                'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 30),
('system', 'dok_version',        'Dokumentversion (Systembewertung)', 'text', NULL, 0, 'x.x, z.B. 1.0', NULL, '["immer"]', 'Stammdaten', 40),
('system', 'dok_nummer',         'Dokumentnummer (Systembewertung)', 'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 50),
('system', 'systemname',         'Systemname',             'text', NULL, 1, NULL, NULL, '["immer"]', 'Stammdaten', 60),
('system', 'anlage',             'Anlage',                 'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 70),
('system', 'raum',               'Raum',                   'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 80),
('system', 'kurzbeschreibung',   'Kurzbeschreibung',       'mehrzeiliger_text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 90),
('system', 'sw_name',            'Software-Name',          'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 100),
('system', 'sw_version',         'Software-Version/Typ',   'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 110),
('system', 'sw_hersteller',      'Software-Hersteller',    'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 120),
('system', 'hersteller',         'Hersteller/Lieferant',   'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 130),
('system', 'lieferantennummer',  'Lieferantennummer',      'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 140);

-- ---------------------------------------------------------------------------
-- System: GxP-Bewertung (Reihenfolge wie im Dokument: GxP-relevant?,
-- GxP-Kritikalität, Systemtyp/Subtyp, GAMP-Kategorie, ERES-Typ, Testtiefe,
-- Gerätekategorie, Business Critical, VQ/VAL)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('system', 'gxp_relevant',       'GxP-relevant?',          'ja_nein', NULL, 1, NULL, NULL, '["immer"]', 'GxP-Bewertung', 10),
('system', 'gxp_kritikalitaet',  'GxP-Kritikalität',       'auswahl', '["Critical","Major","Minor","N/A"]', 1, NULL, NULL, '["immer"]', 'GxP-Bewertung', 20),
-- Systemtyp: 3 Möglichkeiten, nicht nur 2 - CIS und CE sind zwei von drei
-- Ausprägungen eines "Computergestützten Systems" (CS); die dritte ist
-- "Spreadsheets (S)". Quelle: Definition in QU-MT-0000722 (CS-VP-Template).
('system', 'systemtyp',          'Systemtyp', 'auswahl', '["CIS","CE","S"]', 0, NULL, 'CS = CIS (Computergestütztes Informationssystem), CE (Computergestütztes Equipment) oder S (Spreadsheet) - gemäß QU-SOP-0015430', '["immer"]', 'GxP-Bewertung', 30),
('system', 'subtyp',             'Subtyp (bei CE)',        'auswahl', '["CE-PCS","CE-LCE","CE-EE","N/A"]', 0, NULL, NULL, '["immer"]', 'GxP-Bewertung', 40),
('system', 'gamp_kategorie',     'GAMP-5-Software-Kategorie', 'auswahl', '["1","3","4","5","N/A"]', 0, NULL, 'gemäß GAMP 5 (2nd Edition)', '["immer"]', 'GxP-Bewertung', 50),
('system', 'eres_typ',           'Typ elektronischer Aufzeichnungen', 'auswahl', '["Typ 1","Typ 2","Typ 3","Typ 4","N/A"]', 0, NULL, NULL, '["immer"]', 'GxP-Bewertung', 60),
('system', 'testtiefe',          'Testtiefe',              'auswahl', '["Hoch","Mittel","Gering"]', 0, NULL, NULL, '["immer"]', 'GxP-Bewertung', 70),
('system', 'geraetekategorie',  'Gerätekategorie (ISPE/GAMP)', 'auswahl', '["A","B1","B2","B3","C1","C2","N/A"]', 0, NULL, 'gemäß QU-SOP-0021736 (Qualifizierung von Gebäuden, Einrichtungen und Ausrüstung)', '["immer"]', 'GxP-Bewertung', 80),
('system', 'business_critical',  'Business critical?',    'ja_nein', NULL, 0, NULL, NULL, '["immer"]', 'GxP-Bewertung', 90),
('system', 'vq_erforderlich',    'Vereinfachte Qualifizierung erforderlich?', 'ja_nein', NULL, 0, NULL, 'gemäß QU-SOP-0021736', '["immer"]', 'GxP-Bewertung', 100),
('system', 'val_erforderlich',   'Validierung erforderlich?', 'ja_nein', NULL, 0, NULL, 'gemäß QU-SOP-0049866 (Validierung computergestützter Systeme)', '["immer"]', 'GxP-Bewertung', 110);

-- ---------------------------------------------------------------------------
-- System: Status/Nachverfolgung
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('system', 'ist_aktuelle_version', 'Ist aktuelle Version?', 'ja_nein', NULL, 0, NULL, NULL, '["immer"]', 'Status', 10);

-- ---------------------------------------------------------------------------
-- Anforderung (URS-Punkt) – für URS-Tabelle / Traceability Matrix.
-- Wird nur für Dokumente gebraucht, die URS-Punkte referenzieren.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('anforderung', 'urs_id',        'URS-ID',                 'text', NULL, 1, NULL, NULL, '["VQ"]', 'Anforderung', 10),
('anforderung', 'beschreibung',  'Anforderungsbeschreibung', 'mehrzeiliger_text', NULL, 1, NULL, NULL, '["VQ"]', 'Anforderung', 20),
('anforderung', 'gxp_relevant',  'GxP-relevant?',           'ja_nein', NULL, 0, NULL, NULL, '["VQ"]', 'Anforderung', 30),
('anforderung', 'quelle',        'Entspricht URS in (DS/PH)', 'text', NULL, 0, NULL, NULL, '["VQ"]', 'Anforderung', 40);

-- ---------------------------------------------------------------------------
-- Risiko (RA-Eintrag) – nur für Dokumente mit Risikobetrachtung.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('risiko', 'ra_id',           'RA-ID',                    'text', NULL, 1, NULL, NULL, '["VQ"]', 'Risiko', 10),
('risiko', 'fehlfunktion',    'Mögliche Fehlfunktion',    'mehrzeiliger_text', NULL, 1, NULL, NULL, '["VQ"]', 'Risiko', 20),
('risiko', 'einfluss',        'Einfluss (Patientenschutz/Produktqualität/Datenintegrität)', 'mehrzeiliger_text', NULL, 0, NULL, NULL, '["VQ"]', 'Risiko', 30),
('risiko', 'massnahmen',      'Mitigierende Maßnahmen',   'mehrzeiliger_text', NULL, 0, NULL, NULL, '["VQ"]', 'Risiko', 40);

-- ---------------------------------------------------------------------------
-- Prüfschritt (IQ/OQ/PQ) – nur für Dokumente mit Prüfprotokoll.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('pruefschritt', 'pruef_id',        'IQ/OQ/PQ-ID',           'text', NULL, 1, NULL, NULL, '["VQ","xQTP"]', 'Prüfschritt', 10),
('pruefschritt', 'phase',           'Phase',                 'auswahl', '["IQ","OQ","PQ"]', 1, NULL, NULL, '["VQ","xQTP"]', 'Prüfschritt', 20),
('pruefschritt', 'beschreibung',    'Beschreibung der Prüfung', 'mehrzeiliger_text', NULL, 1, NULL, NULL, '["VQ","xQTP"]', 'Prüfschritt', 30),
('pruefschritt', 'akzeptanzkriterium', 'Akzeptanzkriterium', 'mehrzeiliger_text', NULL, 0, NULL, NULL, '["VQ","xQTP"]', 'Prüfschritt', 40),
('pruefschritt', 'erfuellt',        'Erfüllt?',              'ja_nein', NULL, 0, NULL, NULL, '["VQ","xQTP"]', 'Prüfschritt', 50),
('pruefschritt', 'kuerzel',         'Kürzel (Prüfer)',       'text', NULL, 0, NULL, NULL, '["VQ","xQTP"]', 'Prüfschritt', 60),
('pruefschritt', 'datum',           'Datum',                 'datum', NULL, 0, NULL, NULL, '["VQ","xQTP"]', 'Prüfschritt', 70),
('pruefschritt', 'bemerkung',       'Anhang/Verweis/Bemerkung', 'mehrzeiliger_text', NULL, 0, NULL, NULL, '["VQ","xQTP"]', 'Prüfschritt', 80);

-- Verknüpfungs-Typen (relation_type-Werte, zur Orientierung, keine eigene Tabelle nötig):
--   'gehoert_zu'       anforderung/risiko/pruefschritt -> system
--   'bezieht_sich_auf' risiko -> anforderung
--   'getestet_in'      anforderung/risiko -> pruefschritt
