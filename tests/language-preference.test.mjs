// RecarregaAi! 2.4.0

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  extendedPageTranslations,
  extendPageTranslations
} from "../extension/js/modules/extended-translations.js";
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

  const referenceKeys = Object.keys(extendedPageTranslations.popup.fr).sort();
  const baseCopy = Object.fromEntries(referenceKeys.map((key) => [key, key]));
  const translations = extendPageTranslations({
    "pt-BR": baseCopy,
    en: baseCopy,
    es: baseCopy
  }, "popup");

  supportedLanguages.forEach((language) => {
    assert.deepEqual(
      Object.keys(translations[language]).sort(),
      referenceKeys,
      language
    );
  });
});

test("traducoes estendidas nao contem sinais de texto corrompido", () => {
  const serializedTranslations = JSON.stringify(
    extendedPageTranslations.popup
  );

  assert.doesNotMatch(serializedTranslations, /Ã.|Â.|â€|ðŸ/u);
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
  const popupSource = readProjectFile("extension/js/popup.js");
  const optionsSource = readProjectFile("extension/js/options.js");

  assert.match(popupSource, /loadLanguagePreference/u);
  assert.match(popupSource, /changes\[storageKeys\.language\]/u);
  assert.match(optionsSource, /initializeOptionsLanguageDialog/u);
  assert.match(optionsSource, /saveLanguagePreference/u);
});
