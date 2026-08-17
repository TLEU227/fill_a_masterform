"use strict";
/* Masterform – Browser-App (Task #3)
 * Echte SQLite-Datenbank im Browser (sql.js/WASM), Formular fuer die
 * 3 Erfassungsszenarien, Personen- und Systemsuche, Basis-Listenpflege
 * fuer Anforderung/Risiko/Pruefschritt. Kein Server, keine externen
 * Netzwerkaufrufe zur Laufzeit.
 */

// ---------------------------------------------------------------- Zustand
let SQL = null;
let db = null;
let fileHandle = null;      // File System Access API Handle, falls verfuegbar
let hasFSAccess = "showOpenFilePicker" in window && "showSaveFilePicker" in window;
let scenario = "leer";
let currentSystemId = null;  // null => Szenario 1/2 legen einen NEUEN Datensatz an
let baseline = {};           // field_key -> Wert, Stand beim Laden (fuer Aenderungs-Hervorhebung + change_log)
let fieldDefsByEntity = {};  // entity_type -> [def, ...]
let personCache = [];
let systemCache = [];
let isDirty = false;
let currentDocType = "";
let listState = { anforderung: [], risiko: [], pruefschritt: [] };
// listState[entity] = [{ id: number|null, geloescht: bool, werte: {feldkey: wert} }, ...]

