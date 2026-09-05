"use strict";
/* Masterform – Browser-App (Task #3)
 * Echte SQLite-Datenbank im Browser (sql.js/WASM), Formular fuer die
 * 3 Erfassungsszenarien, Personen- und Systemsuche, Basis-Listenpflege
 * fuer Anforderung/Risiko/Pruefschritt. Kein Server, keine externen
 * Netzwerkaufrufe zur Laufzeit.
 */

// ---------------------------------------------------------------- Zustand
// Zwei unabhaengige Datenbanken (System-DB + Projekt-DB, siehe KONZEPT.md
// Abschnitt 2.1) - gleiches generisches Schema, verknuepft ueber den
// Feldwert mlcs_id (kein klassischer Fremdschluessel, zwei getrennte
// .sqlite-Dateien). Man kann mit einer von beiden anfangen.
let SQL = null;
let db = null;               // System-DB
let projektDb = null;        // Projekt-DB
let fileHandle = null;       // File System Access API Handle fuer die System-DB
let projektFileHandle = null; // ... fuer die Projekt-DB
let hasFSAccess = "showOpenFilePicker" in window && "showSaveFilePicker" in window;
let activeTab = "system";    // "system" | "projekt" - welcher Tab/welche DB gerade aktiv ist
let scenario = "leer";
let currentSystemId = null;  // null => Szenario 1/2 legen einen NEUEN Datensatz an
let baseline = {};           // field_key -> Wert, Stand beim Laden (fuer Aenderungs-Hervorhebung + change_log)
let fieldDefsByEntity = {};  // entity_type -> [def, ...] (gemeinsam fuer beide DBs, keine ueberlappenden Keys)
let personCache = [];
let systemCache = [];
let systemDirty = false;
let currentDocType = "";
let listState = { anforderung: [], risiko: [], pruefschritt: [] };
// listState[entity] = [{ id: number|null, geloescht: bool, werte: {feldkey: wert} }, ...]

let projektScenario = "neu";
let currentProjektId = null;
let projektBaseline = {};
let projektCache = [];
let projektDirty = false;
let projektListState = { versionshistorie_eintrag: [], lieferant_verantwortlichkeit: [], unexpected_event: [] };

const GROUP_ORDER = {
  system: ["Personen", "Stammdaten", "GxP-Bewertung", "Status"],
  person: ["Person"],
  anforderung: ["Anforderung"],
  risiko: ["Risiko"],
  pruefschritt: ["Prüfschritt"],
  projekt: [
    // "Dokument" (Dok-ID+Version DIESES Dokuments, s. db/seed_field_definitions_projekt.sql)
    // steht bewusst ganz vorn - Nutzer-Anfrage 06.09.: "ein Pflichtfeld muss
    // als erstes eine Dok-ID des Dokumentes und Version sein".
    "Dokument",
    // Personen (Dokumentenfreigabe) direkt danach - "wer" gehoert erzaehl-
    // logisch zur Dokument-Identitaet (Nutzer-Anfrage 06.09.).
    "Personen (Dokumentenfreigabe)",
    "Projekt", "Verknüpfung", "Vorgängerprojekt", "Systembeschreibung", "Referenzdokumente",
    "Vorgehensweise", "Testkonzept", "Verantwortlichkeiten je Dokument",
    // Validierungsergebnisse (nur CS-VB) - seit 05.09. nach Kapitel untergruppiert statt
    // einer einzigen, sehr langen Karte (Nutzer-Feedback: "die Validierungsergebnisse
    // noch untergruppieren"), Reihenfolge = Dokumentreihenfolge (Kap. 1.4/2.1/2.2, 3, 4.2, 4.7-4.10).
    "Validierungsergebnisse: Systembeschreibung & Verantwortlichkeiten",
    "Validierungsergebnisse: Vorgehensweise & Testprozess",
    "Validierungsergebnisse: DQ", "Validierungsergebnisse: IQ", "Validierungsergebnisse: OQ",
    "Validierungsergebnisse: PQ", "Validierungsergebnisse: PPQ",
    "Weitere Validierungsdokumente",
  ],
  versionshistorie_eintrag: [null],
  lieferant_verantwortlichkeit: [null],
  unexpected_event: [null],
};
// Gruppen, die es zwar als field_definitions in der DB gibt (fuer spaeter),
// die aber aktuell NICHT im Formular angezeigt werden sollen - Nutzer-
// Rueckmeldung: die Personen/Rollen-Felder werden fuers CS-VP-Template
// derzeit nicht gebraucht, sollen aber in der DB erhalten bleiben.
const HIDDEN_GROUPS = {
  system: ["Personen"],
};
const ENTITY_LABEL = {
  anforderung: "Anforderung (URS)",
  risiko: "Risiko (RA)",
  pruefschritt: "Prüfschritt (IQ/OQ/PQ/PPQ)",
  versionshistorie_eintrag: "Versionshistorie-Eintrag",
  lieferant_verantwortlichkeit: "Verantwortlichkeit des Lieferanten",
  unexpected_event: "Änderung während der Validierung (Unexpected Event)",
};
// Welche Zusatz-Objektarten pro Dokumenttyp gebraucht werden, und ob sie
// "pflicht" (ohne das ist das Dokument nicht sinnvoll vorausfuellbar) oder
// "optional" (kann uebersprungen werden, siehe Nutzer-Feedback zu den
// Pruefschritten) sind. Rein praesentationsseitig, keine DB-Tabelle noetig.
const BRANCH_CONFIG = {
  VQ: { pflicht: ["anforderung", "risiko"], optional: ["pruefschritt"] },
  xQTP: { pflicht: [], optional: ["pruefschritt"] },
  "CS-VP": { pflicht: [], optional: [] },
  "CS-VB": { pflicht: [], optional: [] },
};
// currentDocTypeChosen steuert seit der Reiter-Aufteilung nur noch, welche
// optionalen Zusatzlisten (Anforderung/Risiko/Pruefschritt, nur VQ/xQTP) im
// System-Reiter erscheinen (s. applyBranchDocType()) - beide Datenbanken
// (System+Projekt) werden davon unabhaengig immer gemeinsam bereitgestellt.
let currentDocTypeChosen = "";
// Ableitungstabelle Testtiefe (Kapitel 8 der Systembewertung, QU-MT-0001344).
const TESTTIEFE_MATRIX = {
  Critical: { "1": "Mittel", "3": "Mittel", "4": "Hoch", "5": "Hoch" },
  Major: { "1": "Gering", "3": "Gering", "4": "Mittel", "5": "Hoch" },
  Minor: { "1": "Gering", "3": "Gering", "4": "Gering", "5": "Mittel" },
  "N/A": { "1": "N/A", "3": "N/A", "4": "N/A", "5": "N/A", "N/A": "N/A" },
};
// KI-Reifegrad: Autonomie-Stufe (0-5) x Steuerungsdesign-Stufe (1-5) -> Reifegrad I-VI.
// Vom Nutzer bestätigt (Stand 04.09.), Steuerungsdesign-Stufe 3 = wie Stufe 2.
const KI_REIFEGRAD_MATRIX = {
  "0": { "1": "I", "2": "II", "3": "II", "4": "II", "5": "II" },
  "1": { "1": "I", "2": "III", "3": "III", "4": "III", "5": "III" },
  "2": { "1": "I", "2": "IV", "3": "IV", "4": "V", "5": "V" },
  "3": { "1": "I", "2": "IV", "3": "IV", "4": "V", "5": "V" },
  "4": { "1": "I", "2": "VI", "3": "VI", "4": "VI", "5": "VI" },
  "5": { "1": "I", "2": "VI", "3": "VI", "4": "VI", "5": "VI" },
};

// ---------------------------------------------------------------- Hilfsfunktionen
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function base64ToBytes(b64) {
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}
function optionValue(o) { return typeof o === "string" ? o : o.wert; }
function optionErklaerung(o) { return typeof o === "string" ? null : o.erklaerung; }
function nowIso() { return new Date().toISOString(); }

// ---------------------------------------------------------------- DB-Engine
// Alle CRUD-Hilfsfunktionen nehmen die Ziel-Datenbankverbindung (conn) als
// ersten Parameter - System-DB (db) und Projekt-DB (projektDb) benutzen
// dasselbe Schema, aber sind zwei unabhaengige sql.js-Datenbanken.
async function initEngine() {
  SQL = await initSqlJs({ wasmBinary: base64ToBytes(WASM_B64) });
}
function pragmaSetup(conn) {
  conn.run("PRAGMA foreign_keys = ON");
}
function createNewDb() {
  db = new SQL.Database();
  pragmaSetup(db);
  db.run(SCHEMA_SQL);
  db.run(SEED_SQL);
}
function loadDbFromBytes(bytes) {
  db = new SQL.Database(bytes);
  pragmaSetup(db);
}
function exportDbBytes() {
  return db.export();
}
function createNewProjektDb() {
  projektDb = new SQL.Database();
  pragmaSetup(projektDb);
  projektDb.run(SCHEMA_SQL);
  projektDb.run(PROJEKT_SEED_SQL);
}
function loadProjektDbFromBytes(bytes) {
  projektDb = new SQL.Database(bytes);
  pragmaSetup(projektDb);
}
function exportProjektDbBytes() {
  return projektDb.export();
}

function loadFieldDefinitions(conn) {
  const res = conn.exec(
    "SELECT entity_type,key,label,datentyp,optionen,format_hinweis,sop_hinweis,freitext_erlaubt,pflichtfeld,gruppe,sortierung,benoetigt_fuer " +
    "FROM field_definitions ORDER BY entity_type, sortierung"
  );
  if (!res.length) return;
  res[0].values.forEach((row) => {
    const [entity_type, key, label, datentyp, optionen, format_hinweis, sop_hinweis, freitext_erlaubt, pflichtfeld, gruppe, sortierung, benoetigt_fuer] = row;
    // entity_type gehoert entweder komplett zur System- oder komplett zur
    // Projekt-DB (keine Ueberlappung) - beim (Neu-)Laden einer der beiden DBs
    // die zugehoerigen Definitionen ersetzen, die der anderen DB unangetastet lassen.
    if (!fieldDefsByEntity[entity_type] || fieldDefsByEntity[entity_type]._conn !== conn) {
      fieldDefsByEntity[entity_type] = [];
      fieldDefsByEntity[entity_type]._conn = conn;
    }
    const def = {
      entity_type, key, label, datentyp,
      optionen: optionen ? JSON.parse(optionen) : null,
      format_hinweis, sop_hinweis,
      freitext_erlaubt: !!freitext_erlaubt,
      pflichtfeld: !!pflichtfeld,
      gruppe, sortierung,
      benoetigt_fuer: benoetigt_fuer ? JSON.parse(benoetigt_fuer) : ["immer"],
    };
    fieldDefsByEntity[entity_type].push(def);
  });
}
function defFor(entity, fieldKey) {
  return (fieldDefsByEntity[entity] || []).find((d) => d.key === fieldKey);
}
// mode (nur fuer entityType='projekt' relevant): Nutzer-Anfrage 05.09. -
// "alles dokumentenspezifische in extra Reiter parallel zu System und
// Projekt anordnen". Statt EINES Projekt-Formulars, gefiltert nach der
// oben gewaehlten Dokumentart, gibt es jetzt DREI parallele Formulare
// (#projektForm/#vpForm/#vbForm), die IMMER gleichzeitig verfuegbar sind:
//   mode='immer'  -> nur Felder mit benoetigt_fuer=["immer"] (Tab "Projekt",
//                    z.B. MLCS-ID) - dokumentuebergreifende Basisdaten.
//   mode='CS-VP'  -> nur Felder, deren benoetigt_fuer 'CS-VP' enthaelt
//                    (Tab "VP") - das schliesst auch die Felder ein, die
//                    SOWOHL fuer CS-VP als auch CS-VB benoetigt werden
//                    (z.B. vorgaenger_dok_id) - die erscheinen dann bewusst
//                    in BEIDEN Tabs (VP UND VB), siehe syncSharedProjektField().
//   mode='CS-VB'  -> analog fuer den Tab "VB".
function groupsFor(entityType, mode) {
  let defs = fieldDefsByEntity[entityType] || [];
  if (entityType === "projekt" && mode) {
    defs = defs.filter((d) => (d.benoetigt_fuer || ["immer"]).includes(mode));
  }
  const byGroup = {};
  defs.forEach((d) => { (byGroup[d.gruppe] ||= []).push(d); });
  const hidden = new Set(HIDDEN_GROUPS[entityType] || []);
  const order = GROUP_ORDER[entityType] || Object.keys(byGroup);
  const groups = [];
  order.forEach((g) => { if (byGroup[g] && !hidden.has(g)) groups.push({ name: g, fields: byGroup[g] }); });
  Object.keys(byGroup).forEach((g) => { if (!order.includes(g) && !hidden.has(g)) groups.push({ name: g, fields: byGroup[g] }); });
  return groups;
}
// Zeigt wahrheitsgemaess, fuer welche Dokumentart(en) eine Feldgruppe
// tatsaechlich benoetigt wird - ersetzt das bisher fest verdrahtete "CS-VP"
// im Gruppenkopf (Nutzer-Feedback 05.09.: "wieso steht da CS-VP, ich dachte
// CS-VB gewählt zu haben").
function groupBadge(fields) {
  const types = new Set();
  fields.forEach((f) => (f.benoetigt_fuer || ["immer"]).forEach((t) => { if (t !== "immer") types.add(t); }));
  return types.size ? Array.from(types).join("/") : "immer";
}

