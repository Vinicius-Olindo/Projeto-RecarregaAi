// RecarregaAi! 2.5.0 — Testes de PWA e Service Workers

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionDir = join(__dirname, "..", "extension");

const readJson = (filePath) => JSON.parse(
  readFileSync(join(extensionDir, filePath), "utf-8")
);

const readHtml = (filePath) =>
  readFileSync(join(extensionDir, filePath), "utf-8");

const readText = (filePath) =>
  readFileSync(join(extensionDir, filePath), "utf-8");

test("manifest.json e manifest V3 valido", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.manifest_version, 3);
  assert.equal(typeof manifest.name, "string");
  assert.ok(manifest.name.length > 0);
  assert.equal(typeof manifest.version, "string");
});

test("manifest nao declara default_locale (usa i18n proprio)", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.default_locale, undefined);
});

test("manifest declara background service worker", () => {
  const manifest = readJson("manifest.json");

  assert.ok(manifest.background);
  assert.equal(manifest.background.service_worker, "js/background.js");
  assert.equal(manifest.background.type, "module");
});

test("manifest nao usa persistent background page", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.background?.page, undefined);
});

test("permissions inclui browsingData", () => {
  const manifest = readJson("manifest.json");

  assert.ok(manifest.permissions.includes("browsingData"));
});

test("permissions inclui alarms", () => {
  const manifest = readJson("manifest.json");

  assert.ok(manifest.permissions.includes("alarms"));
});

test("permissions inclui tabs ou activeTab", () => {
  const manifest = readJson("manifest.json");
  const hasTabs = manifest.permissions.includes("tabs");
  const hasActiveTab = manifest.permissions.includes("activeTab");

  assert.ok(hasTabs || hasActiveTab);
});

test("permissions inclui storage", () => {
  const manifest = readJson("manifest.json");

  assert.ok(manifest.permissions.includes("storage"));
});

test("permissions inclui scripting", () => {
  const manifest = readJson("manifest.json");

  assert.ok(manifest.permissions.includes("scripting"));
});

test("options_page aponta para options.html", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.options_page, "options.html");
});

test("action default_popup aponta para popup.html", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.action?.default_popup, "popup.html");
});

test("options.html usa CSP sem unsafe-inline", () => {
  const html = readHtml("options.html");
  const cspMeta = html.match(
    /content-security-policy[^>]*content="([^"]+)"/i
  );

  assert.ok(cspMeta, "CSP meta tag nao encontrada");
  assert.ok(!cspMeta[1].includes("unsafe-inline"));
  assert.ok(cspMeta[1].includes("style-src 'self'"));
  assert.ok(cspMeta[1].includes("script-src 'self'"));
});

test("options.html nao contem estilos inline", () => {
  const html = readHtml("options.html");
  const styleAttributeMatches = html.match(/style="[^"]+"/g) || [];

  assert.equal(
    styleAttributeMatches.length,
    0,
    `Estilos inline encontrados: ${styleAttributeMatches.join(", ")}`
  );
});

test("options.html nao usa onfocus, onclick ou handlers inline", () => {
  const html = readHtml("options.html");
  const inlineHandlers = html.match(
    /\bon(click|focus|blur|change|submit|load|error)\s*=/gi
  ) || [];

  assert.equal(
    inlineHandlers.length,
    0,
    `Handlers inline encontrados: ${inlineHandlers.join(", ")}`
  );
});

test("popup.html nao contem estilos inline", () => {
  const html = readHtml("popup.html");
  const styleAttributeMatches = html.match(/style="[^"]+"/g) || [];

  assert.equal(
    styleAttributeMatches.length,
    0,
    `Estilos inline encontrados: ${styleAttributeMatches.join(", ")}`
  );
});

test("background.js e modulo (type=module no manifest)", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.background?.type, "module");
});

test("background.js nao usa XMLHttpRequest sincrono", () => {
  const bg = readText("js/background.js");

  assert.ok(!bg.includes("new XMLHttpRequest"));
});

test("background.js nao usa eval()", () => {
  const bg = readText("js/background.js");

  assert.ok(!bg.includes("eval("));
});

test("cache.js usa browsingData.remove (compativel com SW)", () => {
  const cache = readText("js/modules/cache.js");

  assert.ok(cache.includes("chrome.browsingData.remove"));
});

test("limpeza avancada inclui serviceWorkers nos dataTypes", () => {
  const shared = readText("js/modules/shared.js");
  const advancedCacheDataTypesMatch = shared.match(
    /advancedCacheDataTypes\s*=\s*Object\.freeze\(\{[^}]+\}\)/s
  );

  assert.ok(
    advancedCacheDataTypesMatch,
    "advancedCacheDataTypes nao encontrado"
  );
  assert.ok(advancedCacheDataTypesMatch[0].includes("serviceWorkers: true"));
});

test("limpeza padrao nao remove serviceWorkers", () => {
  const shared = readText("js/modules/shared.js");
  const standardCacheDataTypesMatch = shared.match(
    /standardCacheDataTypes\s*=\s*Object\.freeze\(\{[^}]+\}\)/s
  );

  assert.ok(
    standardCacheDataTypesMatch,
    "standardCacheDataTypes nao encontrado"
  );
  assert.ok(!standardCacheDataTypesMatch[0].includes("serviceWorkers: true"));
});

test("storage.js nao depende de DOM", () => {
  const storage = readText("js/modules/storage.js");

  assert.ok(!storage.includes("document."));
  assert.ok(!storage.includes("window."));
});

test("timer-management.js nao depende de DOM diretamente", () => {
  const timer = readText("js/modules/timer-management.js");

  assert.ok(!timer.includes("document.querySelector"));
  assert.ok(!timer.includes("document.getElementById"));
});

test("todas as paginas publicas tem CSP", () => {
  const pages = ["options.html", "popup.html"];

  for (const page of pages) {
    const html = readHtml(page);
    const hasCsp = /content-security-policy/i.test(html);

    assert.ok(hasCsp, `${page} nao tem CSP`);
  }
});

test("manifest nao inclui content_scripts desnecessarios", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.content_scripts, undefined);
});

test("manifest nao usa web_accessible_resources", () => {
  const manifest = readJson("manifest.json");

  assert.equal(manifest.web_accessible_resources, undefined);
});
