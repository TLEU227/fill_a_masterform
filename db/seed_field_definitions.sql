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
    ('person',      'Person'),
    ('system',      'System'),
    ('anforderung', 'Anforderung (URS)'),
    ('risiko',      'Risiko (RA)'),
    ('pruefschritt','Prüfschritt (IQ/OQ/PQ)');

-- ---------------------------------------------------------------------------
-- Person: eigene Objektart statt Freitext-Name je Rolle. Grund: dieselbe
-- Person tritt in mehreren Systemen/Dokumenten auf; Stelle/Abteilung soll
-- man einmal pflegen, nicht bei jedem System neu abtippen.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('person', 'name',      'Name',                'text', NULL, 1, 'Nachname, Vorname', NULL, '["immer"]', 'Person', 10),
('person', 'stelle',    'Stelle/Funktion',     'text', NULL, 0, 'z.B. CSV Specialist', NULL, '["immer"]', 'Person', 20),
('person', 'abteilung', 'Abteilung',           'text', NULL, 0, 'z.B. FBC Campus Management Engineering CSV', NULL, '["immer"]', 'Person', 30);

-- ---------------------------------------------------------------------------
-- System: Rollen (laut Vorgabe immer am Anfang des Formulars). Jedes Feld
-- verweist auf einen Datensatz der Objektart 'person' (Auswahl/Neuanlage),
-- nicht auf einen Freitext-Namen.
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('system', 'rolle_ersteller', 'Ersteller',   'person_referenz', NULL, 1, NULL, NULL, '["immer"]', 'Personen', 10),
('system', 'rolle_sme',       'SME',         'person_referenz', NULL, 0, NULL, NULL, '["immer"]', 'Personen', 20),
('system', 'rolle_si_pl',     'SI/PL',       'person_referenz', NULL, 0, NULL, NULL, '["immer"]', 'Personen', 30),
('system', 'rolle_tso',       'TSO',         'person_referenz', NULL, 0, NULL, NULL, '["immer"]', 'Personen', 40),
('system', 'rolle_bso',       'BSO',         'person_referenz', NULL, 0, NULL, NULL, '["immer"]', 'Personen', 50),
('system', 'rolle_bqr',       'BQR',         'person_referenz', NULL, 0, NULL, NULL, '["immer"]', 'Personen', 60),
('system', 'rolle_csq',       'CSQ',         'person_referenz', NULL, 0, NULL, NULL, '["immer"]', 'Personen', 70);

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
('system', 'lieferantennummer',  'QualiPSO Third Party/Customer-ID', 'text', NULL, 0, NULL, NULL, '["immer"]', 'Stammdaten', 140);

-- ---------------------------------------------------------------------------
-- System: GxP-Bewertung (Reihenfolge wie im Dokument: GxP-relevant?,
-- GxP-Kritikalität, Systemtyp/Subtyp, GAMP-Kategorie, ERES-Typ, Testtiefe,
-- Gerätekategorie, Business Critical, VQ/VAL)
-- ---------------------------------------------------------------------------
INSERT INTO field_definitions (entity_type, key, label, datentyp, optionen, pflichtfeld, format_hinweis, sop_hinweis, benoetigt_fuer, gruppe, sortierung) VALUES
('system', 'gxp_relevant',       'GxP-relevant?',          'ja_nein', NULL, 1, NULL, NULL, '["immer"]', 'GxP-Bewertung', 10),
('system', 'gxp_kritikalitaet',  'GxP-Kritikalität',       'auswahl',
 '[{"wert":"Critical","erklaerung":"Direkter Einfluss auf Produktqualität, Patientensicherheit oder Datenintegrität."},
   {"wert":"Major","erklaerung":"GxP-Verletzung, aber ohne direkten Einfluss auf Produktqualität, Patientensicherheit oder Datenintegrität."},
   {"wert":"Minor","erklaerung":"Indirekte GxP-Verletzung, kein Einfluss auf Produktqualität, Patientensicherheit oder Datenintegrität."},
   {"wert":"N/A","erklaerung":"Kein Risiko."}]',
 1, NULL, 'Critical: siehe QU-SOP-0048972', '["immer"]', 'GxP-Bewertung', 20),
