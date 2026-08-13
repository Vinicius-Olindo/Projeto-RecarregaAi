// RecarregaAi! 2.5.0

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  defaultLanguage,
  loadLanguagePreference,
  saveLanguagePreference,
  supportedLanguages
} from "../extension/js/modules/language-dialog.js";
import { storageKeys } from "../extension/js/modules/shared.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const readProjectFile = (filePath) => (
  readFileSync(join(root, filePath), "utf8")
);

test("popup oferece traducoes completas para os oito idiomas", () => {
  assert.deepEqual(supportedLanguages, [
    "pt-BR",
    "en",
    "es",
    "fr",
    "de",
    "it",
    "id",
    "tr"
  ]);

  const popupTranslations = JSON.parse(
    readProjectFile("extension/translations/popup.json")
  );

  const referenceKeys = Object.keys(popupTranslations.fr).sort();

  supportedLanguages.forEach((language) => {
    const langTranslations = popupTranslations[language];

    assert.ok(langTranslations, `Language ${language} missing in popup.json`);
    assert.deepEqual(
      Object.keys(langTranslations).sort(),
      referenceKeys,
      language
    );
  });
});

test("traducoes nao contem sinais de texto corrompido", () => {
  const popupTranslations = JSON.parse(
    readProjectFile("extension/translations/popup.json")
  );
  const optionsTranslations = JSON.parse(
    readProjectFile("extension/translations/options.json")
  );
  const serializedTranslations = JSON.stringify({
    optionsTranslations,
    popupTranslations
  });

  assert.doesNotMatch(serializedTranslations, /\u00c3\u0192.|\u00c3\u201a.|\u00c3\u00a2\u00e2\u201a\u00ac|\u00c3\u00b0\u00c5\u00b8/u);
  assert.doesNotMatch(serializedTranslations, /[A-Za-z]\?[A-Za-z]/u);
});

test("preferencia de idioma usa o armazenamento compartilhado", async () => {
  const writes = [];
  const storageArea = {
    get: async (key) => ({
      [key]: "de"
    }),
    set: async (value) => {
      writes.push(value);
    }
  };

  assert.equal(
    await loadLanguagePreference({
      fallbackLanguage: defaultLanguage,
      storageArea
    }),
    "de"
  );
  assert.equal(
    await saveLanguagePreference({
      language: "tr",
      storageArea
    }),
    "tr"
  );
  assert.deepEqual(writes, [{
    [storageKeys.language]: "tr"
  }]);
});

test("popup e configuracoes usam a preferencia compartilhada", () => {
  const popupSource = readProjectFile("extension/js/popup/language.js");
  const optionsSource = readProjectFile("extension/js/options/language.js");

  assert.match(popupSource, /loadLanguagePreference/u);
  assert.match(popupSource, /saveLanguagePreference/u);
  assert.match(optionsSource, /loadLanguagePreference/u);
  assert.match(optionsSource, /saveLanguagePreference/u);
});