function getAllRecordsWithValues(conn, entityType) {
  const byId = {};
  const res = conn.exec(
    `SELECT r.id, r.status, fv.field_key, fv.wert FROM records r ` +
    `LEFT JOIN field_values fv ON fv.record_id = r.id WHERE r.entity_type = '${entityType}'`
  );
  if (res.length) {
    res[0].values.forEach(([id, status, key, wert]) => {
      byId[id] ||= { id, status, values: {} };
      if (key !== null) byId[id].values[key] = wert;
    });
  }
  return Object.values(byId);
}
function loadPersonCache() {
  personCache = getAllRecordsWithValues(db, "person").map((r) => ({
    id: r.id, name: r.values.name || "(ohne Namen)", funktion: r.values.funktion || "", abteilung: r.values.abteilung || "",
  }));
}
function loadSystemCache() {
  systemCache = getAllRecordsWithValues(db, "system");
}
function loadProjektCache() {
  projektCache = getAllRecordsWithValues(projektDb, "projekt");
}
function getRelatedRecords(conn, entityType, parentId) {
  if (parentId == null) return [];
  const res = conn.exec(
    `SELECT r.id, fv.field_key, fv.wert FROM relations rel ` +
    `JOIN records r ON r.id = rel.from_record_id ` +
    `LEFT JOIN field_values fv ON fv.record_id = r.id ` +
    `WHERE rel.to_record_id = ${parentId} AND rel.relation_type = 'gehoert_zu' AND r.entity_type = '${entityType}'`
  );
  const byId = {};
  if (res.length) {
    res[0].values.forEach(([id, key, wert]) => {
      byId[id] ||= { id: id, geloescht: false, werte: {} };
      if (key !== null) byId[id].werte[key] = wert;
    });
  }
  return Object.values(byId);
}

// ------------------------------------------------------ Speichern (write)
function upsertFieldValue(conn, recordId, key, value) {
  const stmt = conn.prepare(
    "INSERT INTO field_values (record_id, field_key, wert) VALUES (?,?,?) " +
    "ON CONFLICT(record_id, field_key) DO UPDATE SET wert=excluded.wert"
  );
  stmt.run([recordId, key, value]);
  stmt.free();
}
function insertChangeLog(conn, recordId, key, alt, neu) {
  const stmt = conn.prepare(
    "INSERT INTO change_log (record_id, field_key, alter_wert, neuer_wert, geaendert_von) VALUES (?,?,?,?,?)"
  );
  stmt.run([recordId, key, alt, neu, "Browser-Nutzer"]);
  stmt.free();
}
function createRecord(conn, entityType) {
  const stmt = conn.prepare("INSERT INTO records (entity_type, status, erstellt_von) VALUES (?, 'entwurf', 'Browser-Nutzer')");
  stmt.run([entityType]);
  stmt.free();
  return conn.exec("SELECT last_insert_rowid()")[0].values[0][0];
}
function linkToSystem(conn, recordId, targetId) {
  const stmt = conn.prepare("INSERT INTO relations (from_record_id, relation_type, to_record_id) VALUES (?, 'gehoert_zu', ?)");
  stmt.run([recordId, targetId]);
  stmt.free();
}
function createPerson(name, funktion, abteilung) {
  const id = createRecord(db, "person");
  upsertFieldValue(db, id, "name", name || "");
  upsertFieldValue(db, id, "funktion", funktion || "");
  upsertFieldValue(db, id, "abteilung", abteilung || "");
  return id;
}
function deleteRecord(conn, id) {
  conn.run(`DELETE FROM records WHERE id = ${id}`); // Cascade loescht field_values/relations mit
}

// formSelector: ein einzelner Selector-String, ODER ein Array davon (fuer die
// Projekt-Seite, die jetzt aus drei parallelen Formularen besteht - ein
// geteiltes Feld wie vorgaenger_dok_id steht dann in ZWEI der drei
// Formulare, liefert aber (dank syncSharedProjektField) ueberall denselben
// Wert, deshalb ist es unschaedlich, wenn hier beide Vorkommen durchlaufen
// werden und das zweite den Wert des ersten einfach ueberschreibt).
function collectFormValuesFrom(formSelector) {
  const selectors = Array.isArray(formSelector) ? formSelector : [formSelector];
  const combined = selectors.map((s) => `${s} [data-key]`).join(", ");
  const values = {};
  document.querySelectorAll(combined).forEach((el) => {
    const key = el.dataset.key;
    if (key.endsWith("__freitext")) return; // separat behandelt
    if (el.type === "radio") {
      if (el.checked) values[key] = el.value;
    } else if (el.tagName === "SELECT" && el.value === "__other__") {
      const scope = el.closest("form") || document;
      const freitext = scope.querySelector(`[data-key="${key}__freitext"]`);
      values[key] = freitext ? freitext.value : "";
    } else if (el.dataset.type === "person") {
      if (el.value !== "__new__") values[key] = el.value;
      // __new__ wird beim Speichern separat als neue Person angelegt
    } else {
      values[key] = el.value;
    }
  });
  return values;
}
function collectFormValues() { return collectFormValuesFrom("#systemForm"); }
function collectProjektFormValues() { return collectFormValuesFrom(PROJEKT_FORM_SELECTORS); }

// Wird nach createPerson() gebraucht: ein <select data-type="person"> zeigt
// nur die <option>-Elemente, die beim Rendern des Formulars (aus dem damals
// aktuellen personCache) erzeugt wurden. Nach dem Anlegen einer neuen Person
// gibt es dafuer noch KEINE <option> - `el.value = String(newId)` wuerde
// sonst folgenlos verpuffen (der Browser kann keinen nicht vorhandenen
// <option>-Wert auswaehlen, das Select faellt zurueck auf "" = "– bitte
// wählen –"). Deshalb hier VOR dem Setzen von .value die <option> in JEDES
// Personen-Select im Dokument nachtragen (nicht nur ins gerade befuellte -
// derselbe Datensatz kann ja aus jedem anderen Rollen-Feld heraus ebenfalls
// ausgewaehlt werden wollen).
function addPersonOptionEverywhere(id, name) {
  document.querySelectorAll('select[data-type="person"]').forEach((sel) => {
    if (Array.from(sel.options).some((o) => o.value === String(id))) return;
    const opt = document.createElement("option");
    opt.value = String(id);
    opt.textContent = name || "(ohne Namen)";
    sel.insertBefore(opt, sel.querySelector('option[value="__new__"]'));
  });
}

function saveAll() {
  db.run("BEGIN");
  try {
    // 1. Neue Personen (Rollen-Felder auf "__new__") zuerst anlegen
    document.querySelectorAll('#systemForm select[data-type="person"]').forEach((el) => {
      if (el.value === "__new__") {
        const wrap = document.querySelector(`[data-personnew-for="${el.dataset.key}"]`);
        const name = wrap.querySelector('[data-newperson-field="name"]').value;
        const funktion = wrap.querySelector('[data-newperson-field="funktion"]').value;
        const abteilung = wrap.querySelector('[data-newperson-field="abteilung"]').value;
        const newId = createPerson(name, funktion, abteilung);
        addPersonOptionEverywhere(newId, name);
        el.value = String(newId);
      }
    });

    // 2. Systemdatensatz anlegen (Szenario 1/2) oder wiederverwenden (Szenario 3)
    let systemId = currentSystemId;
    if (systemId == null) systemId = createRecord(db, "system");

    // 3. Werte upserten + grobe Historie fuer geaenderte Felder
    const values = collectFormValues();
    Object.entries(values).forEach(([key, val]) => {
      const alt = baseline[key];
      if (alt !== undefined && alt !== val) insertChangeLog(db, systemId, key, alt, val);
      upsertFieldValue(db, systemId, key, val);
    });

    // 4. Zusatzlisten (Anforderung/Risiko/Pruefschritt): neu/geaendert speichern, geloeschte entfernen
    Object.entries(listState).forEach(([entityType, rows]) => {
      rows.forEach((row) => {
        if (row.geloescht) {
          if (row.id != null) deleteRecord(db, row.id);
          return;
        }
        let recId = row.id;
        if (recId == null) {
          recId = createRecord(db, entityType);
          linkToSystem(db, recId, systemId);
        }
        Object.entries(row.werte).forEach(([k, v]) => upsertFieldValue(db, recId, k, v));
        row.id = recId;
      });
      listState[entityType] = rows.filter((r) => !r.geloescht);
    });

    db.run("COMMIT");
    currentSystemId = systemId;
    loadPersonCache();
    loadSystemCache();
    return true;
  } catch (e) {
    db.run("ROLLBACK");
    console.error("Speichern fehlgeschlagen", e);
    return false;
  }
}

