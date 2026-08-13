// RecarregaAi! 2.5.0 — Testes de storage

import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyTimerCollection,
  defaultAppSettings,
  normalizeOperatingHours,
  normalizeTimerCollection,
  normalizeTimerSettings,
  storageKeys
} from "../extension/js/modules/shared.js";

test("storageKeys contem todas as chaves necessarias", () => {
  assert.equal(typeof storageKeys.actionHistory, "string");
  assert.equal(typeof storageKeys.appSettings, "string");
  assert.equal(typeof storageKeys.globalPause, "string");
  assert.equal(typeof storageKeys.language, "string");
  assert.equal(typeof storageKeys.lastTimerRun, "string");
  assert.equal(typeof storageKeys.theme, "string");
  assert.equal(typeof storageKeys.timerSettingsPrefix, "string");
  assert.equal(typeof storageKeys.timerSettings, "string");
});

test("defaultAppSettings tem valores padrao", () => {
  assert.equal(defaultAppSettings.advancedCleanupEnabled, false);
  assert.deepEqual(defaultAppSettings.autoStartSites, []);
  assert.equal(defaultAppSettings.defaultIntervalInMinutes, 3);
  assert.equal(defaultAppSettings.preserveScrollPosition, false);
  assert.equal(defaultAppSettings.useSystemTheme, false);
  assert.ok(defaultAppSettings.operatingHours);
});

test("createEmptyTimerCollection retorna colecao vazia", () => {
  const collection = createEmptyTimerCollection();

  assert.deepEqual(collection.timers, {});
  assert.equal(collection.version, 2);
});

test("normalizeTimerSettings retorna null para null", () => {
  assert.equal(normalizeTimerSettings(null), null);
});

test("normalizeTimerSettings retorna null para undefined", () => {
  assert.equal(normalizeTimerSettings(undefined), null);
});

test("normalizeTimerSettings retorna null sem tabId", () => {
  assert.equal(normalizeTimerSettings({ enabled: true }), null);
});

test("normalizeTimerSettings retorna null para tabId nao-numerico", () => {
  assert.equal(
    normalizeTimerSettings({ tabId: "abc", enabled: true }),
    null
  );
});

test("normalizeTimerSettings retorna null para enabled false", () => {
  assert.equal(
    normalizeTimerSettings({ tabId: 1, enabled: false }),
    null
  );
});

test("normalizeTimerSettings retorna timer normalizado", () => {
  const result = normalizeTimerSettings({
    tabId: 5,
    enabled: true,
    paused: true,
    mainOrigin: "https://example.com"
  });

  assert.equal(result.tabId, 5);
  assert.equal(result.enabled, true);
  assert.equal(result.paused, true);
  assert.equal(result.mainOrigin, "https://example.com");
});

test("normalizeTimerSettings define paused como false por padrao", () => {
  const result = normalizeTimerSettings({ tabId: 1, enabled: true });

  assert.equal(result.paused, false);
});

test("normalizeTimerCollection retorna colecao vazia para null", () => {
  const result = normalizeTimerCollection(null);

  assert.deepEqual(result.timers, {});
  assert.equal(result.version, 2);
});

test("normalizeTimerCollection retorna colecao vazia para undefined", () => {
  const result = normalizeTimerCollection(undefined);

  assert.deepEqual(result.timers, {});
  assert.equal(result.version, 2);
});

test("normalizeTimerCollection processa timers da v2", () => {
  const result = normalizeTimerCollection({
    version: 2,
    timers: {
      "10": { tabId: 10, enabled: true },
      "20": { tabId: 20, enabled: true }
    }
  });

  assert.ok(result.timers["10"]);
  assert.ok(result.timers["20"]);
  assert.equal(Object.keys(result.timers).length, 2);
});

test("normalizeTimerCollection descarta timers disabled na v2", () => {
  const result = normalizeTimerCollection({
    version: 2,
    timers: {
      "10": { tabId: 10, enabled: true },
      "20": { tabId: 20, enabled: false }
    }
  });

  assert.ok(result.timers["10"]);
  assert.equal(result.timers["20"], undefined);
});

test("normalizeTimerCollection processa timer unico da v1", () => {
  const result = normalizeTimerCollection({
    tabId: 15,
    enabled: true
  });

  assert.ok(result.timers["15"]);
  assert.equal(result.timers["15"].tabId, 15);
});

test("normalizeTimerCollection ignora timer invalido na v1", () => {
  const result = normalizeTimerCollection({
    tabId: "invalido"
  });

  assert.deepEqual(result.timers, {});
});

test("normalizeOperatingHours retorna valores padrao para null", () => {
  const result = normalizeOperatingHours(null);

  assert.equal(result.enabled, false);
  assert.equal(result.startTime, "08:00");
  assert.equal(result.endTime, "18:00");
  assert.deepEqual(result.weekdays, [1, 2, 3, 4, 5]);
});

test("normalizeOperatingHours mantem horarios validos", () => {
  const result = normalizeOperatingHours({
    enabled: true,
    startTime: "09:30",
    endTime: "17:45",
    weekdays: [0, 1, 2, 3, 4, 5, 6]
  });

  assert.equal(result.enabled, true);
  assert.equal(result.startTime, "09:30");
  assert.equal(result.endTime, "17:45");
  assert.deepEqual(result.weekdays, [0, 1, 2, 3, 4, 5, 6]);
});

test("normalizeOperatingHours corrige horario invalido", () => {
  const result = normalizeOperatingHours({
    startTime: "abc",
    endTime: "25:00"
  });

  assert.equal(result.startTime, "08:00");
  assert.equal(result.endTime, "18:00");
});

test("normalizeOperatingHours remove weekdays duplicados", () => {
  const result = normalizeOperatingHours({
    weekdays: [1, 1, 2, 2, 3]
  });

  assert.deepEqual(result.weekdays, [1, 2, 3]);
});

test("normalizeOperatingHours filtra weekdays fora do range", () => {
  const result = normalizeOperatingHours({
    weekdays: [0, 1, 7, 8, -1]
  });

  assert.deepEqual(result.weekdays, [0, 1]);
});

test("normalizeOperatingHours ordena weekdays", () => {
  const result = normalizeOperatingHours({
    weekdays: [5, 1, 3, 0]
  });

  assert.deepEqual(result.weekdays, [0, 1, 3, 5]);
});
