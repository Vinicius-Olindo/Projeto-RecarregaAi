// RecarregaAi! 2.3.9

import {
  actionHistoryStatuses,
  formatCountdownTime,
  getPermissionPatternForOrigin,
  getRemainingSeconds,
  getUrlOrigin,
  mediaKinds,
  normalizeMediaKind,
  pauseReasons,
  runtimeMessageTypes,
  storageKeys
} from "./modules/shared.js";
import {
  loadThemePreference,
  watchSystemTheme
} from "./modules/theme.js";
import {
  clearCacheForOrigins,
  reloadTabIgnoringCache
} from "./modules/cache.js";
import {
  loadLanguagePreference,
  normalizeLanguage,
  saveLanguagePreference
} from "./modules/language-dialog.js";
import { loadPageI18n } from "./modules/i18n.js";
import { collectLoadedOrigins } from "./modules/tabs.js";

const popupLanguageStorageKey = "recarregaAiPageLanguage";

const popupElements = {
  activeTimersCount: document.querySelector("#active-timers-count"),
  activeTimersList: document.querySelector("#active-timers-list"),
  activeTimersSection: document.querySelector("#active-timers-section"),
  controlledTabTitle: document.querySelector("#controlled-tab-title"),
  controlledTabUrl: document.querySelector("#controlled-tab-url"),
  customTimerInput: document.querySelector("#custom-timer-input"),
  extensionVersion: document.querySelector("#extension-version"),
  openControlledTabButton: document.querySelector("#open-controlled-tab-button"),
  openOptionsButton: document.querySelector("#open-options-button"),
  pauseTimerButton: document.querySelector("#pause-timer-button"),
  popupCountdown: document.querySelector("#popup-countdown"),
  reloadPageButton: document.querySelector("#reload-page-button"),
  removeTimerButton: document.querySelector("#remove-timer-button"),
  resumeTimerButton: document.querySelector("#resume-timer-button"),
  startTimerButton: document.querySelector("#start-timer-button"),
  statusPanel: document.querySelector(".popup__status"),
  statusMessage: document.querySelector("#status-message"),
  stopTimerButton: document.querySelector("#stop-timer-button"),
  timerOverview: document.querySelector("#timer-overview"),
  timerProtectionDetail: document.querySelector("#timer-protection-detail"),
  timerProtectionStatus: document.querySelector("#timer-protection-status"),
  timerProtectionTitle: document.querySelector("#timer-protection-title"),
  timerIntervalInputs: document.querySelectorAll("[name='timer-interval']")
};

const presetTimerIntervals = [3, 5, 10];

let automaticResumeNoticeUntil = 0;
let currentActiveTab = null;
let lastObservedTimerState = null;
let activePopupLanguage = normalizeLanguage(document.documentElement.lang);

let popupTranslations = {};

const getPopupCopy = (key) => (
  popupTranslations[activePopupLanguage]?.[key]
  || popupTranslations["pt-BR"]?.[key]
  || key
);

const replacePopupTokens = (key, replacements) => (
  Object.entries(replacements).reduce(
    (text, [token, value]) => text.replace(`{${token}}`, value),
    getPopupCopy(key)
  )
);

const setPopupText = (selector, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = getPopupCopy(key);
  }
};

const setPopupTexts = (selector, keys) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    const key = keys[index];

    if (key) {
      element.textContent = getPopupCopy(key);
    }
  });
};

const applyPopupLanguage = () => {
  document.documentElement.lang = activePopupLanguage;

  setPopupText(".popup__subtitle", "subtitle");
  setPopupText(".popup__status .popup__label", "statusLabel");
  setPopupText("#status-message", "readyStatus");
  setPopupText(".timer-overview__copy .popup__label", "currentPageLabel");
  setPopupText("#controlled-tab-title", "refreshOffTitle");
  setPopupText("#controlled-tab-url", "chooseTimeBelow");
  setPopupText(".timer-overview__note", "timerNote");
  setPopupText("#open-controlled-tab-button", "openControlledPage");
  setPopupText("#pause-timer-button", "pauseTimer");
  setPopupText("#resume-timer-button", "resumeTimer");
  setPopupText("#remove-timer-button", "removeTimer");
  setPopupText("#quick-action-title", "manualLabel");
  setPopupText(".popup__primary-action .popup__hint", "manualHint");
  setPopupText("#reload-page-button", "updateNowButton");
  setPopupText(".popup__timer .popup__label", "autoLabel");
  setPopupText("#timer-title", "recurringTitle");
  setPopupText(".popup__timer .popup__badge", "countdownBadge");
  setPopupText(".timer-options legend", "intervalLegend");
  setPopupTexts(".timer-options__label", [
    "minuteShort",
    "minuteShort",
    "minuteShort",
    "customIntervalOption"
  ]);
  setPopupText(".custom-timer__label", "customTimerLabel");
  setPopupText(".custom-timer__suffix", "minuteShort");
  setPopupText("#start-timer-button", "defaultStartButton");
  setPopupText("#stop-timer-button", "stopTimer");
  setPopupText(".active-timers .popup__label", "otherPagesLabel");
  setPopupText("#active-timers-title", "activeTimerTitle");
  setPopupText("#open-options-button", "settings");
};

