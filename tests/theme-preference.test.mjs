// RecarregaAi! 2.5.0 - Testes de tema

import assert from "node:assert/strict";
import test from "node:test";

import { loadThemePreference } from "../extension/js/modules/theme.js";
import { storageKeys } from "../extension/js/modules/shared.js";

const createRoot = () => ({
  dataset: {}
});

const createStorageArea = (storedData = {}) => ({
  async get(key) {
    if (key === null) {
      return storedData;
    }

    if (Array.isArray(key)) {
      return Object.fromEntries(key.map((entryKey) => [
        entryKey,
        storedData[entryKey]
      ]));
    }

    return {
      [key]: storedData[key]
    };
  }
});

test("tema inicial da extensao e claro quando nao ha preferencia salva", async () => {
  globalThis.window = {
    matchMedia: () => ({
      matches: true
    })
  };

  const root = createRoot();
  const theme = await loadThemePreference({
    root,
    storageArea: createStorageArea()
  });

  assert.equal(theme, "light");
  assert.equal(root.dataset.theme, "light");
});

test("tema segue o sistema somente quando a opcao esta ativa", async () => {
  globalThis.window = {
    matchMedia: () => ({
      matches: true
    })
  };

  const root = createRoot();
  const theme = await loadThemePreference({
    root,
    storageArea: createStorageArea({
      [storageKeys.appSettings]: {
        useSystemTheme: true
      }
    })
  });

  assert.equal(theme, "dark");
  assert.equal(root.dataset.theme, "dark");
});