function saveProjektAll() {
  projektDb.run("BEGIN");
  try {
    // 0. Neue Personen (Rollen-Felder auf "__new__") anlegen - z.B. die
    // "Personen (Dokumentenfreigabe)"-Gruppe. Personen leben in der
    // System-DB, nicht der Projekt-DB (daher "&& db"). Ein geteiltes Feld
    // (z.B. df_pruefer_bso) steht als ZWEI DOM-Elemente da (VP- UND
    // VB-Formular, gleicher data-key, per syncSharedProjektField() im Wert
    // synchron) - pro Feld-Key darf trotzdem nur EINMAL eine Person
    // angelegt werden, nicht einmal pro Vorkommen.
    const angelegtePersonenKeys = new Set();
    document.querySelectorAll(PROJEKT_FORM_SELECTORS.map((s) => `${s} select[data-type="person"]`).join(", ")).forEach((el) => {
      const key = el.dataset.key;
      if (el.value !== "__new__" || !db || angelegtePersonenKeys.has(key)) return;
      angelegtePersonenKeys.add(key);
      // Von allen Vorkommen dieses Feldes dasjenige nehmen, dessen "Neue
      // Person"-Eingabe tatsaechlich befuellt ist (die anderen Vorkommen
      // sind zwar auf "__new__" synchronisiert, ihr Eingabe-Wrap aber leer,
      // weil syncSharedProjektField() nur den Select-Wert spiegelt).
      const wraps = Array.from(document.querySelectorAll(`[data-personnew-for="${key}"]`));
      const wrap = wraps.find((w) => w.querySelector('[data-newperson-field="name"]').value.trim()) || wraps[0];
      const name = wrap.querySelector('[data-newperson-field="name"]').value;
      const funktion = wrap.querySelector('[data-newperson-field="funktion"]').value;
      const abteilung = wrap.querySelector('[data-newperson-field="abteilung"]').value;
      const newId = createPerson(name, funktion, abteilung);
      addPersonOptionEverywhere(newId, name);
      document.querySelectorAll(`[data-key="${key}"][data-type="person"]`).forEach((sharedEl) => { sharedEl.value = String(newId); });
    });

    // 1. Projekt-Datensatz anlegen (Szenario "neu") oder wiederverwenden ("bearbeiten")
    let projektId = currentProjektId;
    if (projektId == null) projektId = createRecord(projektDb, "projekt");

    // 2. Werte upserten + grobe Historie fuer geaenderte Felder
    const values = collectProjektFormValues();
    Object.entries(values).forEach(([key, val]) => {
      const alt = projektBaseline[key];
      if (alt !== undefined && alt !== val) insertChangeLog(projektDb, projektId, key, alt, val);
      upsertFieldValue(projektDb, projektId, key, val);
    });

    // 3. Zusatzlisten (Versionshistorie/Lieferanten-Verantwortlichkeit)
    Object.entries(projektListState).forEach(([entityType, rows]) => {
      rows.forEach((row) => {
        if (row.geloescht) {
          if (row.id != null) deleteRecord(projektDb, row.id);
          return;
        }
        let recId = row.id;
        if (recId == null) {
          recId = createRecord(projektDb, entityType);
          linkToSystem(projektDb, recId, projektId);
        }
        Object.entries(row.werte).forEach(([k, v]) => upsertFieldValue(projektDb, recId, k, v));
        row.id = recId;
      });
      projektListState[entityType] = rows.filter((r) => !r.geloescht);
    });

    projektDb.run("COMMIT");
    currentProjektId = projektId;
    loadProjektCache();
    if (angelegtePersonenKeys.size) loadPersonCache(); // neu angelegte Personen (liegen in db, nicht projektDb)
    return true;
  } catch (e) {
    projektDb.run("ROLLBACK");
    console.error("Speichern (Projekt-DB) fehlgeschlagen", e);
    return false;
  }
}

// ---------------------------------------------------------------- Bedingte Sichtbarkeit ("nur wenn X = Y")
// Nutzer-Feedback 05.09.: "nur wenn ki_vorhanden = ja" war bisher nur ein
// Hinweistext, das Feld blieb trotzdem immer sichtbar. Jetzt wird dieser
// Hinweis (sop_hinweis-Konvention, siehe db/schema.sql) auch tatsaechlich
// ausgewertet - betrifft nicht nur die KI-Stufen, sondern generisch alle
// gut 60 Felder mit demselben Muster (IQ/OQ/PQ/PPQ-Abschlussbericht,
// Tabelle 6.2 Begruendungen/Dok-IDs, Kap. 1.4/2.1/2.2-Beschreibungen, ...).
function parseFieldCondition(def) {
  if (!def.sop_hinweis) return null;
  const m = def.sop_hinweis.match(/^nur wenn\s+([a-zA-Z0-9_]+)\s*=\s*(\S+)/i);
  return m ? { key: m[1], value: m[2] } : null;
}
function applyFieldConditions(formSelector) {
  document.querySelectorAll(`${formSelector} [data-cond-key]`).forEach((wrap) => {
    const actual = fieldValueIn(formSelector, wrap.dataset.condKey);
    wrap.classList.toggle("cond-hidden", actual !== wrap.dataset.condValue);
  });
}

// ---------------------------------------------------------------- Rendering: Felder
function fieldInputHtml(def, uniqueKey) {
  const reqMark = def.pflichtfeld ? '<span class="req">*</span>' : "";
  let inputHtml = "";
  let hintHtml = "";

  if (def.datentyp === "person_referenz") {
    const options = personCache.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
    inputHtml = `<select data-key="${uniqueKey}" data-type="person">
        <option value="">– bitte wählen –</option>${options}<option value="__new__">+ Neue Person anlegen</option>
      </select>
      <div class="person-info" data-personinfo-for="${uniqueKey}"></div>
      <div class="person-new" data-personnew-for="${uniqueKey}" style="display:none">
        <input type="text" placeholder="Name (Nachname, Vorname)" data-newperson-field="name">
        <input type="text" placeholder="Funktion" data-newperson-field="funktion">
        <input type="text" placeholder="Abteilung" data-newperson-field="abteilung">
      </div>`;
  } else if (def.datentyp === "auswahl") {
    const opts = (def.optionen || []).map((o) => `<option value="${escapeHtml(optionValue(o))}">${escapeHtml(optionValue(o))}</option>`).join("");
    const freitextOpt = def.freitext_erlaubt ? `<option value="__other__">Andere / abweichender Wert</option>` : "";
    inputHtml = `<select data-key="${uniqueKey}" data-entity="${def.entity_type}" data-fieldkey="${def.key}"><option value=""></option>${opts}${freitextOpt}</select>`;
    if (def.freitext_erlaubt) {
      inputHtml += `<input type="text" data-key="${uniqueKey}__freitext" placeholder="Abweichender Wert" style="display:none;margin-top:6px">`;
    }
    hintHtml = `<div class="fieldhint" data-optionhint-for="${uniqueKey}"></div>`;
  } else if (def.datentyp === "mehrzeiliger_text") {
    inputHtml = `<textarea data-key="${uniqueKey}"></textarea>`;
  } else if (def.datentyp === "ja_nein") {
    inputHtml = `<div class="yn">
        <label><input type="radio" name="${uniqueKey}" data-key="${uniqueKey}" value="ja"> Ja</label>
        <label><input type="radio" name="${uniqueKey}" data-key="${uniqueKey}" value="nein"> Nein</label>
      </div>`;
  } else if (def.datentyp === "datum") {
    inputHtml = `<input type="date" data-key="${uniqueKey}">`;
  } else {
    inputHtml = `<input type="text" data-key="${uniqueKey}"${def.format_hinweis ? ` placeholder="${escapeHtml(def.format_hinweis.replace(/^[^:]+:\s*/, ""))}"` : ""}>`;
  }
  if (!hintHtml && (def.format_hinweis || def.sop_hinweis)) {
    hintHtml = `<div class="fieldhint">${escapeHtml([def.format_hinweis, def.sop_hinweis].filter(Boolean).join(" · "))}</div>`;
  }
  const fullClass = def.datentyp === "mehrzeiliger_text" ? " full" : "";
  const cond = parseFieldCondition(def);
  const condAttrs = cond ? ` data-cond-key="${escapeHtml(cond.key)}" data-cond-value="${escapeHtml(cond.value)}"` : "";
  // Kein data-key auf dem Wrapper-Div (nur auf dem eigentlichen Eingabeelement) -
  // sonst matchen [data-key="..."]-Selektoren zwei Elemente (Div + Input/Select).
  return `<div class="field${fullClass}" data-entity="${def.entity_type}" data-fieldkey="${def.key}"${condAttrs}><label>${escapeHtml(def.label)}${reqMark}</label>${inputHtml}${hintHtml}</div>`;
}

