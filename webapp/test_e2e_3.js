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

  // --- Dokumentart "CS-Validierungsplan" waehlen: braucht System- UND
  // Projekt-DB, beide werden dafuer automatisch angelegt (kein separates
  // "Neu anlegen"/"Öffnen" mehr noetig) ---
  await page.click('.doctype-btn[data-doctype="CS-VP"]');
  await page.waitForSelector("#appScreen:not(.hidden)", { timeout: 10000 });
  assert(!(await page.isDisabled("#tabBtnProjekt")), "Projekt-Tab ist nach Wahl der Dokumentart CS-VP sofort aktiv (Projekt-DB automatisch angelegt)");
  assert(await page.locator("#loadOtherDbBanner").evaluate((el) => el.classList.contains("hidden")), "Kein Hinweis-Banner mehr noetig, da beide Datenbanken schon bereitstehen");

  await page.fill('#systemForm [data-key="systemname"]', "E2E Projekt-Testsystem");
  await page.fill('#systemForm [data-key="mlcs_id"]', "7777");

  // System speichern, damit es fuer die System-Hilfsmittel-Suche im
  // Projekt-Tab ueberhaupt in systemCache auffindbar ist (Cache wird aus der
  // DB geladen, nicht aus dem offenen Formular).
  const [sysDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#btnSaveBottom"),
  ]);
  await sysDownload.saveAs(path.join(DOWNLOAD_DIR, "masterform_system_fuer_projekt_e2e.sqlite"));
  assert(true, "System gespeichert (für Hilfsmittel-Suche im Projekt-Tab)");

  // --- Zum Projekt-Tab wechseln (die Projekt-DB/UI existiert schon) - dort
  // liegen seit 05.09. nur noch die dokumentuebergreifenden Basisdaten
  // (MLCS-ID); alles CS-VP-Spezifische liegt jetzt im parallelen VP-Tab ---
  await page.click("#tabBtnProjekt");
  assert(await page.locator("#tabBtnProjekt").evaluate((el) => el.classList.contains("active")), "Projekt-Tab ist nach Klick aktiv");
  const nProjektFields = await page.evaluate(() => document.querySelectorAll("#projektForm [data-key]").length);
  assert(nProjektFields >= 1, `Projekt-Formular (nur Basisdaten) hat ${nProjektFields} Eingabefelder gerendert`);

  // --- System-Hilfsmittel-Suche: MLCS-ID aus dem System uebernehmen ---
  await page.fill("#systemHelperSearch", "Projekt-Testsystem");
  await page.waitForSelector(".combo-item");
  await page.click(".combo-item");
  const mlcsValue = await page.inputValue('#projektForm [data-key="mlcs_id"]');
  assert(mlcsValue === "7777", `MLCS-ID aus System-Suche übernommen: '${mlcsValue}'`);

  // --- Zum VP-Tab wechseln: CS-VP-spezifische Felder ---
  await page.click("#tabBtnVP");
  assert(await page.locator("#tabBtnVP").evaluate((el) => el.classList.contains("active")), "VP-Tab ist nach Klick aktiv");
  const nVpFields = await page.evaluate(() => document.querySelectorAll("#vpForm [data-key]").length);
  assert(nVpFields > 15, `VP-Formular hat ${nVpFields} Eingabefelder gerendert`);

  // --- Projekt-Basisfelder befuellen (projektbezeichnung ist CS-VP-spezifisch,
  // ist_folgeprojekt/folgeversion sind geteilt CS-VP+CS-VB) ---
  await page.fill('#vpForm [data-key="projektbezeichnung"]', "E2E Testprojekt");
  await page.check('#vpForm input[name="ist_folgeprojekt"][value="nein"]');
  await page.fill('#vpForm [data-key="folgeversion"]', "1.0");

  // --- Geteiltes Feld (ist_folgeprojekt) sollte jetzt auch im VB-Tab stehen ---
  await page.click("#tabBtnVB");
  const vbFolgeprojektWert = await page.evaluate(() => document.querySelector('#vbForm input[name="ist_folgeprojekt"]:checked')?.value);
  assert(vbFolgeprojektWert === "nein", `Geteiltes Feld ist_folgeprojekt erscheint auch im VB-Tab (Wert: ${vbFolgeprojektWert})`);
  await page.click("#tabBtnVP"); // zurueck zum VP-Tab fuer den Rest des Tests

  // --- Zusatzliste: Verantwortlichkeit des Lieferanten (freitext_erlaubt, nur im VP-Tab) ---
  const addBtns = await page.$$("#vpTabContent .add-row-btn");
  assert(addBtns.length === 1, `1 Hinzufügen-Button im VP-Tab (Lieferanten-Verantwortlichkeit), gefunden: ${addBtns.length}`);
  await addBtns[0].click(); // lieferant_verantwortlichkeit hinzufuegen
  await page.waitForSelector('[data-key^="lieferant_verantwortlichkeit.0."]');
  await page.selectOption('[data-key="lieferant_verantwortlichkeit.0.beschreibung"]', "die Durchführung der Validierung");

  const dirtyText = await page.textContent("#dirtyIndicatorBottom");
  assert(dirtyText.includes("Ungespeicherte"), "Dirty-Indikator (Projekt-Tab) zeigt ungespeicherte Änderungen an");

  // --- Speichern (Download-Fallback) ---
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#btnSaveBottom"),
  ]);
  const savedPath = path.join(DOWNLOAD_DIR, "masterform_projekt_e2e.sqlite");
  await download.saveAs(savedPath);
  assert(fs.existsSync(savedPath), "Projekt-Datenbank wurde als Datei herunterladen (Fallback-Pfad)");

  // --- Zurueck zum System-Tab: unveraendert nutzbar? ---
  await page.click("#tabBtnSystem");
  const systemNameStillThere = await page.inputValue('#systemForm [data-key="systemname"]');
  assert(systemNameStillThere === "E2E Projekt-Testsystem", "System-Tab-Formular bleibt beim Tab-Wechsel erhalten");

  // --- Integritaet der gespeicherten Projekt-Datei pruefen ---
  const SQL = await initSqlJs();
  const bytes = fs.readFileSync(savedPath);
  const verifyDb = new SQL.Database(bytes);
  const proj = verifyDb.exec("SELECT fv.field_key, fv.wert FROM records r JOIN field_values fv ON fv.record_id=r.id WHERE r.entity_type='projekt'");
  const projValues = Object.fromEntries(proj[0].values);
  assert(projValues.mlcs_id === "7777", "Projekt: MLCS-ID korrekt gespeichert: " + projValues.mlcs_id);
  assert(projValues.projektbezeichnung === "E2E Testprojekt", "Projekt: Projektbezeichnung korrekt gespeichert");
  assert(projValues.ist_folgeprojekt === "nein", "Projekt: ist_folgeprojekt korrekt gespeichert");

  const lv = verifyDb.exec("SELECT fv.field_key, fv.wert FROM records r JOIN field_values fv ON fv.record_id=r.id WHERE r.entity_type='lieferant_verantwortlichkeit'");
  const lvValues = Object.fromEntries(lv[0].values);
  assert(lvValues.beschreibung === "die Durchführung der Validierung", "Verantwortlichkeit des Lieferanten korrekt gespeichert: " + lvValues.beschreibung);

  const rel = verifyDb.exec("SELECT relation_type FROM relations");
  assert(rel.length > 0 && rel[0].values.length > 0, "Relation Lieferant-Verantwortlichkeit -> Projekt wurde angelegt");

  // Projekt-DB darf KEINE 'system'-Datensaetze enthalten (getrennte Dateien!)
  const sysInProjekt = verifyDb.exec("SELECT COUNT(*) FROM records WHERE entity_type='system'");
  assert(sysInProjekt[0].values[0][0] === 0, "Projekt-DB enthält keine System-Datensätze (echte Trennung der beiden Dateien)");

  verifyDb.close();

  console.log("\nAlle Projekt-DB-E2E-Checks erfolgreich.");
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