const loadPopupLanguage = async () => {
  const fallbackLanguage = normalizeLanguage(
    localStorage.getItem(popupLanguageStorageKey)
    || document.documentElement.lang
  );

  try {
    activePopupLanguage = await loadLanguagePreference({
      fallbackLanguage
    });
  } catch (error) {
    console.error("Erro ao carregar idioma do popup:", error);
    activePopupLanguage = fallbackLanguage;
  }

  localStorage.setItem(popupLanguageStorageKey, activePopupLanguage);

  try {
    const { translations } = await loadPageI18n("popup", activePopupLanguage);

    popupTranslations = translations;
  } catch (error) {
    console.error("Erro ao carregar traducoes do popup:", error);
  }

  applyPopupLanguage();

  try {
    await saveLanguagePreference({
      language: activePopupLanguage
    });
  } catch (error) {
    console.error("Erro ao sincronizar idioma do popup:", error);
  }
};

const updateStatusMessage = (message, status = "neutral") => {
  popupElements.statusMessage.textContent = message;
  popupElements.statusPanel.dataset.status = status;
};

const updateButtonState = (button, isLoading, loadingText, defaultText) => {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
  button.classList.toggle("is-loading", isLoading);
};

const loadExtensionVersion = () => {
  const manifest = chrome.runtime.getManifest();

  popupElements.extensionVersion.textContent = manifest.version_name
    || `V.${manifest.version}`;
};

