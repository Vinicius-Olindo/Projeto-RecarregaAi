// RecarregaAi! 2.5.0 — Timer do popup

import {
  actionHistoryStatuses,
  getPermissionPatternForOrigin,
  getUrlOrigin,
  pauseReasons,
  runtimeMessageTypes
} from "../modules/shared.js";
import { clearCacheForOrigins, reloadTabIgnoringCache } from "../modules/cache.js";
import { collectLoadedOrigins } from "../modules/tabs.js";
import { popupElements } from "./elements.js";
import {
  getPopupCopy,
  replacePopupTokens
} from "./language.js";
import {
  updateButtonState,
  updateStatusMessage,
  getTimerVisualState,
  getTimerTabLabel,
  getAutomaticPausePresentation,
  getPausePresentationCopy,
  formatTimerInterval,
  formatActiveTimerCount
} from "./status.js";

const PENDING_START_KEY = "recarregaAiPendingStart";
const presetTimerIntervals = [3, 5, 10];

let automaticResumeNoticeUntil = 0;
let currentActiveTab = null;
let lastObservedTimerState = null;

export const getActiveTab = async () => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return activeTab;
};

const sendRuntimeMessage = (message) => new Promise((resolve, reject) => {
  chrome.runtime.sendMessage(message, (response) => {
    const runtimeError = chrome.runtime.lastError;

    if (runtimeError) {
      reject(new Error(runtimeError.message));
      return;
    }

    if (response?.ok === false) {
      reject(new Error(response.error));
      return;
    }

    resolve(response);
  });
});

const recordManualCleanupHistory = async ({
  detail = null,
  origin,
  status
}) => {
  try {
    await sendRuntimeMessage({
      payload: {
        detail,
        origin,
        status
      },
      type: runtimeMessageTypes.recordManualCleanup
    });
  } catch (error) {
    console.warn("Nao foi possivel registrar a limpeza no historico:", error);
  }
};

export const clearCacheAndReloadCurrentPage = async () => {
  let cleanupOrigin = null;

  try {
    updateButtonState(
      popupElements.reloadPageButton,
      true,
      getPopupCopy("loadingCleanup"),
      getPopupCopy("updateNowButton")
    );
    updateStatusMessage(getPopupCopy("workingCheck"), "working");

    const activeTab = await getActiveTab();

    if (typeof activeTab?.id !== "number") {
      updateStatusMessage(getPopupCopy("tabUnavailable"), "error");
      return;
    }

    const origin = getUrlOrigin(activeTab.url);

    if (!origin) {
      updateStatusMessage(getPopupCopy("unsupportedPage"), "error");
      return;
    }

    cleanupOrigin = origin;

    const loadedOrigins = await collectLoadedOrigins(activeTab.id, [origin]);

    updateStatusMessage(
      getPopupCopy("cleaningPage"),
      "working"
    );

    await clearCacheForOrigins(loadedOrigins);
    await reloadTabIgnoringCache(activeTab.id);
    await recordManualCleanupHistory({
      origin: cleanupOrigin,
      status: actionHistoryStatuses.success
    });

    updateStatusMessage(getPopupCopy("cleanupSuccess"), "success");
  } catch (error) {
    console.error("Erro ao limpar cache e recarregar:", error);

    if (cleanupOrigin) {
      await recordManualCleanupHistory({
        detail: error.message,
        origin: cleanupOrigin,
        status: actionHistoryStatuses.error
      });
    }

    updateStatusMessage(getPopupCopy("cleanupError"), "error");
  } finally {
    updateButtonState(
      popupElements.reloadPageButton,
      false,
      getPopupCopy("loadingCleanup"),
      getPopupCopy("updateNowButton")
    );
  }
};

export const getSelectedTimerInterval = () => {
  const selectedTimerInput = document.querySelector("[name='timer-interval']:checked");

  if (selectedTimerInput?.value !== "custom") {
    return Number(selectedTimerInput.value);
  }

  const customInterval = Number(popupElements.customTimerInput.value);

  if (!Number.isFinite(customInterval) || customInterval < 1) {
    throw new Error(getPopupCopy("invalidInterval"));
  }

  return Math.floor(customInterval);
};