const GROUP_ORDER = {
  system: ["Personen", "Stammdaten", "GxP-Bewertung", "Status"],
  person: ["Person"],
  anforderung: ["Anforderung"],
  risiko: ["Risiko"],
  pruefschritt: ["Prüfschritt"],
};
const ENTITY_LABEL = {
  anforderung: "Anforderung (URS)",
  risiko: "Risiko (RA)",
  pruefschritt: "Prüfschritt (IQ/OQ/PQ/PPQ)",
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
// Ableitungstabelle Testtiefe (Kapitel 8 der Systembewertung, QU-MT-0001344).
const TESTTIEFE_MATRIX = {
  Critical: { "1": "Mittel", "3": "Mittel", "4": "Hoch", "5": "Hoch" },
  Major: { "1": "Gering", "3": "Gering", "4": "Mittel", "5": "Hoch" },
  Minor: { "1": "Gering", "3": "Gering", "4": "Gering", "5": "Mittel" },
  "N/A": { "1": "N/A", "3": "N/A", "4": "N/A", "5": "N/A", "N/A": "N/A" },
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
async function initEngine() {
  SQL = await initSqlJs({ wasmBinary: base64ToBytes(WASM_B64) });
}
function pragmaSetup() {
  db.run("PRAGMA foreign_keys = ON");
}
function createNewDb() {
  db = new SQL.Database();
  pragmaSetup();
  db.run(SCHEMA_SQL);
  db.run(SEED_SQL);
}
function loadDbFromBytes(bytes) {
  db = new SQL.Database(bytes);
  pragmaSetup();
}
function exportDbBytes() {
  return db.export();
}

function loadFieldDefinitions() {
  fieldDefsByEntity = {};
  const res = db.exec(
    "SELECT entity_type,key,label,datentyp,optionen,format_hinweis,sop_hinweis,freitext_erlaubt,pflichtfeld,gruppe,sortierung,benoetigt_fuer " +
    "FROM field_definitions ORDER BY entity_type, sortierung"
  );
  if (!res.length) return;
  res[0].values.forEach((row) => {
    const [entity_type, key, label, datentyp, optionen, format_hinweis, sop_hinweis, freitext_erlaubt, pflichtfeld, gruppe, sortierung, benoetigt_fuer] = row;
    const def = {
      entity_type, key, label, datentyp,
      optionen: optionen ? JSON.parse(optionen) : null,
      format_hinweis, sop_hinweis,
      freitext_erlaubt: !!freitext_erlaubt,
      pflichtfeld: !!pflichtfeld,
      gruppe, sortierung,
      benoetigt_fuer: benoetigt_fuer ? JSON.parse(benoetigt_fuer) : ["immer"],
    };
    (fieldDefsByEntity[entity_type] ||= []).push(def);
  });
}
function defFor(entity, fieldKey) {
  return (fieldDefsByEntity[entity] || []).find((d) => d.key === fieldKey);
}
function groupsFor(entityType) {
  const defs = fieldDefsByEntity[entityType] || [];
  const byGroup = {};
  defs.forEach((d) => { (byGroup[d.gruppe] ||= []).push(d); });
  const order = GROUP_ORDER[entityType] || Object.keys(byGroup);
  const groups = [];
  order.forEach((g) => { if (byGroup[g]) groups.push({ name: g, fields: byGroup[g] }); });
  Object.keys(byGroup).forEach((g) => { if (!order.includes(g)) groups.push({ name: g, fields: byGroup[g] }); });
  return groups;
}

function getAllRecordsWithValues(entityType) {
  const byId = {};
  const res = db.exec(
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
  personCache = getAllRecordsWithValues("person").map((r) => ({
    id: r.id, name: r.values.name || "(ohne Namen)", stelle: r.values.stelle || "", abteilung: r.values.abteilung || "",
  }));
}
function loadSystemCache() {
  systemCache = getAllRecordsWithValues("system");
}
function getRelatedRecords(entityType, systemId) {
  if (systemId == null) return [];
  const res = db.exec(
    `SELECT r.id, fv.field_key, fv.wert FROM relations rel ` +
    `JOIN records r ON r.id = rel.from_record_id ` +
    `LEFT JOIN field_values fv ON fv.record_id = r.id ` +
    `WHERE rel.to_record_id = ${systemId} AND rel.relation_type = 'gehoert_zu' AND r.entity_type = '${entityType}'`
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
function upsertFieldValue(recordId, key, value) {
  const stmt = db.prepare(
    "INSERT INTO field_values (record_id, field_key, wert) VALUES (?,?,?) " +
    "ON CONFLICT(record_id, field_key) DO UPDATE SET wert=excluded.wert"
  );
  stmt.run([recordId, key, value]);
  stmt.free();
}
function insertChangeLog(recordId, key, alt, neu) {
  const stmt = db.prepare(
    "INSERT INTO change_log (record_id, field_key, alter_wert, neuer_wert, geaendert_von) VALUES (?,?,?,?,?)"
  );
  stmt.run([recordId, key, alt, neu, "Browser-Nutzer"]);
  stmt.free();
}
function createRecord(entityType) {
  const stmt = db.prepare("INSERT INTO records (entity_type, status, erstellt_von) VALUES (?, 'entwurf', 'Browser-Nutzer')");
  stmt.run([entityType]);
  stmt.free();
  return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
}
function linkToSystem(recordId, systemId) {
  const stmt = db.prepare("INSERT INTO relations (from_record_id, relation_type, to_record_id) VALUES (?, 'gehoert_zu', ?)");
  stmt.run([recordId, systemId]);
  stmt.free();
}
function createPerson(name, stelle, abteilung) {
  const id = createRecord("person");
  upsertFieldValue(id, "name", name || "");
  upsertFieldValue(id, "stelle", stelle || "");
  upsertFieldValue(id, "abteilung", abteilung || "");
  return id;
}
function deleteRecord(id) {
  db.run(`DELETE FROM records WHERE id = ${id}`); // Cascade loescht field_values/relations mit
}

function collectFormValues() {
  const values = {};
  document.querySelectorAll("#systemForm [data-key]").forEach((el) => {
    const key = el.dataset.key;
    if (key.endsWith("__freitext")) return; // separat behandelt
    if (el.type === "radio") {
      if (el.checked) values[key] = el.value;
    } else if (el.tagName === "SELECT" && el.value === "__other__") {
      const freitext = document.querySelector(`[data-key="${key}__freitext"]`);
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

function saveAll() {
  db.run("BEGIN");
  try {
    // 1. Neue Personen (Rollen-Felder auf "__new__") zuerst anlegen
    document.querySelectorAll('#systemForm select[data-type="person"]').forEach((el) => {
      if (el.value === "__new__") {
        const wrap = document.querySelector(`[data-personnew-for="${el.dataset.key}"]`);
        const name = wrap.querySelector('[data-newperson-field="name"]').value;
        const stelle = wrap.querySelector('[data-newperson-field="stelle"]').value;
        const abteilung = wrap.querySelector('[data-newperson-field="abteilung"]').value;
        const newId = createPerson(name, stelle, abteilung);
        el.value = String(newId);
      }
    });

    // 2. Systemdatensatz anlegen (Szenario 1/2) oder wiederverwenden (Szenario 3)
    let systemId = currentSystemId;
    if (systemId == null) systemId = createRecord("system");

    // 3. Werte upserten + grobe Historie fuer geaenderte Felder
    const values = collectFormValues();
    Object.entries(values).forEach(([key, val]) => {
      const alt = baseline[key];
      if (alt !== undefined && alt !== val) insertChangeLog(systemId, key, alt, val);
      upsertFieldValue(systemId, key, val);
    });

    // 4. Zusatzlisten (Anforderung/Risiko/Pruefschritt): neu/geaendert speichern, geloeschte entfernen
    Object.entries(listState).forEach(([entityType, rows]) => {
      rows.forEach((row) => {
        if (row.geloescht) {
          if (row.id != null) deleteRecord(row.id);
          return;
        }
        let recId = row.id;
        if (recId == null) {
          recId = createRecord(entityType);
          linkToSystem(recId, systemId);
        }
        Object.entries(row.werte).forEach(([k, v]) => upsertFieldValue(recId, k, v));
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
        <input type="text" placeholder="Stelle/Funktion" data-newperson-field="stelle">
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
  // Kein data-key auf dem Wrapper-Div (nur auf dem eigentlichen Eingabeelement) -
  // sonst matchen [data-key="..."]-Selektoren zwei Elemente (Div + Input/Select).
  return `<div class="field${fullClass}" data-entity="${def.entity_type}" data-fieldkey="${def.key}"><label>${escapeHtml(def.label)}${reqMark}</label>${inputHtml}${hintHtml}</div>`;
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

  form.querySelectorAll("[data-key]").forEach((el) => {
    el.addEventListener("input", () => onFieldUpdate(el));
    el.addEventListener("change", () => onFieldUpdate(el));
  });
  recomputeTesttiefe();
}

function onFieldUpdate(el) {
  const key = el.dataset.key;
  if (key && key.endsWith("__freitext")) { markDirty(); return; }
  if (el.dataset.type === "person") {
    const personArea = document.querySelector(`[data-personnew-for="${key}"]`);
    const infoArea = document.querySelector(`[data-personinfo-for="${key}"]`);
    if (el.value === "__new__") {
      personArea.style.display = "grid";
      infoArea.textContent = "";
    } else {
      personArea.style.display = "none";
      const person = personCache.find((p) => String(p.id) === el.value);
      infoArea.textContent = person ? `${person.stelle} · ${person.abteilung}` : "";
    }
  }
  if (el.tagName === "SELECT" && el.dataset.entity && el.dataset.fieldkey) {
    const def = defFor(el.dataset.entity, el.dataset.fieldkey);
    if (def) {
      const hintArea = document.querySelector(`[data-optionhint-for="${key}"]`);
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
        const freitextInput = document.querySelector(`[data-key="${key}__freitext"]`);
        if (freitextInput) freitextInput.style.display = el.value === "__other__" ? "block" : "none";
      }
    }
  }
  markChanged(el);
  markDirty();
  if (key === "gxp_kritikalitaet" || key === "gamp_kategorie") recomputeTesttiefe();
}

function recomputeTesttiefe() {
  const el = document.getElementById("testtiefeWert");
  if (!el) return;
  const krit = fieldValue("gxp_kritikalitaet");
  const gamp = fieldValue("gamp_kategorie");
  const row = TESTTIEFE_MATRIX[krit];
  const result = row ? row[gamp] : null;
  el.textContent = result || "– bitte GxP-Kritikalität und GAMP-Kategorie wählen –";
}
function fieldValue(key) {
  const el = document.querySelector(`#systemForm [data-key="${key}"]`);
  if (!el) return "";
  if (el.type === "radio") {
    const checked = document.querySelector(`#systemForm input[name="${key}"]:checked`);
    return checked ? checked.value : "";
  }
  return el.value;
}
function markChanged(el) {
  const key = el.dataset.key;
  const wrap = el.closest(".field");
  if (!wrap) return;
  const val = fieldValue(key);
  if (baseline[key] !== undefined && val !== baseline[key]) wrap.classList.add("changed");
  else wrap.classList.remove("changed");
}

function fillFormWithValues(values) {
  baseline = { ...values };
  Object.entries(values).forEach(([key, val]) => {
    document.querySelectorAll(`#systemForm [data-key="${key}"]`).forEach((el) => {
      if (el.type === "radio") el.checked = el.value === val;
      else el.value = val || "";
    });
    document.querySelectorAll(`#systemForm [data-key="${key}"][data-type="person"]`).forEach((el) => onFieldUpdate(el));
    document.querySelectorAll(`#systemForm select[data-key="${key}"]`).forEach((el) => onFieldUpdate(el));
  });
  document.querySelectorAll("#systemForm .field").forEach((w) => w.classList.remove("changed"));
  recomputeTesttiefe();
}
function clearFormFields() {
  baseline = {};
  document.querySelectorAll("#systemForm input[type=text], #systemForm textarea, #systemForm input[type=date]").forEach((el) => (el.value = ""));
  document.querySelectorAll("#systemForm select").forEach((el) => { el.value = ""; onFieldUpdate(el); });
  document.querySelectorAll("#systemForm input[type=radio]").forEach((el) => (el.checked = false));
  document.querySelectorAll("#systemForm .field").forEach((w) => w.classList.remove("changed"));
  document.querySelectorAll(".person-new").forEach((el) => (el.style.display = "none"));
  recomputeTesttiefe();
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

// ---------------------------------------------------------------- Szenarien
function setScenario(newScenario) {
  scenario = newScenario;
  document.querySelectorAll(".scenario-btn").forEach((b) => b.classList.toggle("active", b.dataset.scenario === newScenario));
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

// ---------------------------------------------------------------- Zusatzlisten (Branch)
function loadListsForBranch(systemId) {
  listState = {
    anforderung: getRelatedRecords("anforderung", systemId),
    risiko: getRelatedRecords("risiko", systemId),
    pruefschritt: getRelatedRecords("pruefschritt", systemId),
  };
  renderBranch(currentDocType);
}
function addListRow(entityType) {
  listState[entityType].push({ id: null, geloescht: false, werte: {} });
  renderBranch(currentDocType);
  markDirty();
}
function removeListRow(entityType, index) {
  const row = listState[entityType][index];
  if (row.id == null) listState[entityType].splice(index, 1);
  else row.geloescht = true;
  renderBranch(currentDocType);
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
function renderBranchSection(entityType, isOptional) {
  const card = document.createElement("div");
  card.className = "card branch" + (isOptional ? " optional" : "");
  const tag = isOptional ? `optional · ${currentDocType}` : `pflicht · ${currentDocType}`;
  card.innerHTML = `<h2>${escapeHtml(ENTITY_LABEL[entityType])}<span class="tag">${escapeHtml(tag)}</span></h2>`;
  const rows = listState[entityType] || [];
  const body = document.createElement("div");
  body.style.padding = "16px";
  rows.forEach((row, i) => { if (!row.geloescht) body.appendChild(renderListRow(entityType, row, i)); });
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "add-row-btn";
  addBtn.textContent = `+ ${ENTITY_LABEL[entityType]} hinzufügen`;
  addBtn.addEventListener("click", () => addListRow(entityType));
  body.appendChild(addBtn);
  card.appendChild(body);
  return card;
}
function bindListRowInputs(container, entityType) {
  container.querySelectorAll(`[data-key^="${entityType}."]`).forEach((el) => {
    el.addEventListener("input", () => syncListRowValue(el, entityType));
    el.addEventListener("change", () => { onFieldUpdate(el); syncListRowValue(el, entityType); });
  });
  container.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [ent, idx] = btn.dataset.remove.split(":");
      removeListRow(ent, Number(idx));
    });
  });
}
function syncListRowValue(el, entityType) {
  const parts = el.dataset.key.split(".");
  if (parts.length < 3) return;
  const index = Number(parts[1]);
  const fieldKey = parts.slice(2).join(".");
  if (fieldKey.endsWith("__freitext")) return;
  const row = listState[entityType][index];
  if (!row) return;
  if (el.type === "radio") { if (el.checked) row.werte[fieldKey] = el.value; }
  else row.werte[fieldKey] = el.value;
  markDirty();
}
function renderBranch(docType) {
  currentDocType = docType;
  const area = document.getElementById("branchArea");
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
    branch.pflicht.forEach((ent) => area.appendChild(renderBranchSection(ent, false)));
  }
  if (branch.optional.length) {
    const heading = document.createElement("h3");
    heading.className = "branch-heading optional";
    heading.innerHTML = `Optionale Zusatzfelder für ${docType} <span class="tag">kannst du überspringen</span>`;
    area.appendChild(heading);
    branch.optional.forEach((ent) => area.appendChild(renderBranchSection(ent, true)));
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
  ["anforderung", "risiko", "pruefschritt"].forEach((ent) => bindListRowInputs(area, ent));
}

// ---------------------------------------------------------------- Dirty/Save/Load-UI
function markDirty() { setDirty(true); }
function setDirty(value) {
  isDirty = value;
  document.querySelectorAll(".dirty-indicator").forEach((el) => {
    el.textContent = value ? "● Ungespeicherte Änderungen" : "Keine ungespeicherten Änderungen";
    el.classList.toggle("dirty", value);
  });
}
window.addEventListener("beforeunload", (e) => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

async function writeDbToDisk() {
  const bytes = exportDbBytes();
  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    await writable.write(bytes);
    await writable.close();
    return "geschrieben";
  }
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "masterform.sqlite";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "heruntergeladen";
}

async function onSaveClick() {
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
function onCancelClick() {
  if (isDirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
  resetToScenario(scenario);
  setDirty(false);
  document.getElementById("statusNote").textContent = "Abgebrochen, Formular zurückgesetzt.";
}

// ---------------------------------------------------------------- Start-Bildschirm
function showAppScreen(label) {
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  document.getElementById("dbFileLabel").textContent = label;
  document.getElementById("fsWarningBanner").style.display = hasFSAccess ? "none" : "block";
  loadFieldDefinitions();
  loadPersonCache();
  loadSystemCache();
  renderForm();
  setScenario("leer");
  setDirty(false);
}

async function handleNewDb() {
  createNewDb();
  let label = "Neue Datenbank (noch nicht gespeichert)";
  if (hasFSAccess) {
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: "masterform.sqlite",
        types: [{ description: "SQLite-Datenbank", accept: { "application/octet-stream": [".sqlite"] } }],
      });
      await writeDbToDisk();
      label = "Datei: " + fileHandle.name;
    } catch (e) {
      // Nutzer hat den Speicherdialog abgebrochen - Datenbank bleibt im Speicher, ohne Datei-Handle.
    }
  }
  showAppScreen(label);
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
      showAppScreen("Datei: " + handle.name);
    } catch (e) {
      // abgebrochen
    }
  } else {
    document.getElementById("fileInputFallback").click();
  }
}

// ---------------------------------------------------------------- Bootstrap
async function main() {
  await initEngine();
  document.getElementById("fsNote").textContent = hasFSAccess
    ? "Dein Browser unterstützt direktes Speichern in eine lokale Datei."
    : "Dein Browser unterstützt kein direktes Datei-Speichern – „Speichern“ bietet die Datenbank stattdessen zum Herunterladen an.";
  document.getElementById("fsNote").classList.toggle("ok", hasFSAccess);

  document.getElementById("btnNewDb").addEventListener("click", handleNewDb);
  document.getElementById("btnOpenDb").addEventListener("click", handleOpenDb);
  document.getElementById("fileInputFallback").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    fileHandle = null;
    loadDbFromBytes(bytes);
    showAppScreen("Datei: " + file.name + " (Speichern lädt eine neue Version herunter)");
  });

  document.querySelectorAll(".scenario-btn").forEach((btn) => btn.addEventListener("click", () => setScenario(btn.dataset.scenario)));
  document.getElementById("sourceSearch").addEventListener("input", (e) => renderSourceResults(e.target.value));
  document.getElementById("sourceSearch").addEventListener("focus", (e) => renderSourceResults(e.target.value));
  document.getElementById("sourceResults").addEventListener("click", (e) => {
    const item = e.target.closest(".combo-item");
    if (item) selectSource(item.dataset.id);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".combo")) document.getElementById("sourceResults").classList.remove("open");
  });
  document.getElementById("docSelect").addEventListener("change", (e) => { loadListsForBranch(currentSystemId); renderBranch(e.target.value); });

  document.getElementById("btnSaveTop").addEventListener("click", onSaveClick);
  document.getElementById("btnSaveBottom").addEventListener("click", onSaveClick);
  document.getElementById("btnCancelTop").addEventListener("click", onCancelClick);
  document.getElementById("btnCancelBottom").addEventListener("click", onCancelClick);
  document.getElementById("btnCloseDb").addEventListener("click", () => {
    if (isDirty && !confirm("Ungespeicherte Änderungen verwerfen und Datenbank schließen?")) return;
    db = null; fileHandle = null; currentSystemId = null; setDirty(false);
    document.getElementById("appScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
  });
}
main();