const loadTheme = async () => {
  await loadThemePreference();
  watchSystemTheme();
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

const getActiveTab = async () => {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return activeTab;
};

const requestTimerPermission = async (origin) => (
  chrome.permissions.request({
    origins: [getPermissionPatternForOrigin(origin)]
  })
);

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

const clearCacheAndReloadCurrentPage = async () => {
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

const getSelectedTimerInterval = () => {
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

const formatTimerInterval = (intervalInMinutes) => {
  if (intervalInMinutes === 1) {
    return getPopupCopy("minuteSingular");
  }

  return replacePopupTokens("minutePlural", {
    count: String(intervalInMinutes)
  });
};

const getTimerState = async (activeTabId = null) => (
  sendRuntimeMessage({
    payload: {
      activeTabId
    },
    type: runtimeMessageTypes.getTimerState
  })
);

const getTimerTabLabel = (timerSettings) => (
  timerSettings.tabTitle || timerSettings.mainOrigin || getPopupCopy("timerTabFallback")
);

const formatActiveTimerCount = (count) => {
  if (count === 1) {
    return getPopupCopy("activeCountSingular");
  }

  return replacePopupTokens("activeCountPlural", {
    count: String(count)
  });
};

const mediaPauseCopyKeys = Object.freeze({
  [mediaKinds.audio]: {
    countdownKey: "audioCountdown",
    detailKey: "audioPauseDetail",
    statusKey: "audioPausedStatus",
    titleKey: "audioPauseTitle"
  },
  [mediaKinds.generic]: {
    countdownKey: "mediaCountdown",
    detailKey: "mediaPauseDetail",
    statusKey: "mediaPausedStatus",
    titleKey: "mediaPauseTitle"
  },
  [mediaKinds.image]: {
    countdownKey: "mediaCountdown",
    detailKey: "mediaPauseDetail",
    statusKey: "mediaPausedStatus",
    titleKey: "mediaPauseTitle"
  },
  [mediaKinds.recording]: {
    countdownKey: "recordingCountdown",
    detailKey: "recordingPauseDetail",
    statusKey: "recordingPausedStatus",
    titleKey: "recordingPauseTitle"
  },
  [mediaKinds.video]: {
    countdownKey: "videoCountdown",
    detailKey: "videoPauseDetail",
    statusKey: "videoPausedStatus",
    titleKey: "videoPauseTitle"
  }
});

const getAutomaticPausePresentation = (timerSettings) => {
  if (!timerSettings?.paused) {
    return null;
  }

  if (timerSettings.pauseReason === pauseReasons.typing) {
    return {
      countdownKey: "typingCountdown",
      detailKey: "typingPauseDetail",
      reason: pauseReasons.typing,
      state: "typing",
      statusKey: "typingPausedStatus",
      titleKey: "typingPauseTitle"
    };
  }

  if (timerSettings.pauseReason !== pauseReasons.media) {
    return null;
  }

  const mediaKind = normalizeMediaKind(timerSettings.pauseDetail);
  const safetySeconds = getRemainingSeconds(timerSettings.resumeScheduledAt);

  if (safetySeconds > 0) {
    return {
      countdownText: `${safetySeconds}s`,
      detailKey: "safetyPauseDetail",
      reason: mediaKind,
      replacements: {
        seconds: String(safetySeconds)
      },
      state: "safety",
      statusKey: "safetyPausedStatus",
      statusTone: "success",
      titleKey: "safetyPauseTitle"
    };
  }

  return {
    ...mediaPauseCopyKeys[mediaKind],
    reason: mediaKind,
    state: "media"
  };
};

const getTimerVisualState = (timerSettings) => {
  if (!timerSettings?.enabled) {
    return {
      countdownText: "--:--",
      state: "empty"
    };
  }

  const isPaused = Boolean(timerSettings.paused);
  const automaticPausePresentation = getAutomaticPausePresentation(
    timerSettings
  );
  const remainingSeconds = getRemainingSeconds(timerSettings.nextRunAt);
  const isWarning = !isPaused && remainingSeconds <= 10;
  let countdownText = formatCountdownTime(remainingSeconds);
  let state = "active";

  if (isWarning) {
    state = "warning";
  }

  if (isPaused) {
    state = "paused";
    countdownText = getPopupCopy("pausedCountdown");

    if (automaticPausePresentation) {
      state = automaticPausePresentation.state;
      countdownText = automaticPausePresentation.countdownText
        || getPopupCopy(automaticPausePresentation.countdownKey);
    }
  }

  return {
    countdownText,
    state
  };
};

const updateTimerActionButtons = (timerSettings) => {
  const hasTimer = Boolean(timerSettings?.enabled);
  const isPaused = Boolean(timerSettings?.paused);

  popupElements.openControlledTabButton.hidden = true;
  popupElements.pauseTimerButton.hidden = !hasTimer || isPaused;
  popupElements.removeTimerButton.hidden = !hasTimer;
  popupElements.resumeTimerButton.hidden = !hasTimer || !isPaused;
  popupElements.stopTimerButton.disabled = !hasTimer;
};

const getPausePresentationCopy = (presentation, keyName) => {
  const copyKey = presentation[keyName];

  if (!presentation.replacements) {
    return getPopupCopy(copyKey);
  }

  return replacePopupTokens(copyKey, presentation.replacements);
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

  popupElements.activeTimersList.innerHTML = "";
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

const refreshTimerState = async ({ updateStatus = false } = {}) => {
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

const syncCustomTimerInputState = () => {
  const selectedTimerInput = document.querySelector("[name='timer-interval']:checked");
  const isCustomTimer = selectedTimerInput?.value === "custom";

  popupElements.customTimerInput.disabled = !isCustomTimer;

  if (isCustomTimer) {
    popupElements.customTimerInput.focus();
  }
};

const selectTimerInterval = (intervalInMinutes) => {
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

const loadTimerState = async () => {
  const timerSettings = await refreshTimerState({
    updateStatus: true
  });

  if (timerSettings?.intervalInMinutes) {
    selectTimerInterval(timerSettings.intervalInMinutes);
  }
};

const startTimer = async () => {
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

    const hasPermission = await requestTimerPermission(origin);

    if (!hasPermission) {
      updateStatusMessage(
        getPopupCopy("permissionNeeded"),
        "error"
      );
      return;
    }

    const intervalInMinutes = getSelectedTimerInterval();
    const loadedOrigins = await collectLoadedOrigins(activeTab.id, [origin]);

    await sendRuntimeMessage({
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
    });

    updateStatusMessage(
      replacePopupTokens("startedStatus", {
        interval: formatTimerInterval(intervalInMinutes)
      }),
      "active"
    );
    await refreshTimerState();
  } catch (error) {
    console.error("Erro ao ativar timer:", error);
    updateStatusMessage(
      error.message || getPopupCopy("startError"),
      "error"
    );
  } finally {
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

const stopTimer = async () => {
  try {
    const tabId = await getActiveTabIdForTimerAction();

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
  }
};

const pauseTimer = async () => {
  try {
    const tabId = await getActiveTabIdForTimerAction();

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
  }
};

const resumeTimer = async () => {
  try {
    const tabId = await getActiveTabIdForTimerAction();

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
  }
};

const openControlledTab = async (tabId) => {
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

const openOptionsPage = () => {
  chrome.runtime.openOptionsPage();
};

const handleActiveTimersListClick = (event) => {
  const openButton = event.target.closest("[data-open-timer-tab]");

  if (!openButton || openButton.disabled) {
    return;
  }

  openControlledTab(Number(openButton.dataset.openTimerTab));
};

popupElements.reloadPageButton.addEventListener("click", clearCacheAndReloadCurrentPage);
popupElements.openOptionsButton.addEventListener("click", openOptionsPage);
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

  activePopupLanguage = normalizeLanguage(languageChange.newValue);
  localStorage.setItem(popupLanguageStorageKey, activePopupLanguage);
  applyPopupLanguage();
  refreshTimerState({
    updateStatus: true
  }).catch((error) => {
    console.error("Erro ao atualizar idioma do popup:", error);
  });
});

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
};

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