const getTimerState = async (activeTabId = null) => (
  sendRuntimeMessage({
    payload: {
      activeTabId
    },
    type: runtimeMessageTypes.getTimerState
  })
);

const updateTimerActionButtons = (timerSettings) => {
  const hasTimer = Boolean(timerSettings?.enabled);
  const isPaused = Boolean(timerSettings?.paused);

  popupElements.openControlledTabButton.hidden = true;
  popupElements.pauseTimerButton.hidden = !hasTimer || isPaused;
  popupElements.removeTimerButton.hidden = !hasTimer;
  popupElements.resumeTimerButton.hidden = !hasTimer || !isPaused;
  popupElements.stopTimerButton.disabled = !hasTimer;
};

const updateTimerProtectionStatus = (timerSettings) => {
  const presentation = getAutomaticPausePresentation(timerSettings);

  popupElements.timerProtectionStatus.hidden = !presentation;

  if (!presentation) {
    delete popupElements.timerProtectionStatus.dataset.reason;
    delete popupElements.timerProtectionStatus.dataset.phase;
    return;
  }

  popupElements.timerProtectionStatus.dataset.reason = presentation.reason;
  popupElements.timerProtectionStatus.dataset.phase = presentation.state;
  popupElements.timerProtectionTitle.textContent = getPausePresentationCopy(
    presentation,
    "titleKey"
  );
  popupElements.timerProtectionDetail.textContent = getPausePresentationCopy(
    presentation,
    "detailKey"
  );
};

const updateTimerOverview = (timerSettings) => {
  if (!timerSettings?.enabled) {
    popupElements.timerOverview.dataset.state = "empty";
    popupElements.controlledTabTitle.textContent = getPopupCopy("refreshOffTitle");
    popupElements.controlledTabUrl.textContent = getPopupCopy("chooseTime");
    popupElements.popupCountdown.textContent = "--:--";
    updateTimerProtectionStatus(timerSettings);
    updateTimerActionButtons(timerSettings);
    return;
  }

  const timerVisualState = getTimerVisualState(timerSettings);

  popupElements.timerOverview.dataset.state = timerVisualState.state;
  popupElements.controlledTabTitle.textContent = getTimerTabLabel(timerSettings);
  popupElements.controlledTabUrl.textContent = timerSettings.tabUrl
    || timerSettings.mainOrigin
    || getPopupCopy("pageNotIdentified");
  popupElements.popupCountdown.textContent = timerVisualState.countdownText;

  updateTimerProtectionStatus(timerSettings);
  updateTimerActionButtons(timerSettings);
};

const createActiveTimerItem = (timerSettings, activeTab) => {
  const item = document.createElement("article");
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  const url = document.createElement("span");
  const meta = document.createElement("div");
  const countdown = document.createElement("span");
  const openButton = document.createElement("button");
  const timerVisualState = getTimerVisualState(timerSettings);
  const isCurrentTab = activeTab?.id === timerSettings.tabId;

  item.className = "active-timers__item";
  item.dataset.state = timerVisualState.state;
  copy.className = "active-timers__copy";
  title.className = "active-timers__title";
  url.className = "active-timers__url";
  meta.className = "active-timers__meta";
  countdown.className = "active-timers__countdown";
  openButton.className = "popup__button popup__button--ghost active-timers__button";
  openButton.type = "button";

  title.textContent = getTimerTabLabel(timerSettings);
  url.textContent = timerSettings.tabUrl
    || timerSettings.mainOrigin
    || getPopupCopy("pageNotIdentified");
  countdown.textContent = timerVisualState.countdownText;
  openButton.textContent = isCurrentTab
    ? getPopupCopy("currentButton")
    : getPopupCopy("openButton");
  openButton.disabled = isCurrentTab;
  openButton.dataset.openTimerTab = String(timerSettings.tabId);

  copy.append(title, url);
  meta.append(countdown, openButton);
  item.append(copy, meta);

  return item;
};

