// RecarregaAi! 2.5.0

import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync
} from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const readProjectFile = (filePath) => (
  readFileSync(join(root, filePath), "utf8")
);

test("manifesto, pacote e documentacao usam a mesma versao", () => {
  const manifest = JSON.parse(readProjectFile("extension/manifest.json"));
  const packageJson = JSON.parse(readProjectFile("package.json"));
  const packageLock = JSON.parse(readProjectFile("package-lock.json"));
  const readme = readProjectFile("README.md");

  assert.equal(manifest.version_name, manifest.version);
  assert.equal(packageJson.version, manifest.version);
  assert.equal(packageLock.version, manifest.version);
  assert.equal(packageLock.packages[""].version, manifest.version);
  assert.match(readme, new RegExp(`atual: ${manifest.version}\\b`, "u"));
});

test("CTA da loja permanece oculto enquanto nao houver URL configurada", () => {
  const config = readProjectFile("site/js/modules/config.js");
  const script = readProjectFile("site/js/script.js");
  const stylesheet = readProjectFile("site/css/style.css");

  assert.match(config, /chromeWebStoreUrl:\s*""/u);
  assert.match(script, /link\.removeAttribute\("href"\)/u);
  assert.match(
    stylesheet,
    /\[data-chrome-web-store-link\]\[hidden\]\s*\{[^}]*display:\s*none\s*!important/isu
  );
});

test("Cloudflare aplica cabecalhos de seguranca nas paginas publicas", () => {
  const headers = readProjectFile("site/_headers");

  assert.match(headers, /Content-Security-Policy:/u);
  assert.match(headers, /frame-ancestors 'none'/u);
  assert.match(headers, /X-Frame-Options: DENY/u);
  assert.match(headers, /X-Content-Type-Options: nosniff/u);
  assert.match(headers, /Referrer-Policy: no-referrer/u);
});

test("projeto nao mantem publicacao obsoleta do GitHub Pages", () => {
  assert.equal(
    existsSync(join(root, ".github/workflows/pages.yml")),
    false
  );
  assert.doesNotMatch(
    readProjectFile("README.md"),
    /configure o GitHub Pages/iu
  );
});

test("projeto nao mantem empacotador e imagens obsoletos", () => {
  const removedFiles = [
    "scripts/package-extension.ps1",
    "extension/assets/icons/recarregaai.svg",
    "site/assets/icons/recarregaai.svg",
    "site/assets/icons/icon32.png",
    "site/assets/icons/icon48.png"
  ];

  removedFiles.forEach((filePath) => {
    assert.equal(existsSync(join(root, filePath)), false, filePath);
  });
  assert.doesNotMatch(readProjectFile("package.json"), /zip:ps/u);
});

test("URLs publicas canonicas nao possuem barra duplicada", () => {
  const privacyPage = readProjectFile("extension/public/privacy.html");

  assert.doesNotMatch(privacyPage, /pages\.dev\/\//u);
});