function renderForm() {
  const form = document.getElementById("systemForm");
  form.innerHTML = "";
  groupsFor("system").forEach((group) => {
    if (group.name === "Status" && !currentSystemId && scenario === "leer") {
      // "Ist aktuelle Version?" ergibt bei komplett neuen Systemen (noch) keinen Sinn anzuzeigen
    }
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h2>${escapeHtml(group.name)}<span class="tag">immer</span></h2>`;
    const fieldsDiv = document.createElement("div");
    fieldsDiv.className = "fields";
    group.fields.forEach((def) => { fieldsDiv.innerHTML += fieldInputHtml(def, def.key); });
    card.appendChild(fieldsDiv);
    form.appendChild(card);
  });

  // Testtiefe: automatisch berechnet, kein Eingabefeld
  const card = document.createElement("div");
  card.className = "card computed";
  card.innerHTML = `<h2>Testtiefe (automatisch)<span class="tag">immer</span></h2>
    <div style="padding:14px 16px">
      <div class="field computed">
        <div class="value" id="testtiefeWert">– bitte GxP-Kritikalität und GAMP-Kategorie wählen –</div>
        <div class="basis">Automatisch abgeleitet aus GxP-Kritikalität + GAMP-5-Software-Kategorie, gemäß Kapitel 8 der Systembewertung (QU-MT-0001344). Kein Eingabefeld.</div>
      </div>
    </div>`;
  form.appendChild(card);

  // KI-Reifegrad: automatisch berechnet, kein Eingabefeld
  const kiCard = document.createElement("div");
  kiCard.className = "card computed";
  kiCard.innerHTML = `<h2>KI-Reifegrad (automatisch)<span class="tag">immer</span></h2>
    <div style="padding:14px 16px">
      <div class="field computed">
        <div class="value" id="kiReifegradWert">– bitte "KI vorhanden?" beantworten –</div>
        <div class="basis">Wenn "KI vorhanden?" = nein: automatisch N/A. Sonst abgeleitet aus KI-Autonomie-Stufe + KI-Steuerungsdesign-Stufe, gemäß QU-OPE-2497575. Kein Eingabefeld.</div>
      </div>
    </div>`;
  form.appendChild(kiCard);

  form.querySelectorAll("[data-key]").forEach((el) => {
    el.addEventListener("input", () => onFieldUpdate(el));
    el.addEventListener("change", () => onFieldUpdate(el));
  });
  recomputeTesttiefe();
  recomputeKiReifegrad();
  applyFieldConditions("#systemForm");
}

// Die drei parallelen Projekt-Formulare (Basisdaten/VP/VB) teilen sich
// denselben Aufbau, nur mit unterschiedlichem mode-Filter (s.o.).
const PROJEKT_FORM_IDS = { immer: "projektForm", "CS-VP": "vpForm", "CS-VB": "vbForm" };
const PROJEKT_FORM_SELECTORS = Object.values(PROJEKT_FORM_IDS).map((id) => `#${id}`);
function buildProjektFormInto(mode) {
  const form = document.getElementById(PROJEKT_FORM_IDS[mode]);
  form.innerHTML = "";
  groupsFor("projekt", mode).forEach((group) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h2>${escapeHtml(group.name)}<span class="tag">${escapeHtml(groupBadge(group.fields))}</span></h2>`;
    const fieldsDiv = document.createElement("div");
    fieldsDiv.className = "fields";
    group.fields.forEach((def) => { fieldsDiv.innerHTML += fieldInputHtml(def, def.key); });
    card.appendChild(fieldsDiv);
    form.appendChild(card);
  });
  form.querySelectorAll("[data-key]").forEach((el) => {
    el.addEventListener("input", () => onFieldUpdate(el));
    el.addEventListener("change", () => onFieldUpdate(el));
  });
  applyFieldConditions(`#${PROJEKT_FORM_IDS[mode]}`);
}
function renderProjektForm() {
  buildProjektFormInto("immer");
  buildProjektFormInto("CS-VP");
  buildProjektFormInto("CS-VB");
}

// Ermittelt, zu welchem Formular/welcher Liste ein Eingabeelement gehoert -
// System-Formular/-Listen oder Projekt-Formular/-Listen. Listen-Zeilen sind
// KEIN Nachkomme von <form> (branchArea/projektBranchArea sind Geschwister-
// Divs), deshalb reicht "closest('form')" allein nicht.
const LIST_ENTITY_CONTEXT = {
  anforderung: "system", risiko: "system", pruefschritt: "system",
  versionshistorie_eintrag: "projekt", lieferant_verantwortlichkeit: "projekt", unexpected_event: "projekt",
};
const PROJEKT_FORM_ID_SET = new Set(Object.values(PROJEKT_FORM_IDS));
function contextFor(el) {
  const prefix = (el.dataset.key || "").split(".")[0];
  if (LIST_ENTITY_CONTEXT[prefix]) return LIST_ENTITY_CONTEXT[prefix];
  const form = el.closest("form");
  return form && PROJEKT_FORM_ID_SET.has(form.id) ? "projekt" : "system";
}
function baselineFor(ctx) { return ctx === "projekt" ? projektBaseline : baseline; }

function onFieldUpdate(el) {
  const key = el.dataset.key;
  if (key && key.endsWith("__freitext")) { markDirty(); return; }
  const ctx = contextFor(el);
  if (el.dataset.type === "person") {
    const personArea = document.querySelector(`[data-personnew-for="${key}"]`);
    const infoArea = document.querySelector(`[data-personinfo-for="${key}"]`);
    if (el.value === "__new__") {
      personArea.style.display = "grid";
      infoArea.textContent = "";
    } else {
      personArea.style.display = "none";
      const person = personCache.find((p) => String(p.id) === el.value);
      infoArea.textContent = person ? `${person.funktion} · ${person.abteilung}` : "";
    }
  }
  if (el.tagName === "SELECT" && el.dataset.entity && el.dataset.fieldkey) {
    const def = defFor(el.dataset.entity, el.dataset.fieldkey);
    if (def) {
      // Auf das naechste <form> beschraenkt (nicht global document.querySelector) -
      // ein Feld, das sowohl im VP- als auch im VB-Formular vorkommt (geteiltes
      // Feld), hat sonst zwei DOM-Elemente mit demselben data-key/data-optionhint-for.
      const scope = el.closest("form") || document;
      const hintArea = scope.querySelector(`[data-optionhint-for="${key}"]`);
      if (hintArea) {
        let text = "";
        if (def.optionen) {
          const opt = def.optionen.find((o) => optionValue(o) === el.value);
          text = opt ? optionErklaerung(opt) || "" : "";
        }
        if (!text) text = [def.format_hinweis, def.sop_hinweis].filter(Boolean).join(" · ");
        hintArea.textContent = text;
      }
      if (def.freitext_erlaubt) {
        const freitextInput = scope.querySelector(`[data-key="${key}__freitext"]`);
        if (freitextInput) freitextInput.style.display = el.value === "__other__" ? "block" : "none";
      }
    }
  }
  markChanged(el, ctx);
  markDirty();
  if (ctx === "system" && (key === "gxp_kritikalitaet" || key === "gamp_kategorie")) recomputeTesttiefe();
  if (ctx === "system" && (key === "ki_vorhanden" || key === "ki_autonomie_stufe" || key === "ki_steuerungsdesign_stufe")) recomputeKiReifegrad();
  if (ctx === "projekt") {
    syncSharedProjektField(el, key);
  } else {
    applyFieldConditions("#systemForm");
  }
}

// Ein Feld, das sowohl fuer CS-VP als auch CS-VB benoetigt wird (z.B.
// vorgaenger_dok_id, systembewertung_dok_id, NEU seit 05.09. auch
// vp_dok_id), erscheint jetzt in BEIDEN Formularen (#vpForm UND #vbForm) -
// Nutzer-Anfrage: "wenn ich sie im VP eingebe, sollte sie im VB Reiter
// bereits angezeigt werden". Deshalb bei jeder Aenderung den Wert in alle
// anderen Vorkommen desselben Feldschluessels spiegeln (nur Text/Ja-Nein-
// Felder betroffen - aktuell kein geteiltes Auswahl-Feld mit Freitext-
// Fluchtoption, dafuer waere zusaetzlich der "__freitext"-Wert zu spiegeln).
function syncSharedProjektField(sourceEl, key) {
  if (sourceEl.type === "radio" && !sourceEl.checked) return; // die jetzt angehakte Gegenseite loest ihren eigenen Sync selbst aus
  const value = sourceEl.value;
  PROJEKT_FORM_SELECTORS.forEach((sel) => {
    document.querySelectorAll(`${sel} [data-key="${key}"]`).forEach((el) => {
      if (el === sourceEl) return;
      if (el.type === "radio") el.checked = el.value === value;
      else el.value = value;
      markChanged(el, "projekt");
    });
  });
  PROJEKT_FORM_SELECTORS.forEach((sel) => applyFieldConditions(sel));
}

function recomputeTesttiefe() {
  const el = document.getElementById("testtiefeWert");
  if (!el) return;
  const krit = fieldValueIn("#systemForm", "gxp_kritikalitaet");
  const gamp = fieldValueIn("#systemForm", "gamp_kategorie");
  const row = TESTTIEFE_MATRIX[krit];
  const result = row ? row[gamp] : null;
  el.textContent = result || "– bitte GxP-Kritikalität und GAMP-Kategorie wählen –";
}
function recomputeKiReifegrad() {
  const el = document.getElementById("kiReifegradWert");
  if (!el) return;
  const vorhanden = fieldValueIn("#systemForm", "ki_vorhanden");
  if (vorhanden === "nein") {
    el.textContent = "N/A (keine KI im Einsatz)";
    return;
  }
  if (vorhanden !== "ja") {
    el.textContent = "– bitte \"KI vorhanden?\" beantworten –";
    return;
  }
  const autonomie = fieldValueIn("#systemForm", "ki_autonomie_stufe");
  const steuerung = fieldValueIn("#systemForm", "ki_steuerungsdesign_stufe");
  const row = KI_REIFEGRAD_MATRIX[autonomie];
  const result = row ? row[steuerung] : null;
  el.textContent = result || "– bitte Autonomie-Stufe und Steuerungsdesign-Stufe wählen –";
}
function fieldValueIn(formSelector, key) {
  const el = document.querySelector(`${formSelector} [data-key="${key}"]`);
  if (!el) return "";
  if (el.type === "radio") {
    const checked = document.querySelector(`${formSelector} input[name="${key}"]:checked`);
    return checked ? checked.value : "";
  }
  return el.value;
}
function fieldValue(key) { return fieldValueIn("#systemForm", key); }
function markChanged(el, ctx) {
  const key = el.dataset.key;
  const wrap = el.closest(".field");
  if (!wrap) return;
  const baselineObj = baselineFor(ctx || contextFor(el));
  const val = el.type === "radio" ? (document.querySelector(`input[name="${key}"]:checked`)?.value || "") : el.value;
  if (baselineObj[key] !== undefined && val !== baselineObj[key]) wrap.classList.add("changed");
  else wrap.classList.remove("changed");
}

// formSelectorOrArr: einzelner Selector-String ODER Array davon (Projekt-
// Seite: drei parallele Formulare statt einem, s.o.).
function fillFormValuesInto(formSelectorOrArr, values, baselineSetter) {
  const selectors = Array.isArray(formSelectorOrArr) ? formSelectorOrArr : [formSelectorOrArr];
  baselineSetter({ ...values });
  Object.entries(values).forEach(([key, val]) => {
    selectors.forEach((formSelector) => {
      document.querySelectorAll(`${formSelector} [data-key="${key}"]`).forEach((el) => {
        if (el.type === "radio") el.checked = el.value === val;
        else el.value = val || "";
      });
      document.querySelectorAll(`${formSelector} [data-key="${key}"][data-type="person"]`).forEach((el) => onFieldUpdate(el));
      document.querySelectorAll(`${formSelector} select[data-key="${key}"]`).forEach((el) => onFieldUpdate(el));
    });
  });
  selectors.forEach((formSelector) => {
    document.querySelectorAll(`${formSelector} .field`).forEach((w) => w.classList.remove("changed"));
    applyFieldConditions(formSelector);
  });
}
function clearFormFieldsIn(formSelectorOrArr, baselineSetter) {
  const selectors = Array.isArray(formSelectorOrArr) ? formSelectorOrArr : [formSelectorOrArr];
  baselineSetter({});
  selectors.forEach((formSelector) => {
    document.querySelectorAll(`${formSelector} input[type=text], ${formSelector} textarea, ${formSelector} input[type=date]`).forEach((el) => (el.value = ""));
    document.querySelectorAll(`${formSelector} select`).forEach((el) => { el.value = ""; onFieldUpdate(el); });
    document.querySelectorAll(`${formSelector} input[type=radio]`).forEach((el) => (el.checked = false));
    document.querySelectorAll(`${formSelector} .field`).forEach((w) => w.classList.remove("changed"));
    document.querySelectorAll(`${formSelector} .person-new`).forEach((el) => (el.style.display = "none"));
    applyFieldConditions(formSelector);
  });
}

function fillFormWithValues(values) {
  fillFormValuesInto("#systemForm", values, (v) => (baseline = v));
  recomputeTesttiefe();
  recomputeKiReifegrad(); // s.o.: bei ki_vorhanden=nein/leer wird sonst keine der beiden auslösenden Selects getroffen
  applyFieldConditions("#systemForm");
}
function clearFormFields() {
  clearFormFieldsIn("#systemForm", (v) => (baseline = v));
  recomputeTesttiefe();
  recomputeKiReifegrad();
}
function fillProjektFormWithValues(values) {
  fillFormValuesInto(PROJEKT_FORM_SELECTORS, values, (v) => (projektBaseline = v));
}
function clearProjektFormFields() {
  clearFormFieldsIn(PROJEKT_FORM_SELECTORS, (v) => (projektBaseline = v));
}

// ------------------------------------------------------ Suche (Kopie/Bearbeiten)
function searchableText(record) {
  return Object.entries(record.values)
    .filter(([k]) => !k.startsWith("rolle_"))
    .map(([, v]) => v)
    .join(" ")
    .toLowerCase();
}
function systemLabel(record) {
  const v = record.values;
  return `${v.systemname || "(ohne Namen)"} · MLCS-ID ${v.mlcs_id || "–"} · Anlage ${v.anlage || "–"} · ${v.gebaeude || "–"}`;
}
function renderSourceResults(query) {
  const results = document.getElementById("sourceResults");
  const q = query.trim().toLowerCase();
  const matches = systemCache.filter((r) => !q || searchableText(r).includes(q));
  if (!matches.length) {
    results.innerHTML = `<div class="combo-empty">Keine Treffer – Suchbegriff anpassen.</div>`;
  } else {
    results.innerHTML = matches
      .slice(0, 50)
      .map((r) => `<div class="combo-item" data-id="${r.id}"><b>${escapeHtml(r.values.systemname || "(ohne Namen)")}</b><span>MLCS-ID ${escapeHtml(r.values.mlcs_id || "–")} · Anlage ${escapeHtml(r.values.anlage || "–")} · ${escapeHtml(r.values.gebaeude || "–")}</span></div>`)
      .join("");
  }
  results.classList.add("open");
}
function selectSource(id) {
  const record = systemCache.find((r) => String(r.id) === String(id));
  if (!record) return;
  const search = document.getElementById("sourceSearch");
  const selected = document.getElementById("sourceSelected");
  const results = document.getElementById("sourceResults");
  results.classList.remove("open");
  search.value = "";
  selected.classList.add("visible");
  selected.innerHTML = `Ausgewählt: <b>${escapeHtml(systemLabel(record))}</b><button type="button" id="sourceChangeBtn">anderes wählen</button>`;
  document.getElementById("sourceChangeBtn").addEventListener("click", () => {
    selected.classList.remove("visible");
    search.value = "";
    search.focus();
    renderSourceResults("");
    resetToScenario(scenario);
  });

  if (scenario === "kopie") {
    currentSystemId = null; // Kopie => NEUER Datensatz
    fillFormWithValues(record.values);
    loadListsForBranch(null); // leere Listen fuer den neuen Datensatz
  } else if (scenario === "bearbeiten") {
    currentSystemId = record.id;
    fillFormWithValues(record.values);
    loadListsForBranch(record.id);
  }
  document.getElementById("statusNote").textContent = "Werte übernommen (blau umrandet = von dir geändert).";
}

// ------------------------------------------------------ Suche (Projekt-Tab)
function projektLabel(record) {
  const v = record.values;
  return `${v.projektbezeichnung || "(ohne Projektbezeichnung)"} · MLCS-ID ${v.mlcs_id || "–"} · FV ${v.folgeversion || "–"}`;
}
function renderProjektSourceResults(query) {
  const results = document.getElementById("projektSourceResults");
  const q = query.trim().toLowerCase();
  const matches = projektCache.filter((r) => !q || searchableText(r).includes(q));
  if (!matches.length) {
    results.innerHTML = `<div class="combo-empty">Keine Treffer – Suchbegriff anpassen.</div>`;
  } else {
    results.innerHTML = matches
      .slice(0, 50)
      .map((r) => `<div class="combo-item" data-id="${r.id}"><b>${escapeHtml(r.values.projektbezeichnung || "(ohne Projektbezeichnung)")}</b><span>MLCS-ID ${escapeHtml(r.values.mlcs_id || "–")} · Folgeversion ${escapeHtml(r.values.folgeversion || "–")}</span></div>`)
      .join("");
  }
  results.classList.add("open");
}
function selectProjektSource(id) {
  const record = projektCache.find((r) => String(r.id) === String(id));
  if (!record) return;
  const search = document.getElementById("projektSourceSearch");
  const selected = document.getElementById("projektSourceSelected");
  const results = document.getElementById("projektSourceResults");
  results.classList.remove("open");
  search.value = "";
  selected.classList.add("visible");
  selected.innerHTML = `Ausgewählt: <b>${escapeHtml(projektLabel(record))}</b><button type="button" id="projektSourceChangeBtn">anderes wählen</button>`;
  document.getElementById("projektSourceChangeBtn").addEventListener("click", () => {
    selected.classList.remove("visible");
    search.value = "";
    search.focus();
    renderProjektSourceResults("");
    resetToProjektScenario(projektScenario);
  });
  currentProjektId = record.id;
  fillProjektFormWithValues(record.values);
  loadProjektListsForBranch(record.id);
  document.getElementById("statusNote").textContent = "Werte übernommen (blau umrandet = von dir geändert).";
}

// Hilfsmittel im Projekt-Tab: System suchen, um nur das mlcs_id-Feld im
// Projekt-Formular korrekt zu befuellen (keine feste Verknuepfung, nur ein
// Feldwert - siehe KONZEPT.md Abschnitt 2.1).
function renderSystemHelperResults(query) {
  const results = document.getElementById("systemHelperResults");
  const q = query.trim().toLowerCase();
  const matches = systemCache.filter((r) => !q || searchableText(r).includes(q));
  if (!matches.length) {
    results.innerHTML = `<div class="combo-empty">Keine Treffer – Suchbegriff anpassen.</div>`;
  } else {
    results.innerHTML = matches
      .slice(0, 50)
      .map((r) => `<div class="combo-item" data-id="${r.id}"><b>${escapeHtml(r.values.systemname || "(ohne Namen)")}</b><span>MLCS-ID ${escapeHtml(r.values.mlcs_id || "–")} · Anlage ${escapeHtml(r.values.anlage || "–")} · ${escapeHtml(r.values.gebaeude || "–")}</span></div>`)
      .join("");
  }
  results.classList.add("open");
}
function selectSystemHelper(id) {
  const record = systemCache.find((r) => String(r.id) === String(id));
  if (!record) return;
  const search = document.getElementById("systemHelperSearch");
  const selected = document.getElementById("systemHelperSelected");
  const results = document.getElementById("systemHelperResults");
  results.classList.remove("open");
  search.value = "";
  selected.classList.add("visible");
  selected.innerHTML = `Ausgewählt: <b>${escapeHtml(systemLabel(record))}</b><button type="button" id="systemHelperChangeBtn">anderes wählen</button>`;
  document.getElementById("systemHelperChangeBtn").addEventListener("click", () => {
    selected.classList.remove("visible");
    search.value = "";
    search.focus();
  });
  const mlcsField = document.querySelector('#projektForm [data-key="mlcs_id"]');
  if (mlcsField) {
    mlcsField.value = record.values.mlcs_id || "";
    onFieldUpdate(mlcsField);
  }
}

// ---------------------------------------------------------------- Szenarien
function setScenario(newScenario) {
  scenario = newScenario;
  document.querySelectorAll("#systemTabContent .scenario-btn").forEach((b) => b.classList.toggle("active", b.dataset.scenario === newScenario));
  resetToScenario(newScenario);
}
function resetToScenario(newScenario) {
  const picker = document.getElementById("sourcePicker");
  const label = document.getElementById("sourceLabel");
  const hint = document.getElementById("sourceHint");
  const note = document.getElementById("statusNote");
  document.getElementById("sourceSearch").value = "";
  document.getElementById("sourceSelected").classList.remove("visible");
  document.getElementById("sourceResults").classList.remove("open");
  currentSystemId = null;
  clearFormFields();
  loadListsForBranch(null);

  if (newScenario === "leer") {
    picker.classList.remove("visible");
    note.textContent = "Neuer, leerer Datensatz – wird beim Speichern angelegt.";
  } else if (newScenario === "kopie") {
    picker.classList.add("visible");
    label.textContent = "Als Vorlage übernehmen von:";
    hint.textContent = "Alle Werte des gewählten Systems werden übernommen und sichtbar angezeigt. Es entsteht ein NEUER Datensatz – nur abweichende Felder werden von dir überschrieben.";
    note.textContent = "Bitte Vorlage wählen.";
  } else if (newScenario === "bearbeiten") {
    picker.classList.add("visible");
    label.textContent = "Zu bearbeitendes System:";
    hint.textContent = "Der BESTEHENDE Datensatz wird geladen und beim Speichern aktualisiert (kein neuer Datensatz).";
    note.textContent = "Bitte System wählen.";
  }
}

function setProjektScenario(newScenario) {
  projektScenario = newScenario;
  document.querySelectorAll("#projektKontextBar .scenario-btn").forEach((b) => b.classList.toggle("active", b.dataset.scenario === newScenario));
  resetToProjektScenario(newScenario);
}
function resetToProjektScenario(newScenario) {
  const picker = document.getElementById("projektSourcePicker");
  const note = document.getElementById("statusNote");
  document.getElementById("projektSourceSearch").value = "";
  document.getElementById("projektSourceSelected").classList.remove("visible");
  document.getElementById("projektSourceResults").classList.remove("open");
  currentProjektId = null;
  clearProjektFormFields();
  loadProjektListsForBranch(null);

  if (newScenario === "neu") {
    picker.classList.remove("visible");
    note.textContent = "Neues Projekt – wird beim Speichern angelegt. MLCS-ID unten eintragen (Hilfsmittel: System suchen).";
  } else if (newScenario === "bearbeiten") {
    picker.classList.add("visible");
    note.textContent = "Bitte Projekt wählen.";
  }
}

// ---------------------------------------------------------------- Zusatzlisten (Branch)
// Alle Listen-Funktionen nehmen "store" (das jeweilige *ListState-Objekt)
// und "rerender" (Callback, der die Liste neu zeichnet) als Parameter -
// dieselben Funktionen bedienen sowohl die System-DB-Listen (Anforderung/
// Risiko/Prüfschritt, store=listState) als auch die Projekt-DB-Listen
// (Versionshistorie/Lieferanten-Verantwortlichkeit, store=projektListState).
function loadListsForBranch(systemId) {
  listState = {
    anforderung: getRelatedRecords(db, "anforderung", systemId),
    risiko: getRelatedRecords(db, "risiko", systemId),
    pruefschritt: getRelatedRecords(db, "pruefschritt", systemId),
  };
  renderBranch(currentDocType);
}
function loadProjektListsForBranch(projektId) {
  projektListState = {
    versionshistorie_eintrag: getRelatedRecords(projektDb, "versionshistorie_eintrag", projektId),
    lieferant_verantwortlichkeit: getRelatedRecords(projektDb, "lieferant_verantwortlichkeit", projektId),
    unexpected_event: getRelatedRecords(projektDb, "unexpected_event", projektId),
  };
  renderProjektBranch();
}
function addListRow(store, entityType, rerender) {
  store[entityType].push({ id: null, geloescht: false, werte: {} });
  rerender();
  markDirty();
}
function removeListRow(store, entityType, index, rerender) {
  const row = store[entityType][index];
  if (row.id == null) store[entityType].splice(index, 1);
  else row.geloescht = true;
  rerender();
  markDirty();
}
function renderListRow(entityType, row, index) {
  const defs = fieldDefsByEntity[entityType] || [];
  const wrap = document.createElement("div");
  wrap.className = "list-row";
  wrap.innerHTML = `<button type="button" class="remove-row" data-remove="${entityType}:${index}">Zeile entfernen</button>`;
  const fieldsDiv = document.createElement("div");
  fieldsDiv.className = "fields";
  defs.forEach((def) => {
    const uniqueKey = `${entityType}.${index}.${def.key}`;
    fieldsDiv.innerHTML += fieldInputHtml(def, uniqueKey);
  });
  wrap.appendChild(fieldsDiv);
  return wrap;
}
function renderBranchSection(store, entityType, isOptional, tagLabel, rerender) {
  const card = document.createElement("div");
  card.className = "card branch" + (isOptional ? " optional" : "");
  const tag = isOptional ? `optional · ${tagLabel}` : `pflicht · ${tagLabel}`;
  card.innerHTML = `<h2>${escapeHtml(ENTITY_LABEL[entityType])}<span class="tag">${escapeHtml(tag)}</span></h2>`;
  const rows = store[entityType] || [];
  const body = document.createElement("div");
  body.style.padding = "16px";
  rows.forEach((row, i) => { if (!row.geloescht) body.appendChild(renderListRow(entityType, row, i)); });
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-row-btn";
  addBtn.textContent = `+ ${ENTITY_LABEL[entityType]} hinzufügen`;
  addBtn.addEventListener("click", () => addListRow(store, entityType, rerender));
  body.appendChild(addBtn);
  card.appendChild(body);
  return card;
}
function bindListRowInputs(container, entityType, store, rerender) {
  container.querySelectorAll(`[data-key^="${entityType}."]`).forEach((el) => {
    el.addEventListener("input", () => syncListRowValue(el, entityType, store));
    el.addEventListener("change", () => { onFieldUpdate(el); syncListRowValue(el, entityType, store); });
  });
  container.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [ent, idx] = btn.dataset.remove.split(":");
      removeListRow(store, ent, Number(idx), rerender);
    });
  });
}
function syncListRowValue(el, entityType, store) {
  const parts = el.dataset.key.split(".");
  if (parts.length < 3) return;
  const index = Number(parts[1]);
  const fieldKey = parts.slice(2).join(".");
  if (fieldKey.endsWith("__freitext")) return;
  const row = store[entityType][index];
  if (!row) return;
  if (el.type === "radio") { if (el.checked) row.werte[fieldKey] = el.value; }
  else row.werte[fieldKey] = el.value;
  markDirty();
}
function renderBranch(docType) {
  currentDocType = docType;
  const area = document.getElementById("branchArea");
  const rerender = () => renderBranch(currentDocType);
  area.innerHTML = "";
  if (!docType) {
    area.innerHTML = `<div class="branch-note">Kein Dokument gewählt – es werden nur die dokumentübergreifenden Basisdaten oben erfasst.</div>`;
    return;
  }
  const branch = BRANCH_CONFIG[docType] || { pflicht: [], optional: [] };

  if (branch.pflicht.length) {
    const heading = document.createElement("h3");
    heading.className = "branch-heading";
    heading.textContent = `Notwendige Zusatzfelder für ${docType}`;
    area.appendChild(heading);
    branch.pflicht.forEach((ent) => area.appendChild(renderBranchSection(listState, ent, false, docType, rerender)));
  }
  if (branch.optional.length) {
    const heading = document.createElement("h3");
    heading.className = "branch-heading optional";
    heading.innerHTML = `Optionale Zusatzfelder für ${docType} <span class="tag">kannst du überspringen</span>`;
    area.appendChild(heading);
    branch.optional.forEach((ent) => area.appendChild(renderBranchSection(listState, ent, true, docType, rerender)));
    // appendChild (nicht innerHTML+=) - sonst wuerden die per addEventListener
    // gebundenen Klick-Handler der oben bereits eingefuegten Buttons beim
    // Neu-Parsen des HTML-Strings verloren gehen (siehe Bugfix E2E-Test).
    const note = document.createElement("div");
    note.className = "branch-note";
    note.textContent = "Optional heißt: das Speichern der Daten oben hängt nicht davon ab, ob diese Liste gefüllt ist.";
    area.appendChild(note);
  }
  if (!branch.pflicht.length && !branch.optional.length) {
    area.innerHTML = `<div class="branch-note">Für ${escapeHtml(docType)} sind aktuell noch keine dokumentspezifischen Zusatzfelder erfasst – nur die Basisdaten oben werden verwendet.</div>`;
  }
  ["anforderung", "risiko", "pruefschritt"].forEach((ent) => bindListRowInputs(area, ent, listState, rerender));
}