const updateActiveTimersList = (activeTimers, activeTab) => {
  const hasCurrentTabTimer = activeTimers.some((timerSettings) => (
    timerSettings.tabId === activeTab?.id
  ));
  const shouldShowActiveTimers = activeTimers.length > 0
    && (!hasCurrentTabTimer || activeTimers.length > 1);

  popupElements.activeTimersList.replaceChildren();
  popupElements.activeTimersSection.hidden = !shouldShowActiveTimers;
  popupElements.activeTimersCount.textContent = String(activeTimers.length);

  if (!shouldShowActiveTimers) {
    return;
  }

  activeTimers.forEach((timerSettings) => {
    popupElements.activeTimersList.append(
      createActiveTimerItem(timerSettings, activeTab)
    );
  });
};

const createObservedTimerState = (timerSettings) => (
  timerSettings?.enabled
    ? {
      pauseReason: timerSettings.pauseReason,
      paused: Boolean(timerSettings.paused),
      tabId: timerSettings.tabId
    }
    : null
);

const hasAutomaticallyResumed = (timerSettings, previousTimerState) => (
  Boolean(
    timerSettings?.enabled
    && previousTimerState?.tabId === timerSettings.tabId
    && previousTimerState.paused
    && [pauseReasons.media, pauseReasons.typing].includes(
      previousTimerState.pauseReason
    )
    && !timerSettings.paused
  )
);

const updateInactiveTimerStatus = (activeTimers) => {
  if (activeTimers.length === 0) {
    updateStatusMessage(getPopupCopy("noActiveStatus"), "neutral");
    return;
  }

  updateStatusMessage(
    replacePopupTokens("activePageOffStatus", {
      count: formatActiveTimerCount(activeTimers.length)
    }),
    "active"
  );
};

const updateEnabledTimerStatus = (
  timerSettings,
  showAutomaticResumeNotice
) => {
  const automaticPausePresentation = getAutomaticPausePresentation(
    timerSettings
  );

  if (automaticPausePresentation) {
    updateStatusMessage(
      getPausePresentationCopy(
        automaticPausePresentation,
        "statusKey"
      ),
      automaticPausePresentation.statusTone || "warning"
    );
    return;
  }

  if (timerSettings.paused) {
    updateStatusMessage(getPopupCopy("pausedStatus"), "warning");
    return;
  }

  if (showAutomaticResumeNotice) {
    updateStatusMessage(getPopupCopy("automaticResumeStatus"), "active");
    return;
  }

  updateStatusMessage(
    replacePopupTokens("activeStatus", {
      interval: formatTimerInterval(timerSettings.intervalInMinutes)
    }),
    "active"
  );
};

const updateCurrentTimerStatus = (
  timerSettings,
  activeTimers,
  showAutomaticResumeNotice
) => {
  if (!timerSettings?.enabled) {
    updateInactiveTimerStatus(activeTimers);
    return;
  }

  updateEnabledTimerStatus(timerSettings, showAutomaticResumeNotice);
};

export const refreshTimerState = async ({ updateStatus = false } = {}) => {
  const activeTab = await getActiveTab();

  currentActiveTab = activeTab || null;

  const response = await getTimerState(activeTab?.id);
  const timerSettings = response.timerSettings;
  const activeTimers = response.activeTimers || [];
  const previousTimerState = lastObservedTimerState;
  const didAutomaticallyResume = hasAutomaticallyResumed(
    timerSettings,
    previousTimerState
  );

  if (didAutomaticallyResume) {
    automaticResumeNoticeUntil = Date.now() + 4000;
  }

  const showAutomaticResumeNotice = Date.now() < automaticResumeNoticeUntil;

  lastObservedTimerState = createObservedTimerState(timerSettings);

  updateTimerOverview(timerSettings);
  updateActiveTimersList(activeTimers, activeTab);

  if (!updateStatus) {
    return timerSettings;
  }

  updateCurrentTimerStatus(
    timerSettings,
    activeTimers,
    showAutomaticResumeNotice
  );

  return timerSettings;
};

