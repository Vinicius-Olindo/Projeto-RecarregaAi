// RecarregaAi! 2.5.0

import { appConfig } from "./modules/config.js";
import { alarmNames, storageKeys, getTabIdFromTimerAlarmName } from "./modules/shared.js";
import { clearAllTimerBadges, startStoredBadgeCountdown } from "./modules/badge-manager.js";
import { getAllTimerSettings } from "./modules/storage.js";
import {
  queueTimerMaintenance,
  restoreGlobalPause,
  syncOperatingHoursState,
  resumeAllTimers,
  runScheduledRefresh,
  handleCompletedTabUpdate,
  restorePendingScrollPosition,
  removePendingScrollPosition,
  stopTimer,
  ensureStartupAlarms,
  pauseTimerForMedia,
  pauseTimerForTyping,
  resumeTimerWhenMediaSafetyEnds
} from "./modules/timer-management.js";
import { setupMessageListener } from "./modules/message-handler.js";

const openOnboardingPage = async () => {
  await chrome.tabs.create({
    active: true,
    url: chrome.runtime.getURL(appConfig.onboardingPagePath)
  });
};

const configureUninstallFeedbackPage = async () => {
  try {
    await chrome.runtime.setUninstallURL(appConfig.uninstallFeedbackPageUrl);
  } catch (error) {
    console.warn("Nao foi possivel configurar feedback de desinstalacao:", error);
  }
};

const bootstrapRecarregaAi = async ({
  markInstalled = false,
  openOnboarding = false,
  restoreAlarms = true
} = {}) => {
  await configureUninstallFeedbackPage();

  if (markInstalled) {
    await chrome.storage.local.set({
      recarregaAiInstalledAt: new Date().toISOString()
    });
  }

  if (restoreAlarms) {
    await queueTimerMaintenance(ensureStartupAlarms);
    await restoreGlobalPause();
    await syncOperatingHoursState();
  }

  if (openOnboarding) {
    await clearAllTimerBadges();
    await openOnboardingPage();
  }
};

chrome.runtime.onInstalled.addListener((details) => {
  bootstrapRecarregaAi({
    markInstalled: details.reason === "install",
    openOnboarding: details.reason === "install",
    restoreAlarms: details.reason !== "install"
  }).catch((error) => {
    console.error("Erro ao instalar/atualizar RecarregaAi:", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  bootstrapRecarregaAi().catch((error) => {
    console.error("Erro ao iniciar RecarregaAi:", error);
  });
});

setupMessageListener();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === alarmNames.badgeCountdown) {
    startStoredBadgeCountdown(
      getAllTimerSettings,
      pauseTimerForMedia,
      pauseTimerForTyping,
      resumeTimerWhenMediaSafetyEnds
    ).catch((error) => {
      console.error("Erro ao restaurar badges do RecarregaAi:", error);
    });
    return;
  }

  if (alarm.name === alarmNames.globalPause) {
    resumeAllTimers().catch((error) => {
      console.error("Erro ao retomar todos os timers do RecarregaAi:", error);
    });
    return;
  }

  if (alarm.name === alarmNames.operatingHoursBoundary) {
    syncOperatingHoursState().catch((error) => {
      console.error("Erro ao aplicar horario de funcionamento:", error);
    });
    return;
  }

  const tabId = getTabIdFromTimerAlarmName(alarm.name);

  if (typeof tabId === "number") {
    queueTimerMaintenance(() => runScheduledRefresh(tabId)).catch((error) => {
      console.error("Erro ao executar reload agendado do RecarregaAi:", error);
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  removePendingScrollPosition(tabId).catch((error) => {
    console.error("Erro ao limpar posicao da pagina:", error);
  });
  queueTimerMaintenance(() => stopTimer(tabId)).catch((error) => {
    console.error("Erro ao remover timer da guia fechada:", error);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") {
    return;
  }

  restorePendingScrollPosition(tabId).catch((error) => {
    console.error("Erro ao restaurar a posicao da pagina:", error);
  });

  queueTimerMaintenance(() => handleCompletedTabUpdate(tabId, tab)).catch((error) => {
    console.error("Erro ao preparar guia atualizada no RecarregaAi:", error);
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[storageKeys.appSettings]) {
    return;
  }

  syncOperatingHoursState().catch((error) => {
    console.error("Erro ao atualizar horario de funcionamento:", error);
  });
});

configureUninstallFeedbackPage().catch((error) => {
  console.error("Erro ao configurar feedback do RecarregaAi:", error);
});

queueTimerMaintenance(ensureStartupAlarms).catch((error) => {
  console.error("Erro ao restaurar alarmes do RecarregaAi:", error);
});
