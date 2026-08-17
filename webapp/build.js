#!/usr/bin/env node
/* Baut aus app_template.html + app.js + Schema/Seed-SQL + sql.js (Engine+WASM)
 * eine einzige, eigenstaendige app.html - keine externen Dateien nötig,
 * funktioniert auch per Doppelklick (file://) ohne CORS-Probleme, weil
 * die WASM-Datei nicht per fetch/XHR nachgeladen, sondern als Base64
 * direkt mitgeliefert wird.
 *
 * Optional: eine fertige .sqlite-Datei als Startdatenbank einbetten, dann
 * entfaellt der Anlegen/Öffnen-Dialog beim Start (siehe app.js: STARTER_DB_B64).
 *
 * Nutzung:
 *   node build.js                                  -> app.html (leeres Schema)
 *   node build.js pfad/zu/daten.sqlite ausgabe.html -> mit eingebetteter Startdatenbank
 *
 * WICHTIG: eine mit echten Daten befuellte Ausgabedatei NICHT ins Git-Repo
 * aufnehmen (siehe KONZEPT.md - Code ins Repo, echte Daten bleiben lokal).
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DB_DIR = path.join(ROOT, "..", "db");

const starterDbPath = process.argv[2] || null;
const outName = process.argv[3] || "app.html";

const template = fs.readFileSync(path.join(ROOT, "app_template.html"), "utf8");
const appJs = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const schemaSql = fs.readFileSync(path.join(DB_DIR, "schema.sql"), "utf8");
const seedSql = fs.readFileSync(path.join(DB_DIR, "seed_field_definitions.sql"), "utf8");
const sqljsLib = fs.readFileSync(path.join(ROOT, "vendor", "sqljs", "sql-wasm.js"), "utf8");
const wasmB64 = fs.readFileSync(path.join(ROOT, "vendor", "sqljs", "sql-wasm.wasm")).toString("base64");
const starterDbB64 = starterDbPath ? fs.readFileSync(starterDbPath).toString("base64") : "";

let out = template;
out = out.replace(
  'const SCHEMA_SQL = /*__SCHEMA_SQL__*/"";',
  `const SCHEMA_SQL = ${JSON.stringify(schemaSql)};`
);
out = out.replace(
  'const SEED_SQL = /*__SEED_SQL__*/"";',
  `const SEED_SQL = ${JSON.stringify(seedSql)};`
);
out = out.replace(
  'const WASM_B64 = /*__WASM_B64__*/"";',
  `const WASM_B64 = ${JSON.stringify(wasmB64)};`
);
out = out.replace(
  'const STARTER_DB_B64 = /*__STARTER_DB_B64__*/"";',
  `const STARTER_DB_B64 = ${JSON.stringify(starterDbB64)};`
);
out = out.replace("/*__SQLJS_LIB__*/", sqljsLib);
out = out.replace('<script src="app.js"></script>', `<script>\n${appJs}\n</script>`);

const outPath = path.resolve(ROOT, outName); // resolve statt join: erlaubt auch absolute Ausgabepfade
fs.writeFileSync(outPath, out);
console.log("Gebaut:", outPath, "(", (out.length / 1024 / 1024).toFixed(2), "MB )", starterDbPath ? "- MIT eingebetteten Daten" : "- leeres Schema");
