-- ============================================================================
-- Masterform-Datenbank – Schema (SQLite)
-- ============================================================================
-- Kein Vorwissen zu SQL nötig, um das zu verstehen: jede CREATE TABLE-
-- Anweisung entspricht einer Tabelle in einer Datenbank, ähnlich einem
-- Tabellenblatt in Excel, nur mit klar festgelegten Spalten und
-- Verknüpfungen zwischen den Tabellen.
--
-- Warum nicht einfach eine große Tabelle wie im Excel? Weil wir mehrere
-- unterschiedliche "Objektarten" abbilden (System, Anforderung (URS),
-- Risiko (RA), Prüfschritt (IQ/OQ/PQ), ...) und weil sich die Feldliste
-- noch ändern wird. Deshalb: eine Tabelle "records" für alle Datensätze
-- egal welcher Art, und eine Tabelle "field_values" für die eigentlichen
-- Werte. Neues Feld hinzufügen = eine neue Zeile in field_definitions,
-- keine Schema-Änderung nötig.
-- ============================================================================

-- Welche "Objektarten" es gibt.
CREATE TABLE entity_types (
    key   TEXT PRIMARY KEY,   -- z.B. 'system', 'anforderung', 'risiko', 'pruefschritt'
    label TEXT NOT NULL       -- z.B. 'System', 'Anforderung (URS)'
);

-- Welche Felder es pro Objektart gibt, und wie das Formular sie anzeigen soll.
CREATE TABLE field_definitions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type    TEXT    NOT NULL REFERENCES entity_types(key),
    key            TEXT    NOT NULL,   -- Platzhaltername, z.B. 'gxp_kritikalitaet'
    label          TEXT    NOT NULL,   -- Beschriftung im Formular, z.B. 'GxP-Kritikalität'
    datentyp       TEXT    NOT NULL CHECK (datentyp IN ('text', 'mehrzeiliger_text', 'zahl', 'datum', 'ja_nein', 'auswahl')),
    optionen       TEXT,               -- bei datentyp='auswahl': JSON-Liste erlaubter Werte, z.B. '["Critical","Major","Minor","N/A"]'
    pflichtfeld    INTEGER NOT NULL DEFAULT 0,   -- 0 = optional, 1 = Pflichtfeld
    format_hinweis TEXT,               -- Formatvorschrift, wird nur beim Bearbeiten des Feldes angezeigt, z.B. 'Nachname, Vorname' oder 'x.x'
    sop_hinweis    TEXT,               -- Bezug auf die zugehoerige SOP, z.B. 'gemaess QU-SOP-0021736'
    benoetigt_fuer TEXT    NOT NULL DEFAULT '["immer"]',  -- JSON-Liste: 'immer' = Basisdatum fuer alle Dokumente, sonst Dokumenttyp-Schluessel (z.B. 'VQ','CS-VP','CS-VB','xQTP')
    gruppe         TEXT,               -- Gruppierung im Formular, z.B. 'Personen', 'Stammdaten', 'GxP-Bewertung'
    sortierung     INTEGER NOT NULL DEFAULT 0,   -- Reihenfolge innerhalb der Gruppe (spiegelt die Reihenfolge im Systembewertungsdokument)
    UNIQUE (entity_type, key)
);

-- Ein konkreter Datensatz, z.B. "System: HPLC-042" oder "Anforderung URS-014".
CREATE TABLE records (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type  TEXT    NOT NULL REFERENCES entity_types(key),
    status       TEXT    NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'final')),
    erstellt_am  TEXT    NOT NULL DEFAULT (datetime('now')),
    erstellt_von TEXT,
    geaendert_am TEXT,
    geaendert_von TEXT
);

-- Die tatsächlichen Werte je Datensatz und Feld (eine Zeile pro befülltem Feld).
CREATE TABLE field_values (
    record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    field_key TEXT    NOT NULL,
    wert      TEXT,
    PRIMARY KEY (record_id, field_key)
);

-- Verknüpfungen zwischen Datensätzen, z.B. "Anforderung X gehört zu System Y",
-- "Risiko Z bezieht sich auf Anforderung X", "Prüfschritt P testet Anforderung X".
CREATE TABLE relations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    from_record_id  INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    relation_type   TEXT    NOT NULL,   -- z.B. 'gehoert_zu', 'bezieht_sich_auf', 'getestet_in'
    to_record_id    INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE
);

-- Grobe Änderungshistorie (kein voller GxP-Audit-Trail, siehe KONZEPT.md).
CREATE TABLE change_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id    INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    field_key    TEXT,
    alter_wert   TEXT,
    neuer_wert   TEXT,
    geaendert_am TEXT    NOT NULL DEFAULT (datetime('now')),
    geaendert_von TEXT
);

-- Registrierte Word-Vorlagen.
CREATE TABLE templates (
    key         TEXT PRIMARY KEY,   -- z.B. 'systembewertung_v11', 'csvp_v2'
    name        TEXT NOT NULL,
    dokumenttyp TEXT NOT NULL,      -- z.B. 'Systembewertung', 'CS-VP', 'CS-VB', 'VQ', 'xQTP'
    dateipfad   TEXT,               -- lokaler Pfad, NICHT im Git-Repo (siehe KONZEPT.md)
    version     TEXT
);

-- Erzeugte, ausgefüllte Dokumente.
CREATE TABLE documents (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    template_key   TEXT    NOT NULL REFERENCES templates(key),
    record_id      INTEGER NOT NULL REFERENCES records(id),
    status         TEXT    NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'final')),
    erzeugt_am     TEXT    NOT NULL DEFAULT (datetime('now')),
    finalisiert_am TEXT,
    finalisiert_von TEXT,
    werte_snapshot TEXT     -- JSON-Kopie der zum Erzeugungszeitpunkt verwendeten Werte
);

CREATE INDEX idx_field_values_record ON field_values(record_id);
CREATE INDEX idx_relations_from ON relations(from_record_id);
CREATE INDEX idx_relations_to ON relations(to_record_id);
CREATE INDEX idx_change_log_record ON change_log(record_id);
CREATE INDEX idx_documents_record ON documents(record_id);