// Projekt-DB-Aequivalent zu renderBranch(): immer beide Listen zeigen (nicht
// dokumenttyp-abhaengig - die Projekt-DB ist inhaltlich ohnehin auf CS-VP
// ausgelegt, siehe seed_field_definitions_projekt.sql).
// Wie bei groupsFor("projekt", docType): eine Liste (versionshistorie_eintrag/
// lieferant_verantwortlichkeit/unexpected_event) wird nur gezeigt, wenn
// mindestens eines ihrer Felder "immer" oder die gewaehlte Dokumentart
// benoetigt. Ohne gewaehlte Dokumentart (docType="") ungefiltert, wie bisher.
// Anders als bei einzelnen Feldern wird eine ganze Liste (Versionshistorie/
// Lieferanten-Verantwortlichkeit/Unexpected Event) NICHT in mehreren Tabs
// dupliziert (das wuerde ihren eigenen Sync-Mechanismus brauchen, live
// waehrend des Tippens - siehe syncSharedProjektField() fuer einzelne
// Felder). Stattdessen bekommt jede Liste EINEN festen Tab: die
// Versionshistorie betrifft das Projekt als Ganzes (Tab "Projekt"), die
// beiden anderen sind ohnehin nur fuer je eine Dokumentart relevant.
const PROJEKT_LIST_AREA_MODE = {
  versionshistorie_eintrag: "immer",
  lieferant_verantwortlichkeit: "CS-VP",
  unexpected_event: "CS-VB",
};
const PROJEKT_BRANCH_AREA_IDS = { immer: "projektBranchArea", "CS-VP": "vpBranchArea", "CS-VB": "vbBranchArea" };
function buildProjektBranchInto(mode) {
  const area = document.getElementById(PROJEKT_BRANCH_AREA_IDS[mode]);
  const rerender = () => renderProjektBranch();
  area.innerHTML = "";
  const entities = Object.keys(PROJEKT_LIST_AREA_MODE).filter((ent) => PROJEKT_LIST_AREA_MODE[ent] === mode);
  entities.forEach((ent) => area.appendChild(renderBranchSection(projektListState, ent, false, mode, rerender)));
  entities.forEach((ent) => bindListRowInputs(area, ent, projektListState, rerender));
}
function renderProjektBranch() {
  buildProjektBranchInto("immer");
  buildProjektBranchInto("CS-VP");
  buildProjektBranchInto("CS-VB");
}

