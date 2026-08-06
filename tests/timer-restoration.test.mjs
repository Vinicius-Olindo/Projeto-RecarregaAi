// RecarregaAi! 2.4.0

import assert from "node:assert/strict";
import test from "node:test";

import {
  createTimerRestorationPlan
} from "../extension/js/modules/timer-restoration.js";

const createTimer = (overrides = {}) => ({
  browserSessionId: "session-a",
  enabled: true,
  mainOrigin: "https://example.com",
  tabId: 10,
  tabUrl: "https://example.com/dashboard",
  ...overrides
});

const createTab = (overrides = {}) => ({
  id: 10,
  title: "Painel",
  url: "https://example.com/dashboard",
  windowId: 1,
  ...overrides
});

test("mantem o timer na guia da mesma sessao mesmo com outra rota", () => {
  const plan = createTimerRestorationPlan({
    browserSessionId: "session-a",
    openTabs: [
      createTab({
        url: "https://example.com/relatorios"
      })
    ],
    timerSettingsList: [createTimer()]
  });

  assert.equal(plan.active.length, 1);
  assert.equal(plan.active[0].isRebound, false);
  assert.equal(plan.navigationPaused.length, 0);
  assert.equal(plan.stale.length, 0);
});

test("pausa o timer quando a guia da mesma sessao mudou de dominio", () => {
  const plan = createTimerRestorationPlan({
    browserSessionId: "session-a",
    openTabs: [
      createTab({
        url: "https://other.example/dashboard"
      })
    ],
    timerSettingsList: [createTimer()]
  });

  assert.equal(plan.active.length, 0);
  assert.equal(plan.navigationPaused.length, 1);
  assert.equal(plan.stale.length, 0);
});

test("pausa o timer quando a guia abriu uma pagina interna do Chrome", () => {
  const plan = createTimerRestorationPlan({
    browserSessionId: "session-a",
    openTabs: [
      createTab({
        url: "chrome://settings/"
      })
    ],
    timerSettingsList: [createTimer()]
  });

  assert.equal(plan.active.length, 0);
  assert.equal(plan.navigationPaused.length, 1);
  assert.equal(plan.stale.length, 0);
});

test("religa um timer antigo somente a uma pagina correspondente unica", () => {
  const plan = createTimerRestorationPlan({
    browserSessionId: "session-b",
    openTabs: [
      createTab({
        id: 44
      })
    ],
    timerSettingsList: [createTimer()]
  });

  assert.equal(plan.active.length, 1);
  assert.equal(plan.active[0].isRebound, true);
  assert.equal(plan.active[0].tab.id, 44);
  assert.equal(plan.stale.length, 0);
});

test("descarta timer antigo quando nao existe pagina correspondente", () => {
  const plan = createTimerRestorationPlan({
    browserSessionId: "session-b",
    openTabs: [
      createTab({
        id: 44,
        url: "https://example.com/outra-pagina"
      })
    ],
    timerSettingsList: [createTimer()]
  });

  assert.equal(plan.active.length, 0);
  assert.equal(plan.stale.length, 1);
});

test("nao escolhe entre duas paginas correspondentes ambiguas", () => {
  const plan = createTimerRestorationPlan({
    browserSessionId: "session-b",
    openTabs: [
      createTab({
        id: 44
      }),
      createTab({
        id: 45
      })
    ],
    timerSettingsList: [createTimer()]
  });

  assert.equal(plan.active.length, 0);
  assert.equal(plan.stale.length, 1);
});

test("uma guia nao pode ser reivindicada por dois timers", () => {
  const plan = createTimerRestorationPlan({
    browserSessionId: "session-a",
    openTabs: [createTab()],
    timerSettingsList: [
      createTimer(),
      createTimer({
        browserSessionId: "session-b",
        tabId: 20
      })
    ]
  });

  assert.equal(plan.active.length, 1);
  assert.equal(plan.stale.length, 1);
});
