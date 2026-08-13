// RecarregaAi! 2.5.0 — Popup principal

import { loadThemePreference, watchSystemTheme } from "../modules/theme.js";
import { getPermissionPatternForOrigin, runtimeMessageTypes, storageKeys } from "../modules/shared.js";
import { popupElements } from "./elements.js";
import {
  loadPopupLanguage,
  setActiveLanguage,
  getPopupCopy,
  replacePopupTokens
} from "./language.js";
import {
  updateStatusMessage,
  loadExtensionVersion
} from "./status.js";
import {
  loadTimerState,
  syncCustomTimerInputState,
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  refreshTimerState,
  clearCacheAndReloadCurrentPage,
  handleActiveTimersListClick,
  loadAndClearPendingStart
} from "./timer.js";

const loadTheme = async () => {
  await loadThemePreference();
  watchSystemTheme();
};

const initializePopup = async () => {
  await loadPopupLanguage();
  syncCustomTimerInputState();
  loadExtensionVersion();

  await loadTheme().catch((error) => {
    console.error("Erro ao carregar tema:", error);
  });
  await loadTimerState().catch((error) => {
    console.error("Erro ao carregar estado do timer:", error);
  });

  const pendingStart = await loadAndClearPendingStart();

  if (pendingStart) {
    const hasPermission = await chrome.permissions.contains({
      origins: [getPermissionPatternForOrigin(pendingStart.mainOrigin)]
    });

    if (hasPermission) {
      const { sendRuntimeMessage } = await import("./timer.js");

      sendRuntimeMessage({
        type: runtimeMessageTypes.startTimer,
        payload: pendingStart
      }).then(() => {
        updateStatusMessage(
          replacePopupTokens("startedStatus", {
            interval: replacePopupTokens(pendingStart.intervalInMinutes)
          }),
          "active"
        );
        return refreshTimerState();
      }).catch((error) => {
        console.error("Erro ao ativar timer apos permissao:", error);
        updateStatusMessage(
          getPopupCopy("startError"),
          "error"
        );
      });
    }
  }
};

popupElements.reloadPageButton.addEventListener("click", clearCacheAndReloadCurrentPage);
popupElements.openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
popupElements.pauseTimerButton.addEventListener("click", pauseTimer);
popupElements.removeTimerButton.addEventListener("click", stopTimer);
popupElements.resumeTimerButton.addEventListener("click", resumeTimer);
popupElements.startTimerButton.addEventListener("click", startTimer);
popupElements.stopTimerButton.addEventListener("click", stopTimer);
popupElements.activeTimersList.addEventListener("click", handleActiveTimersListClick);

popupElements.timerIntervalInputs.forEach((timerInput) => {
  timerInput.addEventListener("change", syncCustomTimerInputState);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const languageChange = changes[storageKeys.language];

  if (areaName !== "local" || !languageChange?.newValue) {
    return;
  }

  setActiveLanguage(languageChange.newValue);
  refreshTimerState({
    updateStatus: true
  }).catch((error) => {
    console.error("Erro ao atualizar idioma do popup:", error);
  });
});

initializePopup().catch((error) => {
  console.error("Erro ao iniciar popup do RecarregaAi:", error);
});

let popupRefreshTimerId = null;

const startPopupRefreshTimer = () => {
  if (popupRefreshTimerId) {
    return;
  }

  popupRefreshTimerId = setInterval(() => {
    refreshTimerState({
      updateStatus: true
    }).catch((error) => {
      console.error("Erro ao atualizar estado do timer:", error);
    });
  }, 1000);
};

const stopPopupRefreshTimer = () => {
  if (!popupRefreshTimerId) {
    return;
  }

  clearInterval(popupRefreshTimerId);
  popupRefreshTimerId = null;
};

startPopupRefreshTimer();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    stopPopupRefreshTimer();
    return;
  }

  startPopupRefreshTimer();
  refreshTimerState({
    updateStatus: true
  }).catch((error) => {
    console.error("Erro ao atualizar estado do timer:", error);
  });
});
