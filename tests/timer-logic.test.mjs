// RecarregaAi! 2.5.0 — Testes de timer

import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCountdownTime,
  getBadgeColor,
  getBadgeText,
  getNextRunDate,
  getNextRunDateFromSeconds,
  getRemainingSeconds,
  getTimerAlarmName,
  getTabIdFromTimerAlarmName,
  isWithinOperatingHours,
  maximumTimerIntervalInMinutes,
  normalizeOrigins,
  normalizeTimerIntervalInMinutes,
  normalizeTimerCollection,
  normalizeTimerSettings,
  getUrlOrigin
} from "../extension/js/modules/shared.js";

const ONE_MINUTE_MS = 60 * 1000;
const ONE_SECOND_MS = 1000;

test("getNextRunDate retorna ISO no futuro", () => {
  const before = Date.now();
  const result = new Date(getNextRunDate(5));
  const after = Date.now();

  assert.ok(result.getTime() >= before + 5 * ONE_MINUTE_MS);
  assert.ok(result.getTime() <= after + 5 * ONE_MINUTE_MS);
});

test("getNextRunDateFromSeconds retorna ISO no futuro", () => {
  const before = Date.now();
  const result = new Date(getNextRunDateFromSeconds(120));
  const after = Date.now();

  assert.ok(result.getTime() >= before + 120 * ONE_SECOND_MS);
  assert.ok(result.getTime() <= after + 120 * ONE_SECOND_MS);
});

test("normalizeTimerIntervalInMinutes aceita somente a faixa suportada", () => {
  assert.equal(normalizeTimerIntervalInMinutes(1), 1);
  assert.equal(
    normalizeTimerIntervalInMinutes(maximumTimerIntervalInMinutes),
    maximumTimerIntervalInMinutes
  );
  assert.equal(normalizeTimerIntervalInMinutes(1.9), 1);
  assert.equal(normalizeTimerIntervalInMinutes(0), null);
  assert.equal(normalizeTimerIntervalInMinutes(-1), null);
  assert.equal(
    normalizeTimerIntervalInMinutes(maximumTimerIntervalInMinutes + 1),
    null
  );
  assert.equal(normalizeTimerIntervalInMinutes("abc"), null);
});

test("getRemainingSeconds retorna 0 para null", () => {
  assert.equal(getRemainingSeconds(null), 0);
});

test("getRemainingSeconds retorna 0 para data no passado", () => {
  const pastDate = new Date(Date.now() - 10 * ONE_SECOND_MS).toISOString();

  assert.equal(getRemainingSeconds(pastDate), 0);
});

test("getRemainingSeconds retorna valor correto para futuro", () => {
  const futureDate = new Date(Date.now() + 5 * ONE_SECOND_MS).toISOString();
  const remaining = getRemainingSeconds(futureDate);

  assert.ok(remaining >= 4);
  assert.ok(remaining <= 6);
});

test("formatCountdownTime formata corretamente", () => {
  assert.equal(formatCountdownTime(0), "0:00");
  assert.equal(formatCountdownTime(30), "0:30");
  assert.equal(formatCountdownTime(61), "1:01");
  assert.equal(formatCountdownTime(600), "10:00");
});

test("getBadgeText retorna 99+ para mais de 5999 segundos", () => {
  const farFuture = new Date(Date.now() + 6000 * ONE_SECOND_MS).toISOString();

  assert.equal(getBadgeText(farFuture), "99+");
});

test("getBadgeText retorna countdown para menos de 6000 segundos", () => {
  const nearFuture = new Date(Date.now() + 120 * ONE_SECOND_MS).toISOString();

  assert.equal(getBadgeText(nearFuture), "2:00");
});

test("getBadgeColor retorna laranja para <= 10s", () => {
  const soon = new Date(Date.now() + 5 * ONE_SECOND_MS).toISOString();

  assert.equal(getBadgeColor(soon), "#d97706");
});