export const syncCustomTimerInputState = () => {
  const selectedTimerInput = document.querySelector("[name='timer-interval']:checked");
  const isCustomTimer = selectedTimerInput?.value === "custom";

  popupElements.customTimerInput.disabled = !isCustomTimer;

  if (isCustomTimer) {
    popupElements.customTimerInput.focus();
  }
};

export const selectTimerInterval = (intervalInMinutes) => {
  const presetValue = presetTimerIntervals.includes(intervalInMinutes)
    ? String(intervalInMinutes)
    : "custom";

  const timerInput = document.querySelector(`[name='timer-interval'][value='${presetValue}']`);

  if (timerInput) {
    timerInput.checked = true;
  }

  if (presetValue === "custom") {
    popupElements.customTimerInput.value = intervalInMinutes;
  }

  syncCustomTimerInputState();
};

export const loadTimerState = async () => {
  const timerSettings = await refreshTimerState({
    updateStatus: true
  });

  if (timerSettings?.intervalInMinutes) {
    selectTimerInterval(timerSettings.intervalInMinutes);
  }
};

export const startTimer = async () => {
  try {
    updateButtonState(
      popupElements.startTimerButton,
      true,
      getPopupCopy("activatingTimer"),
      getPopupCopy("defaultStartButton")
    );
    updateStatusMessage(getPopupCopy("prepareTimer"), "working");

    const activeTab = currentActiveTab;

    if (typeof activeTab?.id !== "number") {
      updateStatusMessage(
        getPopupCopy("waitForPage"),
        "error"
      );
      return;
    }

    const origin = getUrlOrigin(activeTab.url);

    if (!origin) {
      updateStatusMessage(getPopupCopy("unsupportedPage"), "error");
      return;
    }

    const intervalInMinutes = getSelectedTimerInterval();
    const loadedOrigins = await collectLoadedOrigins(activeTab.id, [origin]);
    const permissionPattern = getPermissionPatternForOrigin(origin);

    const alreadyGranted = await chrome.permissions.contains({
      origins: [permissionPattern]
    });

    if (!alreadyGranted) {
      await savePendingStart({
        intervalInMinutes,
        mainOrigin: origin,
        origins: loadedOrigins,
        tabId: activeTab.id,
        tabTitle: activeTab.title,
        tabUrl: activeTab.url,
        windowId: activeTab.windowId
      });

      chrome.permissions.request({
        origins: [permissionPattern]
      }).catch(() => undefined);

      return;
    }

    sendRuntimeMessage({
      type: runtimeMessageTypes.startTimer,
      payload: {
        intervalInMinutes,
        mainOrigin: origin,
        origins: loadedOrigins,
        tabId: activeTab.id,
        tabTitle: activeTab.title,
        tabUrl: activeTab.url,
        windowId: activeTab.windowId
      }
    }).then(() => {
      updateStatusMessage(
        replacePopupTokens("startedStatus", {
          interval: formatTimerInterval(intervalInMinutes)
        }),
        "active"
      );
      return refreshTimerState();
    }).catch((error) => {
      console.error("Erro ao ativar timer:", error);
      updateStatusMessage(
        error.message || getPopupCopy("startError"),
        "error"
      );
    }).finally(() => {
      updateButtonState(
        popupElements.startTimerButton,
        false,
        getPopupCopy("activatingTimer"),
        getPopupCopy("defaultStartButton")
      );
    });
  } catch (error) {
    console.error("Erro ao ativar timer:", error);
    updateStatusMessage(
      error.message || getPopupCopy("startError"),
      "error"
    );
    updateButtonState(
      popupElements.startTimerButton,
      false,
      getPopupCopy("activatingTimer"),
      getPopupCopy("defaultStartButton")
    );
  }
};