// ---------------------------------------------------------------- Dirty/Save/Load-UI
function markDirty() { setDirty(true); }
function setDirty(value) {
  if (PROJEKT_TABS.has(activeTab)) projektDirty = value; else systemDirty = value;
  const current = PROJEKT_TABS.has(activeTab) ? projektDirty : systemDirty;
  document.querySelectorAll(".dirty-indicator").forEach((el) => {
    el.textContent = current ? "● Ungespeicherte Änderungen" : "Keine ungespeicherten Änderungen";
    el.classList.toggle("dirty", current);
  });
}
window.addEventListener("beforeunload", (e) => {
  if (!systemDirty && !projektDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

async function writeBytesToDisk(bytes, handle, suggestedName) {
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();
    return "geschrieben";
  }
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "heruntergeladen";
}
async function writeDbToDisk() { return writeBytesToDisk(exportDbBytes(), fileHandle, "masterform_system.sqlite"); }
async function writeProjektDbToDisk() { return writeBytesToDisk(exportProjektDbBytes(), projektFileHandle, "masterform_projekt.sqlite"); }

// ---------------------------------------------------------------- Dokument-Export (Nutzer-Anfrage 05.09.:
// "Abschlussknopf, wo man den VB erstellen kann"). Noch KEIN fertiges .docx -
// das eigentliche Ausfuellen laeuft aktuell ausserhalb des Browsers (Python-
// Fill-Skript, siehe KONZEPT.md Abschnitt 5, Option A). Dieser Knopf liefert
// aber schon die dafuer noetige, vollstaendige Datengrundlage in EINER Datei
// (System- + Projektwerte + Zusatzlisten fuer das aktuell gewaehlte
// Projekt) - erspart das manuelle Zusammensuchen aus zwei .sqlite-Dateien.
function currentProjektExportPayload() {
  const projektValues = collectProjektFormValues();
  const mlcsId = projektValues.mlcs_id || "";
  const systemRecord = systemCache.find((r) => String(r.values.mlcs_id || "") === String(mlcsId));
  const listen = {};
  Object.entries(projektListState).forEach(([entityType, rows]) => {
    listen[entityType] = rows.filter((r) => !r.geloescht).map((r) => r.werte);
  });
  return {
    exportiert_am: new Date().toISOString(),
    mlcs_id: mlcsId,
    system: systemRecord ? systemRecord.values : null,
    projekt: projektValues,
    listen,
  };
}
function exportProjektData(docType) {
  const payload = currentProjektExportPayload();
  if (!payload.system) {
    if (!confirm(`Kein System mit MLCS-ID "${payload.mlcs_id}" in der geladenen System-Datenbank gefunden - trotzdem ohne Systemdaten exportieren?`)) return;
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `masterform_export_${docType}_${payload.mlcs_id || "ohne-mlcs-id"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  document.getElementById("statusNote").textContent = `${docType}-Datenexport heruntergeladen (Grundlage für die Dokumenterstellung).`;
}

// ============================================================ In-Browser-Word-Dokumenterzeugung (KONZEPT.md Abschnitt 5, Option B)
// Die echten .docx-Vorlagen sind proprietaer und liegen deshalb NICHT in
// dieser App/im Repo, sondern in einem eigenen Ordner auf dem Rechner der
// Nutzerin/des Nutzers. Der Browser fragt (per File System Access API)
// einmalig nach diesem Ordner und merkt sich den Zugriff (IndexedDB) fuer
// naechste Male - danach automatisch, ohne dass die Datei jedes Mal neu
// "hochgeladen" werden muss. Welche Datei im Ordner die richtige ist, wird
// NICHT ueber den Dateinamen entschieden (zu fehleranfaellig, siehe
// Nutzer-Feedback), sondern ueber einen Inhalts-Check: die Datei muss die
// Dok-Nr. der jeweiligen Vorlage tatsaechlich im Fließtext enthalten.
const TEMPLATE_MARKERS = {
  VB: { label: "CS-Validierungsbericht (CS-VB)", markerText: "QU-MT-0003543" },
  VP: { label: "CS-Validierungsplan (CS-VP)", markerText: "QU-MT-0000722" },
};
const TEMPLATE_DIR_DB = "masterform_template_dir";
const TEMPLATE_DIR_KEY = "vorlagenOrdner";

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TEMPLATE_DIR_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("handles");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGetDirHandle() {
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("handles", "readonly");
      const req = tx.objectStore("handles").get(TEMPLATE_DIR_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
async function idbSetDirHandle(handle) {
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("handles", "readwrite");
      tx.objectStore("handles").put(handle, TEMPLATE_DIR_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* IndexedDB nicht verfuegbar - Ordner muss dann jedes Mal neu gewaehlt werden */
  }
}

// Merkt sich innerhalb der laufenden Session zusaetzlich schon gefundene/
// geprüfte Vorlagen-Dateien, damit nicht bei jedem Klick der ganze Ordner
// erneut nach Inhalt durchsucht werden muss.
const templateFileCache = {};

async function ensureTemplateDirHandle() {
  if (typeof window.showDirectoryPicker !== "function") return null; // Fallback siehe pickTemplateFileManually()
  let handle = await idbGetDirHandle();
  if (handle) {
    try {
      const perm = await handle.queryPermission({ mode: "read" });
      if (perm === "granted" || (await handle.requestPermission({ mode: "read" })) === "granted") {
        return handle;
      }
    } catch {
      /* Handle evtl. veraltet/Ordner geloescht - neu waehlen */
    }
  }
  handle = await window.showDirectoryPicker({ id: "masterform-vorlagen", mode: "read" });
  await idbSetDirHandle(handle);
  return handle;
}

async function findTemplateInDir(dirHandle, markerText) {
  for await (const [name, entryHandle] of dirHandle.entries()) {
    if (entryHandle.kind !== "file" || !name.toLowerCase().endsWith(".docx")) continue;
    try {
      const file = await entryHandle.getFile();
      const bytes = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(bytes);
      const xml = await zip.file("word/document.xml").async("string");
      if (xml.includes(markerText)) return bytes;
    } catch {
      /* keine lesbare .docx - ueberspringen */
    }
  }
  return null;
}

// Fallback, falls die File System Access API nicht verfuegbar ist (z.B.
// Firefox): normaler Datei-Auswahl-Dialog, jedes Mal neu, aber mit
// demselben Inhalts-Check.
function pickTemplateFileManually(markerText) {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".docx";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return reject(new Error("Keine Datei ausgewählt."));
      const bytes = await file.arrayBuffer();
      try {
        const zip = await JSZip.loadAsync(bytes);
        const xml = await zip.file("word/document.xml").async("string");
        if (!xml.includes(markerText)) {
          reject(new Error(`Diese Datei enthält die Dok-Nr. "${markerText}" nicht - falsche Vorlage ausgewählt?`));
          return;
        }
      } catch {
        reject(new Error("Datei konnte nicht als Word-Dokument gelesen werden."));
        return;
      }
      resolve(bytes);
    };
    input.click();
  });
}

// Erlaubt es, den Vorlagen-Ordner jederzeit bewusst neu zu waehlen (statt
// nur implizit, wenn der gespeicherte Zugriff mal ungueltig wird) - Nutzer-
// Anfrage: "wenn sich das Verzeichnis mal ändert, würde ich das auch gleich
// mit angeben wollen". Wirft den bisherigen Cache weg, damit die naechste
// Dokumenterzeugung den neuen Ordner tatsaechlich neu durchsucht.
async function changeTemplateDir() {
  if (typeof window.showDirectoryPicker !== "function") {
    alert("Dein Browser unterstützt keine feste Ordner-Auswahl - beim nächsten 'erzeugen'-Klick erscheint stattdessen ein normaler Datei-Auswahl-Dialog.");
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ id: "masterform-vorlagen", mode: "read" });
    await idbSetDirHandle(handle);
    Object.keys(templateFileCache).forEach((k) => delete templateFileCache[k]);
    document.getElementById("statusNote").textContent = "Neuer Vorlagen-Ordner gemerkt - wird beim nächsten 'erzeugen'-Klick verwendet.";
  } catch {
    /* Auswahl abgebrochen - alter Ordner bleibt gültig */
  }
}

async function loadTemplateBytes(docType) {
  const { markerText } = TEMPLATE_MARKERS[docType];
  if (templateFileCache[docType]) return templateFileCache[docType];
  let bytes = null;
  const dirHandle = await ensureTemplateDirHandle();
  if (dirHandle) {
    bytes = await findTemplateInDir(dirHandle, markerText);
    if (!bytes) {
      throw new Error(
        `Im gewählten Vorlagen-Ordner wurde keine .docx-Datei mit der Dok-Nr. "${markerText}" gefunden. Bitte lege die echte Vorlage dort ab (siehe webapp/templates/README).`
      );
    }
  } else {
    bytes = await pickTemplateFileManually(markerText);
  }
  templateFileCache[docType] = bytes;
  return bytes;
}

function projektExportPayloadToSysProj(payload) {
  const proj = { ...payload.projekt };
  proj.history = (payload.listen.versionshistorie_eintrag || []).map((r) => ({
    version: r.version, cc_nummer: r.cc_nummer, beschreibung: r.beschreibung,
  }));
  proj.unexpected_events = (payload.listen.unexpected_event || []).map((r) => ({
    dokumenten_nr: r.dokumenten_nr, titel: r.titel, version: r.version,
  }));
  return { sys: payload.system || {}, proj };
}

async function generateDocx(docType) {
  const filler = docType === "VB" ? window.DocxFillVB : window.DocxFillVP;
  if (!filler) {
    alert(`Die In-Browser-Erzeugung für ${docType} ist noch nicht fertig - bitte erstmal den JSON-Export nutzen.`);
    return;
  }
  const payload = currentProjektExportPayload();
  if (!payload.system) {
    if (!confirm(`Kein System mit MLCS-ID "${payload.mlcs_id}" in der geladenen System-Datenbank gefunden - trotzdem ohne Systemdaten erzeugen?`)) return;
  }
  const statusNote = document.getElementById("statusNote");
  statusNote.textContent = `${docType}-Vorlage wird gesucht/geladen ...`;
  try {
    const templateBytes = await loadTemplateBytes(docType);
    const { sys, proj } = projektExportPayloadToSysProj(payload);
    statusNote.textContent = `${docType}-Dokument wird befüllt ...`;
    const resultBytes = await filler.fill(templateBytes, sys, proj);
    const blob = new Blob([resultBytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CS-${docType}_${payload.mlcs_id || "ohne-mlcs-id"}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    statusNote.textContent = `${docType}-Dokument erzeugt und heruntergeladen. Bitte vor Freigabe wie gewohnt prüfen (blau/gelb markierte Stellen).`;
  } catch (err) {
    console.error(err);
    statusNote.textContent = `${docType}-Dokument konnte nicht erzeugt werden: ${err.message}`;
    alert(`Fehler beim Erzeugen des ${docType}-Dokuments:\n${err.message}`);
  }
}

async function onSaveClick() {
  if (PROJEKT_TABS.has(activeTab)) {
    const ok = saveProjektAll();
    if (!ok) {
      document.getElementById("statusNote").textContent = "Fehler beim Speichern (Projekt-DB) – siehe Konsole.";
      return;
    }
    const how = await writeProjektDbToDisk();
    setDirty(false);
    document.getElementById("statusNote").textContent =
      how === "geschrieben" ? "Projekt-Datenbank gespeichert." : "Projekt-Datenbank zum Download bereitgestellt (siehe Download-Ordner).";
    loadProjektListsForBranch(currentProjektId);
  } else {
    const ok = saveAll();
    if (!ok) {
      document.getElementById("statusNote").textContent = "Fehler beim Speichern – siehe Konsole.";
      return;
    }
    const how = await writeDbToDisk();
    setDirty(false);
    document.getElementById("statusNote").textContent =
      how === "geschrieben" ? "Gespeichert." : "Datenbank zum Download bereitgestellt (siehe Download-Ordner).";
    loadListsForBranch(currentSystemId);
  }
}
function onCancelClick() {
  const dirty = PROJEKT_TABS.has(activeTab) ? projektDirty : systemDirty;
  if (dirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
  if (PROJEKT_TABS.has(activeTab)) resetToProjektScenario(projektScenario);
  else resetToScenario(scenario);
  setDirty(false);
  document.getElementById("statusNote").textContent = "Abgebrochen, Formular zurückgesetzt.";
}

// ---------------------------------------------------------------- Start-Bildschirm / Tabs
let systemDbLabel = null;   // null => System-DB nicht geladen
let projektDbLabel = null;  // null => Projekt-DB nicht geladen

function updateHeaderAndTabs() {
  document.getElementById("dbFileLabel").textContent =
    `System: ${systemDbLabel || "nicht geladen"} · Projekt: ${projektDbLabel || "nicht geladen"}`;
  document.getElementById("tabBtnSystem").disabled = !db;
  document.getElementById("tabBtnProjekt").disabled = !projektDb;
  document.getElementById("tabBtnVP").disabled = !projektDb;
  document.getElementById("tabBtnVB").disabled = !projektDb;
  document.getElementById("fsWarningBanner").style.display = hasFSAccess ? "none" : "block";

  const banner = document.getElementById("loadOtherDbBanner");
  // Seit dem Wegfall der Dokumentart-first-Startseite (05.09.) will die App
  // grundsaetzlich IMMER beide Datenbanken - "Neu anlegen" auf dem
  // Startbildschirm legt beide sofort an; dieser Hinweis greift nur noch,
  // wenn jemand ueber die Direkt-Laden-Links bewusst nur EINE Datei geoeffnet
  // hat. Platzhalter-Reiter (AB-DQ/SCR/AB-IQOQPQ/STV/AFU) brauchen noch gar
  // keine DB, deshalb hier immer "nicht fehlend".
  const missing = PLACEHOLDER_TABS.includes(activeTab) ? false
    : activeTab === "system" ? !projektDb : !db;
  if (missing) {
    const missingLabel = activeTab === "system" ? "Projekt-Datenbank" : "System-Datenbank";
    document.getElementById("loadOtherDbText").textContent = `${missingLabel} ist noch nicht geladen - für diesen Tab wird sie gebraucht, um Daten einzugeben.`;
    const btnNew = document.getElementById("btnNewOtherDb");
    const btnOpen = document.getElementById("btnOpenOtherDb");
    btnNew.textContent = `${missingLabel} anlegen`;
    btnOpen.textContent = `${missingLabel} öffnen`;
    btnNew.onclick = activeTab === "system" ? handleNewProjektDb : handleNewDb;
    btnOpen.onclick = activeTab === "system" ? handleOpenProjektDb : handleOpenDb;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }

  const activeHandle = PROJEKT_TABS.has(activeTab) ? projektFileHandle : fileHandle;
  const activeDb = PROJEKT_TABS.has(activeTab) ? projektDb : db;
  document.getElementById("btnLinkFile").classList.toggle("hidden", PLACEHOLDER_TABS.includes(activeTab) || !!activeHandle || !hasFSAccess || !activeDb);
}

// "projekt"/"vp"/"vb" sind drei parallele Ansichten auf dieselbe Projekt-DB
// (s.o.) - ueberall dort, wo bisher nur zwischen "system" und "projekt"
// unterschieden wurde, jetzt zwischen "system" und PROJEKT_TABS.
const PROJEKT_TABS = new Set(["projekt", "vp", "vb"]);
// abdq/scr/abiop/stv/afu: reservierte Reiter fuer weitere bekannte Templates
// (Nutzer-Anfrage 05.09.: "Reiter vorsehen, gefuellt werden sie aber noch
// nicht") - reiner Platzhalterinhalt in app_template.html, keine Felder/
// DB-Anbindung, deshalb auch keine Aufnahme in PROJEKT_TABS.
const TAB_BUTTON_IDS = {
  system: "tabBtnSystem", projekt: "tabBtnProjekt", vp: "tabBtnVP", vb: "tabBtnVB",
  abdq: "tabBtnABDQ", scr: "tabBtnSCR", abiop: "tabBtnABIOP", stv: "tabBtnSTV", afu: "tabBtnAFU",
};
const TAB_CONTENT_IDS = {
  system: "systemTabContent", projekt: "projektTabContent", vp: "vpTabContent", vb: "vbTabContent",
  abdq: "abdqTabContent", scr: "scrTabContent", abiop: "abiopTabContent", stv: "stvTabContent", afu: "afuTabContent",
};
const PLACEHOLDER_TABS = ["abdq", "scr", "abiop", "stv", "afu"];
function setActiveTab(tab) {
  if (PROJEKT_TABS.has(tab) && !projektDb) { updateHeaderAndTabs(); return; }
  if (tab === "system" && !db) { updateHeaderAndTabs(); return; }
  activeTab = tab;
  Object.entries(TAB_BUTTON_IDS).forEach(([t, id]) => document.getElementById(id).classList.toggle("active", tab === t));
  Object.entries(TAB_CONTENT_IDS).forEach(([t, id]) => document.getElementById(id).classList.toggle("hidden", tab !== t));
  // Projekt-Kontext-Leiste (System-/Projekt-Auswahl) gilt fuer alle drei
  // Projekt-Reiter gemeinsam, siehe Kommentar in app_template.html.
  document.getElementById("projektKontextBar").classList.toggle("hidden", !PROJEKT_TABS.has(tab));
  const current = PROJEKT_TABS.has(tab) ? projektDirty : systemDirty;
  document.querySelectorAll(".dirty-indicator").forEach((el) => {
    el.textContent = current ? "● Ungespeicherte Änderungen" : "Keine ungespeicherten Änderungen";
    el.classList.toggle("dirty", current);
  });
  document.getElementById("statusNote").textContent = "";
  updateHeaderAndTabs();
}

// initSystemUi()/initProjektUi() sind idempotent-gesteuert (systemUiReady/
// projektUiReady) - sie duerfen nur EINMAL laufen, weil sie das Formular
// zuruecksetzen (clearFormFields ueber setScenario). Fuer "Datenbank ist
// schon geladen, UI muss aber trotzdem einmal aufgebaut werden" (z.B. beim
// erstmaligen Aufdecken nach dem Dokumentart-Wählen, auch wenn eine
// eingebettete Startdatenbank schon beim Boot geladen wurde).
let systemUiReady = false;
let projektUiReady = false;
function initSystemUi() {
  loadFieldDefinitions(db);
  loadPersonCache();
  loadSystemCache();
  renderForm();
  setScenario("leer");
  systemDirty = false; // clearFormFields() beim Reset markiert ueber onFieldUpdate() faelschlich dirty
  systemUiReady = true;
}
function initProjektUi() {
  loadFieldDefinitions(projektDb);
  loadProjektCache();
  renderProjektForm();
  setProjektScenario("neu");
  projektDirty = false; // s.o.
  projektUiReady = true;
}

// showAppScreen(): fuer EXPLIZITE Nutzeraktionen (Neu anlegen/Datei oeffnen,
// auch ueber den "andere Datenbank laden"-Banner) - baut die UI fuer diese
// Seite immer frisch auf (auch wenn sie vorher schon einmal initialisiert
// war), weil der Nutzer bewusst eine andere/neue Datei geladen hat.
function showAppScreen(which, label) {
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  if (which === "system") { systemDbLabel = label; initSystemUi(); }
  else { projektDbLabel = label; initProjektUi(); }
  setActiveTab(which);
}

// ---------------------------------------------------------------- Einstieg
// Nutzer-Feedback 05.09.: "ich sehe keinen Nutzen mehr darin, zwischen den
// Dokumenten zu wechseln" - der Startbildschirm fragte frueher zuerst
// "welches Dokument?" (Systembewertung/CS-VP/CS-VB/VQ/xQTP), was seit der
// Aufteilung in parallele Reiter (System/Projekt/VP/VB, s.o.) ueberholt war
// und sogar zu einem echten Problem fuehrte: wer z.B. "Systembewertung"
// waehlte, bekam NUR die System-DB provisioniert und konnte den Projekt-/
// VP-/VB-Reiter danach nicht anwaehlen (disabled), ohne noch etwas
// Zusaetzliches zu tun. Jetzt fragt der Startbildschirm nur noch nach der
// Datenquelle: "Neu anlegen" (beide DBs sofort, leer) oder eine bestehende
// Datei laden (System-DB und/oder Projekt-DB einzeln, wie bisher).
function startFresh() {
  if (!db) { createNewDb(); systemDbLabel = "neue Datenbank (noch nicht gespeichert)"; }
  if (!systemUiReady) initSystemUi();
  if (!projektDb) { createNewProjektDb(); projektDbLabel = "neue Datenbank (noch nicht gespeichert)"; }
  if (!projektUiReady) initProjektUi();
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  setActiveTab("system");
}
// docSelect (im System-Reiter) hat seit der Reiter-Aufteilung nur noch EINEN
// Zweck: die optionalen Zusatzlisten (Anforderung/Risiko/Pruefschritt) fuer
// VQ/xQTP einblenden - CS-VP/CS-VB haben dafuer keinen Bedarf mehr (eigene
// Reiter, s.o.), deshalb auch nicht mehr als Option in diesem Dropdown.
function applyBranchDocType(docType) {
  currentDocTypeChosen = docType;
  loadListsForBranch(currentSystemId);
  renderBranch(docType);
}

async function handleNewDb() {
  createNewDb();
  let label = "neue Datenbank (noch nicht gespeichert)";
  if (hasFSAccess) {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: "masterform_system.sqlite",
        types: [{ description: "SQLite-Datenbank", accept: { "application/octet-stream": [".sqlite"] } }],
      });
      await writeDbToDisk();
      label = "Datei " + fileHandle.name;
    } catch (e) {
      // Nutzer hat den Speicherdialog abgebrochen - Datenbank bleibt im Speicher, ohne Datei-Handle.
    }
  }
  showAppScreen("system", label);
}
async function handleOpenDb() {
  if (hasFSAccess) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "SQLite-Datenbank", accept: { "application/octet-stream": [".sqlite", ".db"] } }],
      });
      fileHandle = handle;
      const file = await handle.getFile();
      const bytes = new Uint8Array(await file.arrayBuffer());
      loadDbFromBytes(bytes);
      showAppScreen("system", "Datei " + handle.name);
    } catch (e) {
      // abgebrochen
    }
  } else {
    document.getElementById("fileInputFallback").click();
  }
}
async function handleNewProjektDb() {
  createNewProjektDb();
  let label = "neue Datenbank (noch nicht gespeichert)";
  if (hasFSAccess) {
    try {
      projektFileHandle = await window.showSaveFilePicker({
        suggestedName: "masterform_projekt.sqlite",
        types: [{ description: "SQLite-Datenbank", accept: { "application/octet-stream": [".sqlite"] } }],
      });
      await writeProjektDbToDisk();
      label = "Datei " + projektFileHandle.name;
    } catch (e) {
      // abgebrochen - Datenbank bleibt im Speicher, ohne Datei-Handle.
    }
  }
  showAppScreen("projekt", label);
}
async function handleOpenProjektDb() {
  if (hasFSAccess) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "SQLite-Datenbank", accept: { "application/octet-stream": [".sqlite", ".db"] } }],
      });
      projektFileHandle = handle;
      const file = await handle.getFile();
      const bytes = new Uint8Array(await file.arrayBuffer());
      loadProjektDbFromBytes(bytes);
      showAppScreen("projekt", "Datei " + handle.name);
    } catch (e) {
      // abgebrochen
    }
  } else {
    document.getElementById("fileInputFallbackProjekt").click();
  }
}

async function handleLinkFile() {
  if (!hasFSAccess) return;
  try {
    if (PROJEKT_TABS.has(activeTab)) {
      projektFileHandle = await window.showSaveFilePicker({
        suggestedName: "masterform_projekt.sqlite",
        types: [{ description: "SQLite-Datenbank", accept: { "application/octet-stream": [".sqlite"] } }],
      });
      await writeProjektDbToDisk();
      projektDbLabel = "Datei " + projektFileHandle.name;
    } else {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: "masterform_system.sqlite",
        types: [{ description: "SQLite-Datenbank", accept: { "application/octet-stream": [".sqlite"] } }],
      });
      await writeDbToDisk();
      systemDbLabel = "Datei " + fileHandle.name;
    }
    updateHeaderAndTabs();
    document.getElementById("statusNote").textContent = "Ab jetzt speichert „Speichern“ direkt in diese Datei.";
  } catch (e) {
    // Nutzer hat den Dialog abgebrochen - kein Problem, "Speichern" bleibt beim Download-Fallback.
  }
}

// ---------------------------------------------------------------- Bootstrap
async function main() {
  await initEngine();
  document.getElementById("fsNote").textContent = hasFSAccess
    ? "Dein Browser unterstützt direktes Speichern in eine lokale Datei."
    : "Dein Browser unterstützt kein direktes Datei-Speichern – „Speichern“ bietet die Datenbank stattdessen zum Herunterladen an.";
  document.getElementById("fsNote").classList.toggle("ok", hasFSAccess);
  document.getElementById("btnLinkFile").addEventListener("click", handleLinkFile);

  // Eingebettete Startdatenbank(en) vorhanden? Nur laden (in den Speicher,
  // OHNE schon die App-Oberflaeche zu zeigen) - der Klick auf "Neu anlegen"
  // (startFresh()) erkennt dann, dass diese Datenbank(en) schon da sind,
  // und baut nur noch die UI dafuer auf (siehe initSystemUi()/initProjektUi()).
  if (STARTER_DB_B64) {
    loadDbFromBytes(base64ToBytes(STARTER_DB_B64));
    systemDbLabel = "eingebettete Datenbank (noch nicht mit einer Datei verknüpft)";
  }
  if (STARTER_PROJEKT_DB_B64) {
    loadProjektDbFromBytes(base64ToBytes(STARTER_PROJEKT_DB_B64));
    projektDbLabel = "eingebettete Datenbank (noch nicht mit einer Datei verknüpft)";
  }

  // --- Startbildschirm: nur noch Datenquelle waehlen (kein Dokumentart-first-Einstieg mehr) ---
  document.getElementById("btnStartFresh").addEventListener("click", startFresh);
  document.getElementById("lnkLoadSystemDirect").addEventListener("click", (e) => { e.preventDefault(); handleOpenDb(); });
  document.getElementById("lnkLoadProjektDirect").addEventListener("click", (e) => { e.preventDefault(); handleOpenProjektDb(); });

  document.getElementById("fileInputFallback").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    fileHandle = null;
    loadDbFromBytes(bytes);
    showAppScreen("system", "Datei " + file.name + " (Speichern lädt eine neue Version herunter)");
  });
  document.getElementById("fileInputFallbackProjekt").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    projektFileHandle = null;
    loadProjektDbFromBytes(bytes);
    showAppScreen("projekt", "Datei " + file.name + " (Speichern lädt eine neue Version herunter)");
  });

  document.getElementById("tabBtnSystem").addEventListener("click", () => setActiveTab("system"));
  document.getElementById("tabBtnProjekt").addEventListener("click", () => setActiveTab("projekt"));
  document.getElementById("tabBtnVP").addEventListener("click", () => setActiveTab("vp"));
  document.getElementById("tabBtnVB").addEventListener("click", () => setActiveTab("vb"));
  document.getElementById("btnExportVP").addEventListener("click", () => exportProjektData("VP"));
  document.getElementById("btnExportVB").addEventListener("click", () => exportProjektData("VB"));
  document.getElementById("btnGenerateVP").addEventListener("click", () => generateDocx("VP"));
  document.getElementById("btnGenerateVB").addEventListener("click", () => generateDocx("VB"));
  document.getElementById("btnChangeTemplateDirVP").addEventListener("click", changeTemplateDir);
  document.getElementById("btnChangeTemplateDirVB").addEventListener("click", changeTemplateDir);
  PLACEHOLDER_TABS.forEach((t) => document.getElementById(TAB_BUTTON_IDS[t]).addEventListener("click", () => setActiveTab(t)));

  document.querySelectorAll("#systemTabContent .scenario-btn").forEach((btn) => btn.addEventListener("click", () => setScenario(btn.dataset.scenario)));
  document.getElementById("sourceSearch").addEventListener("input", (e) => renderSourceResults(e.target.value));
  document.getElementById("sourceSearch").addEventListener("focus", (e) => renderSourceResults(e.target.value));
  document.getElementById("sourceResults").addEventListener("click", (e) => {
    const item = e.target.closest(".combo-item");
    if (item) selectSource(item.dataset.id);
  });
  document.getElementById("docSelect").addEventListener("change", (e) => applyBranchDocType(e.target.value));

  document.querySelectorAll("#projektKontextBar .scenario-btn").forEach((btn) => btn.addEventListener("click", () => setProjektScenario(btn.dataset.scenario)));
  document.getElementById("projektSourceSearch").addEventListener("input", (e) => renderProjektSourceResults(e.target.value));
  document.getElementById("projektSourceSearch").addEventListener("focus", (e) => renderProjektSourceResults(e.target.value));
  document.getElementById("projektSourceResults").addEventListener("click", (e) => {
    const item = e.target.closest(".combo-item");
    if (item) selectProjektSource(item.dataset.id);
  });
  document.getElementById("systemHelperSearch").addEventListener("input", (e) => renderSystemHelperResults(e.target.value));
  document.getElementById("systemHelperSearch").addEventListener("focus", (e) => renderSystemHelperResults(e.target.value));
  document.getElementById("systemHelperResults").addEventListener("click", (e) => {
    const item = e.target.closest(".combo-item");
    if (item) selectSystemHelper(item.dataset.id);
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest(".combo")) return;
    document.querySelectorAll(".combo-results").forEach((r) => r.classList.remove("open"));
  });

  document.getElementById("btnSaveTop").addEventListener("click", onSaveClick);
  document.getElementById("btnSaveBottom").addEventListener("click", onSaveClick);
  document.getElementById("btnCancelTop").addEventListener("click", onCancelClick);
  document.getElementById("btnCancelBottom").addEventListener("click", onCancelClick);
  document.getElementById("btnCloseDb").addEventListener("click", () => {
    if ((systemDirty || projektDirty) && !confirm("Ungespeicherte Änderungen verwerfen und Datenbank(en) schließen?")) return;
    db = null; projektDb = null; fileHandle = null; projektFileHandle = null;
    currentSystemId = null; currentProjektId = null;
    systemDbLabel = null; projektDbLabel = null;
    systemDirty = false; projektDirty = false;
    systemUiReady = false; projektUiReady = false; currentDocTypeChosen = "";
    document.getElementById("appScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
  });
}
main();