test("getBadgeColor retorna verde para > 10s", () => {
  const later = new Date(Date.now() + 30 * ONE_SECOND_MS).toISOString();

  assert.equal(getBadgeColor(later), "#0d9488");
});

test("getTimerAlarmName gera nome correto", () => {
  assert.equal(
    getTimerAlarmName(42),
    "recarregaAiAutomaticReload:42"
  );
});

test("getTabIdFromTimerAlarmName extrai tabId", () => {
  assert.equal(
    getTabIdFromTimerAlarmName("recarregaAiAutomaticReload:42"),
    42
  );
});

test("getTabIdFromTimerAlarmName retorna null para nome invalido", () => {
  assert.equal(getTabIdFromTimerAlarmName("outro-alarme"), null);
  assert.equal(
    getTabIdFromTimerAlarmName("recarregaAiAutomaticReload:abc"),
    null
  );
});

test("normalizeOrigins filtra URLs invalidas", () => {
  const result = normalizeOrigins([
    "https://example.com",
    "not-a-url",
    "https://example.com",
    "http://test.org"
  ]);

  assert.deepEqual(result, [
    "https://example.com",
    "http://test.org"
  ]);
});

test("normalizeOrigins ignora protocolos nao-HTTP", () => {
  const result = normalizeOrigins([
    "chrome://settings",
    "ftp://example.com",
    "file:///local"
  ]);

  assert.deepEqual(result, []);
});

test("getUrlOrigin retorna origin para URL valida", () => {
  assert.equal(
    getUrlOrigin("https://example.com/path"),
    "https://example.com"
  );
});

test("getUrlOrigin retorna null para URL invalida", () => {
  assert.equal(getUrlOrigin("not-a-url"), null);
});

test("getUrlOrigin retorna null para protocolo nao-HTTP", () => {
  assert.equal(getUrlOrigin("chrome://settings"), null);
});

test("normalizeTimerSettings retorna null para dados invalidos", () => {
  assert.equal(normalizeTimerSettings(null), null);
  assert.equal(normalizeTimerSettings({}), null);
  assert.equal(normalizeTimerSettings({ tabId: "abc" }), null);
  assert.equal(normalizeTimerSettings({ tabId: 1, enabled: false }), null);
});

test("normalizeTimerSettings retorna timer valido", () => {
  const result = normalizeTimerSettings({ tabId: 5, enabled: true });

  assert.equal(result.tabId, 5);
  assert.equal(result.enabled, true);
  assert.equal(result.paused, false);
});

test("normalizeTimerCollection retorna colecao vazia para null", () => {
  const result = normalizeTimerCollection(null);

  assert.deepEqual(result.timers, {});
  assert.equal(result.version, 2);
});

test("normalizeTimerCollection normaliza timers da v2", () => {
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

test("isWithinOperatingHours retorna true quando desabilitado", () => {
  assert.equal(
    isWithinOperatingHours({ enabled: false }),
    true
  );
});

test("isWithinOperatingHours retorna true dentro do horario", () => {
  const now = new Date();
  const weekday = now.getDay();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  assert.equal(
    isWithinOperatingHours({
      enabled: true,
      startTime: `${hours}:${minutes}`,
      endTime: "23:59",
      weekdays: [weekday]
    }),
    true
  );
});

test("isWithinOperatingHours retorna false fora do horario", () => {
  const now = new Date();
  const weekday = now.getDay();

  assert.equal(
    isWithinOperatingHours({
      enabled: true,
      startTime: "00:00",
      endTime: "01:00",
      weekdays: [weekday]
    }),
    false
  );
});

test("isWithinOperatingHours retorna false para dia nao incluido", () => {
  const excludedDay = (new Date().getDay() + 1) % 7;

  assert.equal(
    isWithinOperatingHours({
      enabled: true,
      startTime: "00:00",
      endTime: "23:59",
      weekdays: [excludedDay]
    }),
    false
  );
});
