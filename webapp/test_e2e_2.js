const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const APP_PATH = path.join(__dirname, "app.html");
const DOWNLOAD_DIR = path.join(__dirname, "e2e_downloads");
const EXISTING_DB = path.join(DOWNLOAD_DIR, "masterform_e2e.sqlite"); // aus test_e2e.js

function assert(cond, msg) {
  if (!cond) throw new Error("FEHLER: " + msg);
  console.log("OK:", msg);
}

async function main() {
  if (!fs.existsSync(EXISTING_DB)) throw new Error("Bitte zuerst test_e2e.js ausführen (erzeugt " + EXISTING_DB + ")");

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    headless: true,
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.log("[pageerror]", err.message));

  await page.goto("file://" + APP_PATH);

  // --- Vorhandene Datenbank ueber den Fallback-Datei-Input oeffnen ---
  await page.click("#lnkLoadSystemDirect");
  await page.setInputFiles("#fileInputFallback", EXISTING_DB);
  await page.waitForSelector("#appScreen:not(.hidden)", { timeout: 10000 });
  assert(true, "Vorhandene Datenbank per Datei-Upload geöffnet");

  // --- Szenario 2: Kopie von aehnlichem System ---
  await page.click('.scenario-btn[data-scenario="kopie"]');
  await page.fill("#sourceSearch", "Zentrifuge");
  await page.waitForSelector(".combo-item");
  const itemCount = await page.$$eval(".combo-item", (els) => els.length);
  assert(itemCount >= 1, `Suche nach 'Zentrifuge' findet ${itemCount} Treffer`);
  await page.click(".combo-item");

  const copiedName = await page.inputValue('[data-key="systemname"]');
  assert(copiedName === "E2E Testsystem Zentrifuge", "Werte aus Quellsystem übernommen: " + copiedName);

  // Ein Feld gezielt ueberschreiben -> muss als "geaendert" markiert werden
  await page.fill('[data-key="mlcs_id"]', "6666");
  const changedClass = await page.evaluate(() => document.querySelector('[data-entity="system"][data-fieldkey="mlcs_id"]').classList.contains("changed"));
  assert(changedClass, "Geändertes Feld (mlcs_id) wird visuell hervorgehoben");
  const unchangedClass = await page.evaluate(() => document.querySelector('[data-entity="system"][data-fieldkey="systemname"]').classList.contains("changed"));
  assert(!unchangedClass, "Unverändertes Feld (systemname) bleibt NICHT hervorgehoben");

  const [download1] = await Promise.all([page.waitForEvent("download"), page.click("#btnSaveBottom")]);
  const copyPath = path.join(DOWNLOAD_DIR, "masterform_e2e_kopie.sqlite");
  await download1.saveAs(copyPath);

  // --- Integritaet pruefen: ZWEI Systeme jetzt in der Datei, Original unveraendert ---
  const SQL = await initSqlJs();
  const dbBytes = fs.readFileSync(copyPath);
  const vdb = new SQL.Database(dbBytes);
  const systems = vdb.exec("SELECT r.id, fv.field_key, fv.wert FROM records r JOIN field_values fv ON fv.record_id=r.id WHERE r.entity_type='system'");
  const byId = {};
  systems[0].values.forEach(([id, k, v]) => { (byId[id] ||= {})[k] = v; });
  const ids = Object.keys(byId);
  assert(ids.length === 2, `Nach Kopie existieren 2 Systeme in der Datenbank (gefunden: ${ids.length})`);
  const mlcsIds = ids.map((id) => byId[id].mlcs_id).sort();
  assert(JSON.stringify(mlcsIds) === JSON.stringify(["5555", "6666"]), "Original (5555) UND Kopie (6666) beide vorhanden: " + mlcsIds.join(","));
  vdb.close();

  // --- Szenario 3: bestehendes System bearbeiten (die Kopie, MLCS 6666) ---
  await page.click('#systemTabContent .scenario-btn[data-scenario="bearbeiten"]');
  await page.fill("#sourceSearch", "6666");
  await page.waitForSelector(".combo-item");
  await page.click(".combo-item");
  const editName = await page.inputValue('[data-key="systemname"]');
  assert(editName === "E2E Testsystem Zentrifuge", "Bearbeiten-Szenario lädt bestehenden Datensatz korrekt");

  await page.fill('[data-key="systemname"]', "E2E Testsystem Zentrifuge (aktualisiert)");
  const [download2] = await Promise.all([page.waitForEvent("download"), page.click("#btnSaveBottom")]);
  const editPath = path.join(DOWNLOAD_DIR, "masterform_e2e_bearbeitet.sqlite");
  await download2.saveAs(editPath);

  const vdb2 = new SQL.Database(fs.readFileSync(editPath));
  const systems2 = vdb2.exec("SELECT r.id, fv.field_key, fv.wert FROM records r JOIN field_values fv ON fv.record_id=r.id WHERE r.entity_type='system'");
  const byId2 = {};
  systems2[0].values.forEach(([id, k, v]) => { (byId2[id] ||= {})[k] = v; });
  assert(Object.keys(byId2).length === 2, "Bearbeiten legt KEINEN dritten Datensatz an (weiterhin 2 Systeme)");
  const updated = Object.values(byId2).find((v) => v.mlcs_id === "6666");
  assert(updated.systemname === "E2E Testsystem Zentrifuge (aktualisiert)", "Bestehender Datensatz wurde aktualisiert: " + updated.systemname);

  const changeLog = vdb2.exec("SELECT field_key, alter_wert, neuer_wert FROM change_log WHERE field_key='systemname'");
  assert(changeLog.length > 0 && changeLog[0].values.length > 0, "change_log-Eintrag für die Änderung wurde geschrieben");
  console.log("   change_log:", JSON.stringify(changeLog[0].values));
  vdb2.close();

  console.log("\nAlle Kopie/Bearbeiten-Checks erfolgreich.");
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
