const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const APP_PATH = path.join(__dirname, "app.html");
const DOWNLOAD_DIR = path.join(__dirname, "e2e_downloads");

function assert(cond, msg) {
  if (!cond) throw new Error("FEHLER: " + msg);
  console.log("OK:", msg);
}

async function main() {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    headless: true,
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") console.log("[console.error]", msg.text()); });
  page.on("pageerror", (err) => console.log("[pageerror]", err.message));

  await page.goto("file://" + APP_PATH);

  const hasFSAccess = await page.evaluate(() => "showOpenFilePicker" in window);
  console.log("File System Access API im Test-Browser verfügbar:", hasFSAccess);

  // --- Neue Datenbank(en) anlegen (ueber "Neu anlegen" auf dem Startbildschirm) ---
  await page.click("#btnStartFresh");
  await page.waitForSelector("#appScreen:not(.hidden)", { timeout: 10000 });
  assert(true, "Neue Datenbank angelegt, App-Bildschirm sichtbar");

  const nFields = await page.evaluate(() => document.querySelectorAll("#systemForm [data-key]").length);
  assert(nFields > 20, `Formular hat ${nFields} Eingabefelder gerendert (aus echten field_definitions)`);

  // --- Basisfelder befuellen ---
  await page.fill('[data-key="systemname"]', "E2E Testsystem Zentrifuge");
  await page.fill('[data-key="mlcs_id"]', "5555");
  await page.check('input[name="gxp_relevant"][value="ja"]');
  await page.selectOption('[data-key="gxp_kritikalitaet"]', "Major");
  await page.selectOption('[data-key="gamp_kategorie"]', "4");

  const testtiefe = await page.textContent("#testtiefeWert");
  assert(testtiefe.trim() === "Mittel", `Testtiefe automatisch berechnet: '${testtiefe.trim()}' (erwartet: Mittel, Major+Kat.4)`);

  // Personen/Rollen-Gruppe ist im System-Formular bewusst ausgeblendet
  // (Nutzer-Rückmeldung: fürs CS-VP-Template aktuell nicht gebraucht,
  // field_definitions bleiben aber in der DB erhalten) - kein UI-Szenario
  // dafür mehr, siehe HIDDEN_GROUPS in app.js.
  const rolleFieldVisible = await page.locator('[data-key="rolle_ersteller"]').count();
  assert(rolleFieldVisible === 0, "Personen/Rollen-Gruppe ist im System-Formular ausgeblendet (HIDDEN_GROUPS)");

  const dirtyText = await page.textContent("#dirtyIndicatorBottom");
  assert(dirtyText.includes("Ungespeicherte"), "Dirty-Indikator zeigt ungespeicherte Änderungen an");

  // --- Dokument-Abzweigung VQ: Anforderung/Risiko (pflicht) + Pruefschritt (optional) ---
  await page.selectOption("#docSelect", "VQ");
  await page.waitForSelector(".branch-heading");
  const headings = await page.$$eval(".branch-heading", (els) => els.map((e) => e.textContent));
  assert(headings.some((h) => h.includes("Notwendige")), "Notwendige Zusatzfelder-Überschrift vorhanden");
  assert(headings.some((h) => h.includes("Optionale")), "Optionale Zusatzfelder-Überschrift vorhanden");

  // Scope auf #systemTabContent: seit "Neu anlegen" beide DBs gemeinsam
  // anlegt, gibt es jetzt auch in den Projekt/VP/VB-Reitern eigene
  // Hinzufuegen-Buttons (Versionshistorie/Lieferant/Unexpected Event) - die
  // sollen hier nicht mitgezaehlt werden.
  const addBtns = await page.$$("#systemTabContent .add-row-btn");
  assert(addBtns.length === 3, `3 Hinzufügen-Buttons gefunden (Anforderung/Risiko/Prüfschritt), gefunden: ${addBtns.length}`);
  await addBtns[0].click(); // Anforderung hinzufuegen
  await page.waitForSelector('[data-key^="anforderung.0."]');
  await page.fill('[data-key="anforderung.0.urs_id"]', "URS-E2E-001");
  await page.fill('[data-key="anforderung.0.beschreibung"]', "E2E Testanforderung");

  // --- Speichern (Download-Fallback, da headless ohne FS Access API) ---
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#btnSaveBottom"),
  ]);
  const savedPath = path.join(DOWNLOAD_DIR, "masterform_e2e.sqlite");
  await download.saveAs(savedPath);
  assert(fs.existsSync(savedPath), "Datenbank wurde als Datei herunterladen (Fallback-Pfad)");

  const dirtyAfterSave = await page.textContent("#dirtyIndicatorBottom");
  assert(!dirtyAfterSave.includes("Ungespeicherte"), "Dirty-Indikator nach Speichern zurückgesetzt");

  // --- Integritaet der gespeicherten Datei pruefen (unabhaengig von der App, per Node) ---
  const SQL = await initSqlJs();
  const bytes = fs.readFileSync(savedPath);
  const verifyDb = new SQL.Database(bytes);
  const sys = verifyDb.exec("SELECT fv.field_key, fv.wert FROM records r JOIN field_values fv ON fv.record_id=r.id WHERE r.entity_type='system'");
  const sysValues = Object.fromEntries(sys[0].values);
  assert(sysValues.systemname === "E2E Testsystem Zentrifuge", "Systemname korrekt in Datei gespeichert: " + sysValues.systemname);
  assert(sysValues.mlcs_id === "5555", "MLCS-ID korrekt gespeichert");
  assert(sysValues.gxp_relevant === "ja", "gxp_relevant korrekt gespeichert");

  const anf = verifyDb.exec("SELECT fv.field_key, fv.wert FROM records r JOIN field_values fv ON fv.record_id=r.id WHERE r.entity_type='anforderung'");
  const anfValues = Object.fromEntries(anf[0].values);
  assert(anfValues.urs_id === "URS-E2E-001", "Anforderung (URS) korrekt gespeichert: " + anfValues.urs_id);

  const rel = verifyDb.exec("SELECT relation_type FROM relations");
  assert(rel.length > 0 && rel[0].values.length > 0, "Relation Anforderung -> System wurde angelegt");

  verifyDb.close();

  console.log("\nAlle E2E-Checks erfolgreich.");
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