-- Systemtyp: EINE Auswahl mit 8 sich ausschließenden Optionen (im
-- Referenzdokument QU-MT-0001344 als eine gemeinsame Checkbox-Liste
-- gefunden - CIS/CE-* und S0-S2 gehören zusammen, keine zwei getrennten
-- Felder "Systemtyp"+"Subtyp", das war eine falsche Modellierung zuvor).
-- CIS=Computergestütztes Informationssystem, CE-PCS=Process Control
-- System, CE-LCE=Laboratory Computerized Equipment, CE-EE=Elektronisches
-- Einzelgerät, S0/S1/S2=Spreadsheet-Komplexitätsstufen.
('system', 'systemtyp', 'Systemtyp', 'auswahl', '["CIS","CE-PCS","CE-LCE","CE-EE","S0","S1","S2","N/A"]', 0, NULL, 'gemäß QU-SOP-0015430 (Lifecycle computergestützter Systeme)', '["immer"]', 'GxP-Bewertung', 30),
('system', 'gamp_kategorie',     'GAMP-5-Software-Kategorie', 'auswahl',
 '[{"wert":"1","erklaerung":"Infrastruktur-Software, z.B. Betriebssysteme, Datenbankmanager - nicht konfigurierbar."},
   {"wert":"3","erklaerung":"Nicht konfigurierbare Standardsoftware, z.B. Firmware-basierte Systeme."},
   {"wert":"4","erklaerung":"Konfigurierbare Software, z.B. LIMS, SCADA, ERP, PLS, HMI."},
   {"wert":"5","erklaerung":"Kundenspezifisch programmierte Software."},
   {"wert":"N/A","erklaerung":"Nicht zutreffend."}]',
 0, NULL, 'gemäß GAMP 5 (2nd Edition)', '["immer"]', 'GxP-Bewertung', 50),
('system', 'eres_typ',           'Typ elektronischer Aufzeichnungen', 'auswahl',
 '[{"wert":"Typ 1","erklaerung":"Keine elektronischen Aufzeichnungen, keine elektronische Signatur (einfaches System)."},
   {"wert":"Typ 2","erklaerung":"Keine elektronischen Aufzeichnungen/Signatur, da durch ein übergeordnetes System oder auf Papier abgedeckt."},
   {"wert":"Typ 3","erklaerung":"Elektronische Aufzeichnungen ohne elektronische Signatur."},
   {"wert":"Typ 4","erklaerung":"Elektronische Aufzeichnungen mit elektronischer Signatur."},
   {"wert":"N/A","erklaerung":"Nicht zutreffend."}]',
 0, NULL, NULL, '["immer"]', 'GxP-Bewertung', 60),
-- 'testtiefe' ist KEIN Eingabefeld: sie ergibt sich aus gxp_kritikalitaet +
-- gamp_kategorie gemäß der Ableitungstabelle in Kapitel 8 der Systembewertung
-- (Quelle: QU-MT-0001344, Tabelle "Festlegung der Testtiefe"):
--   Kritikalität \ GAMP-Kat. | 1 oder 3 | 4      | 5
--   Critical                | Mittel   | Hoch   | Hoch
--   Major                   | Gering   | Mittel | Hoch
--   Minor                   | Gering   | Gering | Mittel
--   N/A                     | N/A      | N/A    | N/A
-- Wird bei der Dokument-Erzeugung automatisch berechnet, nicht manuell erfasst.
('system', 'geraetekategorie',  'Gerätekategorie (ISPE/GAMP)', 'auswahl', '["A","B1","B2","B3","C1","C2","N/A"]', 0, NULL, 'gemäß QU-SOP-0021736 (Qualifizierung von Gebäuden, Einrichtungen und Ausrüstung), Mehrfachauswahl laut Referenzdokument möglich', '["immer"]', 'GxP-Bewertung', 80),
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