const getActiveTabIdForTimerAction = async () => {
  const activeTab = await getActiveTab();

  if (typeof activeTab?.id !== "number") {
    throw new Error(getPopupCopy("tabUnavailable"));
  }

  return activeTab.id;
};

export const stopTimer = async () => {
  try {
    const tabId = await getActiveTabIdForTimerAction();

    updateButtonState(
      popupElements.removeTimerButton,
      true,
      getPopupCopy("removingTimer"),
      getPopupCopy("removeTimer")
    );

    await sendRuntimeMessage({
      payload: {
        tabId
      },
      type: runtimeMessageTypes.stopTimer
    });

    await refreshTimerState();
    updateStatusMessage(getPopupCopy("stopStatus"), "warning");
  } catch (error) {
    console.error("Erro ao parar timer:", error);
    updateStatusMessage(getPopupCopy("stopError"), "error");
  } finally {
    updateButtonState(
      popupElements.removeTimerButton,
      false,
      getPopupCopy("removingTimer"),
      getPopupCopy("removeTimer")
    );
  }
};

export const pauseTimer = async () => {
  try {
    const tabId = await getActiveTabIdForTimerAction();

    updateButtonState(
      popupElements.pauseTimerButton,
      true,
      getPopupCopy("pausingTimer"),
      getPopupCopy("pauseTimer")
    );

    await sendRuntimeMessage({
      payload: {
        tabId
      },
      type: runtimeMessageTypes.pauseTimer
    });

    updateStatusMessage(getPopupCopy("pausedStatus"), "warning");
    await refreshTimerState();
  } catch (error) {
    console.error("Erro ao pausar timer:", error);
    updateStatusMessage(getPopupCopy("pauseError"), "error");
  } finally {
    updateButtonState(
      popupElements.pauseTimerButton,
      false,
      getPopupCopy("pausingTimer"),
      getPopupCopy("pauseTimer")
    );
  }
};

export const resumeTimer = async () => {
  try {
    const tabId = await getActiveTabIdForTimerAction();

    updateButtonState(
      popupElements.resumeTimerButton,
      true,
      getPopupCopy("resumingTimer"),
      getPopupCopy("resumeTimer")
    );

    await sendRuntimeMessage({
      payload: {
        tabId
      },
      type: runtimeMessageTypes.resumeTimer
    });

    updateStatusMessage(getPopupCopy("resumeStatus"), "active");
    await refreshTimerState();
  } catch (error) {
    console.error("Erro ao retomar timer:", error);
    updateStatusMessage(getPopupCopy("resumeError"), "error");
  } finally {
    updateButtonState(
      popupElements.resumeTimerButton,
      false,
      getPopupCopy("resumingTimer"),
      getPopupCopy("resumeTimer")
    );
  }
};

export const openControlledTab = async (tabId) => {
  try {
    await sendRuntimeMessage({
      payload: {
        tabId
      },
      type: runtimeMessageTypes.openTimerTab
    });
  } catch (error) {
    console.error("Erro ao abrir página controlada:", error);
    updateStatusMessage(getPopupCopy("openControlledPageError"), "error");
  }
};

export const openOptionsPage = () => {
  chrome.runtime.openOptionsPage();
};

export const handleActiveTimersListClick = (event) => {
  const openButton = event.target.closest("[data-open-timer-tab]");

  if (!openButton || openButton.disabled) {
    return;
  }

  openControlledTab(Number(openButton.dataset.openTimerTab));
};

export const savePendingStart = async (data) => {
  try {
    await chrome.storage.session.set({ [PENDING_START_KEY]: data });
  } catch (error) {
    console.warn("Nao foi possivel salvar inicio pendente:", error);
  }
};

export const loadAndClearPendingStart = async () => {
  try {
    const data = await chrome.storage.session.get(PENDING_START_KEY);
    const pending = data[PENDING_START_KEY];

    if (pending) {
      await chrome.storage.session.remove(PENDING_START_KEY);
    }

    return pending || null;
  } catch (error) {
    console.warn("Nao foi possivel carregar inicio pendente:", error);
    return null;
  }
};
