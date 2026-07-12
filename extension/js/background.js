// RecarregaAi! 2.3.9

import { appConfig } from "./modules/config.js";
import {
  clearCacheForOrigins,
  reloadTabIgnoringCache
} from "./modules/cache.js";
import {
  actionHistoryStatuses,
  actionHistoryTypes,
  alarmNames,
  defaultAppSettings,
  formatCountdownTime,
  getBadgeColor,
  getBadgeText,
  getNextRunDate,
  getNextRunDateFromSeconds,
  getNextOperatingHoursBoundary,
  getPermissionPatternForOrigin,
  getRemainingSeconds,
  getTabIdFromTimerAlarmName,
  getTimerAlarmName,
  getUrlOrigin,
  isWithinOperatingHours,
  mediaKinds,
  mediaResumeSafetySeconds,
  normalizeOrigins,
  normalizeMediaKind,
  oneSecondInMilliseconds,
  pauseReasons,
  runtimeMessageTypes,
  storageKeys
} from "./modules/shared.js";
import {
  appendActionHistory,
  clearActionHistory,
  getActionHistory
} from "./modules/history.js";
import {
  getAllTimerSettings,
  getAllTimerSettingsFromCollection,
  getAppSettings,
  getBrowserSessionId,
  getGlobalPause,
  getLastTimerRun,
  getStoredTimerCollection,
  getTimerSettingsByTabId,
  getTimerSettingsFromCollection,
  removeTimerSettingsByTabId,
  clearGlobalPause,
  saveGlobalPause,
  saveLastTimerRun,
  updateTimerSettingsByTabId,
  upsertTimerSettings
} from "./modules/storage.js";
import { collectLoadedOrigins } from "./modules/tabs.js";
import { createTimerRestorationPlan } from "./modules/timer-restoration.js";

let badgeCountdownTimerId = null;
let badgeCountdownRestartQueue = Promise.resolve();
let timerMaintenanceQueue = Promise.resolve();
const autoStartTimerTabIds = new Set();
const pendingScrollPositions = new Map();
const scheduledRefreshTabIds = new Set();
const automaticPauseReasons = new Set([
  pauseReasons.media,
  pauseReasons.typing
]);
const mediaBadgeStates = Object.freeze({
  [mediaKinds.audio]: {
    badgeText: "AUD",
    countdownTime: "audio em uso"
  },
  [mediaKinds.generic]: {
    badgeText: "MID",
    countdownTime: "midia ativa"
  },
  [mediaKinds.image]: {
    badgeText: "IMG",
    countdownTime: "imagem em visualizacao"
  },
  [mediaKinds.recording]: {
    badgeText: "REC",
    countdownTime: "gravacao em andamento"
  },
  [mediaKinds.video]: {
    badgeText: "VID",
    countdownTime: "video em uso"
  }
});
const contentScriptMessageTypes = new Set([
  runtimeMessageTypes.mediaState,
  runtimeMessageTypes.typingState
]);
const extensionPageMessageTypes = new Set([
  runtimeMessageTypes.clearActionHistory,
  runtimeMessageTypes.getActionHistory,
  runtimeMessageTypes.getTimerState,
  runtimeMessageTypes.openTimerTab,
  runtimeMessageTypes.pauseAllTimers,
  runtimeMessageTypes.pauseTimer,
  runtimeMessageTypes.recordManualCleanup,
  runtimeMessageTypes.resumeTimer,
  runtimeMessageTypes.resumeAllTimers,
  runtimeMessageTypes.startTimer,
  runtimeMessageTypes.stopTimer
]);
const extensionBaseUrl = chrome.runtime.getURL("");

const queueTimerMaintenance = (maintenanceTask) => {
  const queuedTask = timerMaintenanceQueue
    .catch(() => undefined)
    .then(maintenanceTask);

  timerMaintenanceQueue = queuedTask;

  return queuedTask;
};

const recordHistoryEntry = async (entry) => {
  try {
    return await appendActionHistory(entry);
  } catch (error) {
    console.warn("Nao foi possivel registrar o historico do RecarregaAi:", error);
    return null;
  }
};

const recordTimerHistoryEntry = async (
  timerSettings,
  type,
  {
    detail = null,
    status = actionHistoryStatuses.info
  } = {}
) => recordHistoryEntry({
  detail,
  intervalInMinutes: timerSettings?.intervalInMinutes,
  origin: timerSettings?.mainOrigin,
  source: timerSettings?.source,
  status,
  type
});

const configureUninstallFeedbackPage = async () => {
  try {
    await chrome.runtime.setUninstallURL(appConfig.uninstallFeedbackPageUrl);
  } catch (error) {
    console.warn("Nao foi possivel configurar feedback de desinstalacao:", error);
  }
};

const hasEditableFocusInFrame = () => {
  const editableInputTypes = new Set([
    "email",
    "number",
    "search",
    "tel",
    "text",
    "url"
  ]);
  const activeElement = document.activeElement;

  if (!activeElement) {
    return false;
  }

  if (activeElement.isContentEditable) {
    return true;
  }

  if (activeElement.tagName === "TEXTAREA") {
    return !activeElement.disabled && !activeElement.readOnly;
  }

  if (activeElement.tagName !== "INPUT") {
    return false;
  }

  return !activeElement.disabled
    && !activeElement.readOnly
    && editableInputTypes.has(activeElement.type);
};

const isTabEditingText = async (tabId) => {
  if (typeof tabId !== "number") {
    return false;
  }

  try {
    const frameResults = await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: hasEditableFocusInFrame
    });

    return frameResults.some((frameResult) => Boolean(frameResult.result));
  } catch (error) {
    console.warn("Nao foi possivel verificar digitacao na guia:", error);
    return false;
  }
};

const getActiveMediaKindInFrame = () => {
  const activeMediaElements = Array.from(
    document.querySelectorAll("audio, video")
  ).filter((element) => (
    !element.paused && !element.ended && element.readyState > 0
  ));

  if (activeMediaElements.some((element) => element.tagName === "VIDEO")) {
    return "video";
  }

  return activeMediaElements.length > 0 ? "audio" : null;
};

const getActiveImageKindInFrame = () => {
  if (document.visibilityState !== "visible") {
    return null;
  }

  const imageViewerSelector = [
    "dialog[open]",
    "[aria-modal='true']:not([aria-hidden='true'])",
    "[class*='lightbox' i]",
    "[class*='image-viewer' i]",
    "[class*='photo-viewer' i]",
    "[data-testid*='image-viewer' i]",
    "[data-testid*='lightbox' i]"
  ].join(",");
  const isElementVisible = (element) => {
    if (!(element instanceof Element)) {
      return false;
    }

    const styles = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();

    return styles.display !== "none"
      && styles.visibility !== "hidden"
      && Number(styles.opacity) > 0
      && bounds.bottom > 0
      && bounds.right > 0
      && bounds.top < window.innerHeight
      && bounds.left < window.innerWidth;
  };
  const isLargeVisibleImage = (image) => {
    if (!(image instanceof HTMLImageElement) || !isElementVisible(image)) {
      return false;
    }

    const bounds = image.getBoundingClientRect();
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const visibleWidth = Math.max(
      0,
      Math.min(bounds.right, viewportWidth) - Math.max(bounds.left, 0)
    );
    const visibleHeight = Math.max(
      0,
      Math.min(bounds.bottom, viewportHeight) - Math.max(bounds.top, 0)
    );

    return visibleWidth >= Math.min(220, viewportWidth * 0.35)
      && visibleHeight >= Math.min(160, viewportHeight * 0.25)
      && visibleWidth * visibleHeight >= viewportWidth * viewportHeight * 0.08;
  };
  const hasStandaloneImage = document.contentType
    ?.toLowerCase()
    .startsWith("image/");
  const fullscreenElement = document.fullscreenElement;
  const hasFullscreenImage = Boolean(
    fullscreenElement
    && (
      fullscreenElement instanceof HTMLImageElement
      || fullscreenElement.querySelector("img")
    )
  );
  const hasImageViewer = Array.from(
    document.querySelectorAll(imageViewerSelector)
  ).some((viewer) => (
    isElementVisible(viewer)
    && Array.from(viewer.querySelectorAll("img")).some(isLargeVisibleImage)
  ));
  const hasFixedImageOverlay = Array.from(document.images).some((image) => {
    if (!isLargeVisibleImage(image)) {
      return false;
    }

    let container = image;

    while (container && container !== document.body) {
      if (window.getComputedStyle(container).position === "fixed") {
        const bounds = container.getBoundingClientRect();

        return bounds.width * bounds.height
          >= window.innerWidth * window.innerHeight * 0.35;
      }

      container = container.parentElement;
    }

    return false;
  });

  return hasStandaloneImage
    || hasFullscreenImage
    || hasImageViewer
    || hasFixedImageOverlay
    ? "image"
    : null;
};

const getRecordingMediaKindInFrame = () => (
  window.__recarregaAiMainWorldMediaState?.isRecording ? "recording" : null
);

const getTabMediaActivity = async (tabId) => {
  if (typeof tabId !== "number") {
    return {
      isMediaActive: false,
      mediaKind: null
    };
  }

  let tab;

  try {
    tab = await chrome.tabs.get(tabId);
  } catch (error) {
    console.warn("Nao foi possivel verificar midia ativa na guia:", error);
    return {
      isMediaActive: false,
      mediaKind: null
    };
  }

  try {
    const recordingFrameResults = await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: getRecordingMediaKindInFrame,
      world: "MAIN"
    });

    if (recordingFrameResults.some((frameResult) => (
      frameResult.result === mediaKinds.recording
    ))) {
      return {
        isMediaActive: true,
        mediaKind: mediaKinds.recording
      };
    }
  } catch (error) {
    console.warn("Nao foi possivel verificar gravacao ativa na guia:", error);
  }

  try {
    const frameResults = await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: getActiveMediaKindInFrame
    });
    const activeMediaKinds = frameResults
      .map((frameResult) => frameResult.result)
      .filter(Boolean);

    if (activeMediaKinds.includes(mediaKinds.video)) {
      return {
        isMediaActive: true,
        mediaKind: mediaKinds.video
      };
    }

    if (activeMediaKinds.includes(mediaKinds.audio)) {
      return {
        isMediaActive: true,
        mediaKind: mediaKinds.audio
      };
    }
  } catch (error) {
    console.warn("Nao foi possivel verificar midia ativa na guia:", error);
  }

  try {
    const imageFrameResults = await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: getActiveImageKindInFrame
    });

    if (imageFrameResults.some((frameResult) => (
      frameResult.result === mediaKinds.image
    ))) {
      return {
        isMediaActive: true,
        mediaKind: mediaKinds.image
      };
    }
  } catch (error) {
    console.warn("Nao foi possivel verificar imagem ativa na guia:", error);
  }

  if (tab?.audible) {
    return {
      isMediaActive: true,
      mediaKind: mediaKinds.audio
    };
  }

  return {
    isMediaActive: false,
    mediaKind: null
  };
};

const injectTypingProtection = async (tabId) => {
  if (typeof tabId !== "number") {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      files: ["js/content.js"]
    });
  } catch (error) {
    console.warn("Nao foi possivel ativar protecoes da pagina:", error);
  }

  try {
    await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      files: ["js/page-media-guard.js"],
      world: "MAIN"
    });
  } catch (error) {
    console.warn("Nao foi possivel ativar protecao de midia:", error);
  }
};

const stopBadgeCountdown = () => {
  if (!badgeCountdownTimerId) {
    return;
  }

  clearInterval(badgeCountdownTimerId);
  badgeCountdownTimerId = null;
};

const getBadgeTarget = (timerSettings) => {
  if (typeof timerSettings?.tabId !== "number") {
    return {};
  }

  return {
    tabId: timerSettings.tabId
  };
};

const clearActionBadge = async (timerSettings) => {
  const badgeTarget = getBadgeTarget(timerSettings);

  try {
    await chrome.action.setBadgeText({
      ...badgeTarget,
      text: ""
    });
    await chrome.action.setTitle({
      ...badgeTarget,
      title: "RecarregaAi!"
    });
  } catch (error) {
    console.warn("Nao foi possivel limpar badge do RecarregaAi:", error);
  }
};

const clearGlobalActionBadge = async () => {
  await clearActionBadge();
};

const clearTimerBadge = async (timerSettings) => {
  await clearActionBadge(timerSettings);
};

const clearAllTimerBadges = async (timerSettingsList = []) => {
  stopBadgeCountdown();
  await Promise.all(timerSettingsList.map(clearActionBadge));
  await clearGlobalActionBadge();
};

const updateTimerBadge = async (timerSettings) => {
  if (!timerSettings?.enabled || !timerSettings.nextRunAt) {
    await clearTimerBadge(timerSettings);
    return;
  }

  const badgeTarget = getBadgeTarget(timerSettings);
  const isPaused = Boolean(timerSettings.paused);
  const isPausedGlobally = timerSettings.pauseReason === pauseReasons.global;
  const isPausedByMedia = timerSettings.pauseReason === pauseReasons.media;
  const isPausedBySchedule = timerSettings.pauseReason === pauseReasons.schedule;
  const isPausedByTyping = timerSettings.pauseReason === pauseReasons.typing;
  const remainingSeconds = getRemainingSeconds(timerSettings.nextRunAt);
  let badgeColor = getBadgeColor(timerSettings.nextRunAt);
  let badgeText = getBadgeText(timerSettings.nextRunAt);
  let countdownTime = formatCountdownTime(remainingSeconds);

  if (isPaused) {
    badgeColor = "#667085";
    badgeText = "II";
    countdownTime = "pausado";

    if (isPausedGlobally) {
      badgeColor = "#7c3aed";
      badgeText = "ALL";
      countdownTime = "pausa geral";
    }

    if (isPausedBySchedule) {
      badgeColor = "#475467";
      badgeText = "H";
      countdownTime = "fora do horario";
    }

    if (isPausedByTyping) {
      badgeColor = "#ef7a1f";
      badgeText = "DIG";
      countdownTime = "digitando";
    }

    if (isPausedByMedia) {
      const mediaBadgeState = mediaBadgeStates[
        normalizeMediaKind(timerSettings.pauseDetail)
      ];
      const safetySeconds = getRemainingSeconds(
        timerSettings.resumeScheduledAt
      );

      badgeColor = "#1f7aef";
      badgeText = mediaBadgeState.badgeText;
      countdownTime = mediaBadgeState.countdownTime;

      if (safetySeconds > 0) {
        badgeColor = "#0f9f6e";
        badgeText = `${safetySeconds}s`;
        countdownTime = `retomado em ${safetySeconds}s`;
      }
    }
  }

  try {
    await chrome.action.setBadgeBackgroundColor({
      ...badgeTarget,
      color: badgeColor
    });
    await chrome.action.setBadgeText({
      ...badgeTarget,
      text: badgeText
    });
    await chrome.action.setTitle({
      ...badgeTarget,
      title: isPaused
        ? `RecarregaAi! - timer ${countdownTime}`
        : `RecarregaAi! - proximo reload em ${countdownTime}`
    });
  } catch (error) {
    console.warn("Nao foi possivel atualizar badge do RecarregaAi:", error);
  }
};

const updateAllTimerBadges = async (timerSettingsList) => {
  await Promise.all(timerSettingsList.map(updateTimerBadge));
};

const clearChromeAlarm = async (alarmName) => {
  try {
    return await chrome.alarms.clear(alarmName);
  } catch (error) {
    console.warn(`Nao foi possivel limpar o alarme ${alarmName}:`, error);
    throw error;
  }
};

const createChromeAlarm = async (alarmName, alarmInfo) => {
  try {
    await chrome.alarms.create(alarmName, alarmInfo);

    const createdAlarm = await chrome.alarms.get(alarmName);

    if (!createdAlarm) {
      throw new Error(`Alarme ${alarmName} nao encontrado apos criacao.`);
    }

    return createdAlarm;
  } catch (error) {
    console.error(`Nao foi possivel criar o alarme ${alarmName}:`, error);
    throw error;
  }
};

const clearTimerAlarm = async (tabId) => {
  await clearChromeAlarm(getTimerAlarmName(tabId));
};

const createTimerAlarm = async (
  timerSettings,
  delayInMinutes = timerSettings.intervalInMinutes
) => {
  const alarmName = getTimerAlarmName(timerSettings.tabId);

  await clearChromeAlarm(alarmName);
  await createChromeAlarm(alarmName, {
    delayInMinutes: Math.max(0.5, delayInMinutes),
    periodInMinutes: timerSettings.intervalInMinutes
  });
};

const createBadgeCountdownAlarm = async () => {
  await clearChromeAlarm(alarmNames.badgeCountdown);

  await createChromeAlarm(alarmNames.badgeCountdown, {
    delayInMinutes: 0.5,
    periodInMinutes: 0.5
  });
};

const refreshPausedMediaTimers = async (timerSettingsList) => (
  Promise.all(timerSettingsList.map(async (timerSettings) => {
    if (timerSettings.pauseReason !== pauseReasons.media) {
      return timerSettings;
    }

    const mediaActivity = await getTabMediaActivity(timerSettings.tabId);

    if (mediaActivity.isMediaActive) {
      return pauseTimerForMedia(timerSettings, mediaActivity.mediaKind);
    }

    if (await isTabEditingText(timerSettings.tabId)) {
      return pauseTimerForTyping(timerSettings);
    }

    return resumeTimerWhenMediaSafetyEnds(timerSettings);
  }))
);

const handleBadgeCountdownTick = async () => {
  const timerSettingsList = await getAllTimerSettings();
  const refreshedTimerSettingsList = await refreshPausedMediaTimers(timerSettingsList);

  await updateAllTimerBadges(refreshedTimerSettingsList);
};

const restartBadgeCountdown = async () => {
  stopBadgeCountdown();

  const timerSettingsList = await getAllTimerSettings();

  if (timerSettingsList.length === 0) {
    await clearChromeAlarm(alarmNames.badgeCountdown);
    await clearAllTimerBadges();
    return;
  }

  await createBadgeCountdownAlarm();
  await updateAllTimerBadges(timerSettingsList);

  badgeCountdownTimerId = setInterval(() => {
    handleBadgeCountdownTick().catch((error) => {
      console.error("Erro ao atualizar badges do RecarregaAi:", error);
    });
  }, oneSecondInMilliseconds);
};

const startBadgeCountdown = () => {
  const restartPromise = badgeCountdownRestartQueue
    .catch(() => undefined)
    .then(restartBadgeCountdown);

  badgeCountdownRestartQueue = restartPromise;

  return restartPromise;
};

const startStoredBadgeCountdown = async () => {
  await startBadgeCountdown();
};

const startTimer = async (payload) => {
  const intervalInMinutes = Math.floor(Number(payload.intervalInMinutes));
  const tabId = Number(payload.tabId);

  if (!Number.isFinite(intervalInMinutes) || intervalInMinutes < 1) {
    throw new Error("Intervalo do timer invalido.");
  }

  if (!Number.isInteger(tabId)) {
    throw new Error("Guia invalida para ativar o timer.");
  }

  const origins = normalizeOrigins([
    payload.mainOrigin,
    ...(payload.origins || [])
  ]);

  if (origins.length === 0) {
    throw new Error("Nenhuma origem valida para limpeza de cache.");
  }

  const timerSettings = {
    browserSessionId: await getBrowserSessionId(),
    enabled: true,
    intervalInMinutes,
    lastRunAt: null,
    mainOrigin: origins[0],
    nextRunAt: getNextRunDate(intervalInMinutes),
    origins,
    paused: false,
    pausedAt: null,
    pauseDetail: null,
    pauseReason: null,
    remainingSecondsWhenPaused: null,
    resumeScheduledAt: null,
    source: payload.source || "manual",
    startedAt: new Date().toISOString(),
    tabId,
    tabTitle: payload.tabTitle || null,
    tabUrl: payload.tabUrl || null,
    windowId: payload.windowId
  };

  await upsertTimerSettings(timerSettings);
  await injectTypingProtection(timerSettings.tabId);
  await createTimerAlarm(timerSettings);
  await startBadgeCountdown();
  await recordTimerHistoryEntry(
    timerSettings,
    actionHistoryTypes.timerStarted,
    {
      detail: timerSettings.source,
      status: actionHistoryStatuses.success
    }
  );

  return applyTimerConstraints(timerSettings);
};

const pauseTimer = async (tabId) => {
  const timerSettings = await getTimerSettingsByTabId(tabId);

  if (!timerSettings?.enabled) {
    throw new Error("Nenhum timer ativo para pausar nesta guia.");
  }

  if (timerSettings.paused) {
    await updateTimerBadge(timerSettings);
    return timerSettings;
  }

  const pausedTimerSettings = {
    ...timerSettings,
    paused: true,
    pausedAt: new Date().toISOString(),
    pauseDetail: null,
    pauseReason: pauseReasons.manual,
    remainingSecondsWhenPaused: getRemainingSeconds(timerSettings.nextRunAt),
    resumeScheduledAt: null
  };

  await upsertTimerSettings(pausedTimerSettings);
  await clearTimerAlarm(tabId);
  await updateTimerBadge(pausedTimerSettings);
  await recordTimerHistoryEntry(
    pausedTimerSettings,
    actionHistoryTypes.timerPaused,
    {
      detail: pauseReasons.manual,
      status: actionHistoryStatuses.warning
    }
  );

  return pausedTimerSettings;
};

const pauseTimerForAutomaticReason = async (
  timerSettings,
  pauseReason,
  pauseDetail = null
) => {
  if (!timerSettings?.enabled) {
    return timerSettings;
  }

  const normalizedPauseDetail = pauseReason === pauseReasons.media
    ? normalizeMediaKind(pauseDetail)
    : null;

  if (timerSettings.paused) {
    if (
      automaticPauseReasons.has(timerSettings.pauseReason)
      && (
        timerSettings.pauseReason !== pauseReason
        || timerSettings.pauseDetail !== normalizedPauseDetail
        || Boolean(timerSettings.resumeScheduledAt)
      )
    ) {
      const pausedTimerSettings = {
        ...timerSettings,
        pauseDetail: normalizedPauseDetail,
        pauseReason,
        pausedAt: new Date().toISOString(),
        resumeScheduledAt: null
      };

      await upsertTimerSettings(pausedTimerSettings);
      await clearTimerAlarm(timerSettings.tabId);
      await updateTimerBadge(pausedTimerSettings);
      await recordTimerHistoryEntry(
        pausedTimerSettings,
        actionHistoryTypes.timerPaused,
        {
          detail: pauseReason,
          status: actionHistoryStatuses.warning
        }
      );

      return pausedTimerSettings;
    }

    await updateTimerBadge(timerSettings);

    return timerSettings;
  }

  const pausedTimerSettings = {
    ...timerSettings,
    paused: true,
    pausedAt: new Date().toISOString(),
    pauseDetail: normalizedPauseDetail,
    pauseReason,
    remainingSecondsWhenPaused: Math.max(
      1,
      getRemainingSeconds(timerSettings.nextRunAt)
    ),
    resumeScheduledAt: null
  };

  await upsertTimerSettings(pausedTimerSettings);
  await clearTimerAlarm(timerSettings.tabId);
  await updateTimerBadge(pausedTimerSettings);
  await recordTimerHistoryEntry(
    pausedTimerSettings,
    actionHistoryTypes.timerPaused,
    {
      detail: pauseReason,
      status: actionHistoryStatuses.warning
    }
  );

  return pausedTimerSettings;
};

const pauseTimerForTyping = async (timerSettings) => (
  pauseTimerForAutomaticReason(timerSettings, pauseReasons.typing)
);

const pauseTimerForMedia = async (timerSettings, mediaKind) => (
  pauseTimerForAutomaticReason(timerSettings, pauseReasons.media, mediaKind)
);

const getActiveGlobalPause = async () => {
  const globalPause = await getGlobalPause();

  if (!globalPause) {
    return null;
  }

  if (new Date(globalPause.endsAt).getTime() <= Date.now()) {
    await clearGlobalPause();
    await clearChromeAlarm(alarmNames.globalPause);
    return null;
  }

  return globalPause;
};

const pauseTimerForSystemReason = async (timerSettings, pauseReason) => {
  if (!timerSettings?.enabled || timerSettings.paused) {
    return timerSettings;
  }

  const pausedTimerSettings = {
    ...timerSettings,
    paused: true,
    pausedAt: new Date().toISOString(),
    pauseDetail: null,
    pauseReason,
    remainingSecondsWhenPaused: Math.max(
      1,
      getRemainingSeconds(timerSettings.nextRunAt)
    ),
    resumeScheduledAt: null
  };

  await upsertTimerSettings(pausedTimerSettings);
  await clearTimerAlarm(timerSettings.tabId);
  await updateTimerBadge(pausedTimerSettings);
  await recordTimerHistoryEntry(
    pausedTimerSettings,
    actionHistoryTypes.timerPaused,
    {
      detail: pauseReason,
      status: actionHistoryStatuses.warning
    }
  );

  return pausedTimerSettings;
};

const applyTimerConstraints = async (timerSettings) => {
  if (!timerSettings?.enabled) {
    return timerSettings;
  }

  if (await getActiveGlobalPause()) {
    return pauseTimerForSystemReason(timerSettings, pauseReasons.global);
  }

  if (timerSettings.source !== "auto") {
    return timerSettings;
  }

  const appSettings = await getAppSettings();

  if (!isWithinOperatingHours(appSettings.operatingHours)) {
    return pauseTimerForSystemReason(timerSettings, pauseReasons.schedule);
  }

  return timerSettings;
};

const scheduleTimerResumeAfterMedia = async (timerSettings) => {
  if (
    !timerSettings?.enabled
    || !timerSettings.paused
    || timerSettings.pauseReason !== pauseReasons.media
    || timerSettings.resumeScheduledAt
  ) {
    return timerSettings;
  }

  const scheduledTimerSettings = {
    ...timerSettings,
    resumeScheduledAt: getNextRunDateFromSeconds(mediaResumeSafetySeconds)
  };

  await upsertTimerSettings(scheduledTimerSettings);
  await updateTimerBadge(scheduledTimerSettings);

  return scheduledTimerSettings;
};

const resumeTimerWhenMediaSafetyEnds = async (timerSettings) => {
  const scheduledTimerSettings = await scheduleTimerResumeAfterMedia(
    timerSettings
  );

  if (getRemainingSeconds(scheduledTimerSettings.resumeScheduledAt) > 0) {
    return scheduledTimerSettings;
  }

  return resumeTimer(timerSettings.tabId, {
    expectedPauseReason: pauseReasons.media
  });
};

const pauseTimerForNavigation = async (timerSettings, tab) => {
  const pausedTimerSettings = {
    ...timerSettings,
    lastError: "Timer pausado porque a aba saiu do dominio original.",
    paused: true,
    pausedAt: new Date().toISOString(),
    pauseDetail: null,
    pauseReason: pauseReasons.navigation,
    remainingSecondsWhenPaused: Math.max(
      1,
      getRemainingSeconds(timerSettings.nextRunAt)
    ),
    resumeScheduledAt: null,
    tabTitle: tab.title || timerSettings.tabTitle,
    tabUrl: tab.url || timerSettings.tabUrl,
    windowId: tab.windowId
  };

  await upsertTimerSettings(pausedTimerSettings);
  await clearTimerAlarm(timerSettings.tabId);
  await updateTimerBadge(pausedTimerSettings);
  await recordTimerHistoryEntry(
    pausedTimerSettings,
    actionHistoryTypes.timerPaused,
    {
      detail: pauseReasons.navigation,
      status: actionHistoryStatuses.warning
    }
  );

  return pausedTimerSettings;
};

const resumeTimer = async (tabId, { expectedPauseReason = null } = {}) => {
  const timerSettings = await getTimerSettingsByTabId(tabId);

  if (!timerSettings?.enabled) {
    throw new Error("Nenhum timer pausado para retomar nesta guia.");
  }

  if (
    expectedPauseReason
    && timerSettings.pauseReason !== expectedPauseReason
  ) {
    return timerSettings;
  }

  if (!timerSettings.paused) {
    await startBadgeCountdown();
    return timerSettings;
  }

  const remainingSeconds = Math.max(
    1,
    Number(timerSettings.remainingSecondsWhenPaused) || 1
  );
  const resumedTimerSettings = {
    ...timerSettings,
    nextRunAt: getNextRunDateFromSeconds(remainingSeconds),
    paused: false,
    pausedAt: null,
    pauseDetail: null,
    pauseReason: null,
    remainingSecondsWhenPaused: null,
    resumeScheduledAt: null,
    resumedAt: new Date().toISOString()
  };

  await upsertTimerSettings(resumedTimerSettings);
  await injectTypingProtection(resumedTimerSettings.tabId);
  await createTimerAlarm(resumedTimerSettings, remainingSeconds / 60);
  await startBadgeCountdown();
  await recordTimerHistoryEntry(
    resumedTimerSettings,
    actionHistoryTypes.timerResumed,
    {
      detail: timerSettings.pauseReason,
      status: actionHistoryStatuses.success
    }
  );

  return resumedTimerSettings;
};

const resumeSystemPausedTimer = async (timerSettings, pauseReason) => {
  let resumedTimerSettings = await resumeTimer(timerSettings.tabId, {
    expectedPauseReason: pauseReason
  });

  resumedTimerSettings = await applyTimerConstraints(resumedTimerSettings);

  if (resumedTimerSettings.paused) {
    return resumedTimerSettings;
  }

  if (await isTabEditingText(resumedTimerSettings.tabId)) {
    return pauseTimerForTyping(resumedTimerSettings);
  }

  const mediaActivity = await getTabMediaActivity(resumedTimerSettings.tabId);

  if (mediaActivity.isMediaActive) {
    return pauseTimerForMedia(
      resumedTimerSettings,
      mediaActivity.mediaKind
    );
  }

  return resumedTimerSettings;
};

const createGlobalPauseAlarm = async (globalPause) => {
  await clearChromeAlarm(alarmNames.globalPause);
  await createChromeAlarm(alarmNames.globalPause, {
    when: new Date(globalPause.endsAt).getTime()
  });
};

const pauseAllTimers = async (durationInMinutes) => {
  const normalizedDuration = Math.floor(Number(durationInMinutes));

  if (
    !Number.isFinite(normalizedDuration)
    || normalizedDuration < 1
    || normalizedDuration > 24 * 60
  ) {
    throw new Error("Duracao invalida para pausar os timers.");
  }

  const globalPause = {
    endsAt: new Date(
      Date.now() + normalizedDuration * 60 * 1000
    ).toISOString(),
    startedAt: new Date().toISOString()
  };

  await saveGlobalPause(globalPause);
  await createGlobalPauseAlarm(globalPause);

  const timerSettingsList = await getAllTimerSettings();

  await Promise.all(timerSettingsList.map((timerSettings) => (
    pauseTimerForSystemReason(timerSettings, pauseReasons.global)
  )));
  await startBadgeCountdown();

  return globalPause;
};

const resumeAllTimers = async () => {
  await clearGlobalPause();
  await clearChromeAlarm(alarmNames.globalPause);

  const timerSettingsList = await getAllTimerSettings();
  const globallyPausedTimers = timerSettingsList.filter((timerSettings) => (
    timerSettings.pauseReason === pauseReasons.global
  ));

  await Promise.all(globallyPausedTimers.map((timerSettings) => (
    resumeSystemPausedTimer(timerSettings, pauseReasons.global)
  )));
  await startBadgeCountdown();

  return getAllTimerSettings();
};

const scheduleOperatingHoursBoundary = async (operatingHours) => {
  await clearChromeAlarm(alarmNames.operatingHoursBoundary);

  const nextBoundary = getNextOperatingHoursBoundary(operatingHours);

  if (!nextBoundary) {
    return null;
  }

  return createChromeAlarm(alarmNames.operatingHoursBoundary, {
    when: nextBoundary.getTime()
  });
};

const syncOperatingHoursState = async () => {
  const appSettings = await getAppSettings();
  const operatingHours = appSettings.operatingHours;
  const isOperating = isWithinOperatingHours(operatingHours);
  const timerSettingsList = await getAllTimerSettings();
  const automaticTimers = timerSettingsList.filter((timerSettings) => (
    timerSettings.source === "auto"
  ));

  for (const timerSettings of automaticTimers) {
    if (!isOperating) {
      await pauseTimerForSystemReason(timerSettings, pauseReasons.schedule);
      continue;
    }

    if (timerSettings.pauseReason === pauseReasons.schedule) {
      await resumeSystemPausedTimer(timerSettings, pauseReasons.schedule);
    }
  }

  await scheduleOperatingHoursBoundary(operatingHours);
  await startBadgeCountdown();
};

const restoreGlobalPause = async () => {
  const globalPause = await getGlobalPause();

  if (
    globalPause
    && new Date(globalPause.endsAt).getTime() > Date.now()
  ) {
    await createGlobalPauseAlarm(globalPause);
    const timerSettingsList = await getAllTimerSettings();

    await Promise.all(timerSettingsList.map((timerSettings) => (
      pauseTimerForSystemReason(timerSettings, pauseReasons.global)
    )));
    return;
  }

  await resumeAllTimers();
};

const stopTimer = async (tabId) => {
  const timerSettings = await getTimerSettingsByTabId(tabId);

  if (!timerSettings) {
    return null;
  }

  const timerCollection = await removeTimerSettingsByTabId(tabId);
  const timerSettingsList = getAllTimerSettingsFromCollection(timerCollection);

  await clearTimerAlarm(tabId);
  await clearTimerBadge(timerSettings);
  await recordTimerHistoryEntry(
    timerSettings,
    actionHistoryTypes.timerStopped,
    {
      status: actionHistoryStatuses.info
    }
  );

  if (timerSettingsList.length === 0) {
    await clearChromeAlarm(alarmNames.badgeCountdown);
    await clearAllTimerBadges();
    return timerSettings;
  }

  await startBadgeCountdown();

  return timerSettings;
};

const openTimerTab = async (tabId) => {
  const timerSettings = await getTimerSettingsByTabId(tabId);

  if (!timerSettings?.enabled || typeof timerSettings.tabId !== "number") {
    throw new Error("Nenhuma guia monitorada para abrir.");
  }

  if (typeof timerSettings.windowId === "number") {
    await chrome.windows.update(timerSettings.windowId, {
      focused: true
    });
  }

  await chrome.tabs.update(timerSettings.tabId, {
    active: true
  });

  return timerSettings;
};

const getMatchingAutoStartSite = (tabUrl, appSettings) => {
  const tabOrigin = getUrlOrigin(tabUrl);

  if (!tabOrigin) {
    return null;
  }

  return appSettings.autoStartSites.find((site) => (
    site.enabled !== false && site.origin === tabOrigin
  )) || null;
};

const hasAutoStartPermission = async (origin) => (
  chrome.permissions.contains({
    origins: [getPermissionPatternForOrigin(origin)]
  })
);

const runAutoStartTimerForTab = async (tabId, tab) => {
  if (!tab?.url) {
    return;
  }

  const appSettings = await getAppSettings();
  const matchingSite = getMatchingAutoStartSite(tab.url, appSettings);

  if (!matchingSite) {
    return;
  }

  const existingTimerSettings = await getTimerSettingsByTabId(tabId);

  if (existingTimerSettings?.enabled) {
    return;
  }

  const mainOrigin = getUrlOrigin(tab.url);
  const hasPermission = await hasAutoStartPermission(mainOrigin);

  if (!hasPermission) {
    return;
  }

  const intervalInMinutes = matchingSite.intervalInMinutes
    || appSettings.defaultIntervalInMinutes
    || defaultAppSettings.defaultIntervalInMinutes;
  const origins = await collectLoadedOrigins(tabId, [mainOrigin]);

  await startTimer({
    intervalInMinutes,
    mainOrigin,
    origins,
    source: "auto",
    tabId,
    tabTitle: tab.title,
    tabUrl: tab.url,
    windowId: tab.windowId
  });
};

const autoStartTimerForTab = async (tabId, tab) => {
  if (autoStartTimerTabIds.has(tabId)) {
    return;
  }

  autoStartTimerTabIds.add(tabId);

  try {
    await runAutoStartTimerForTab(tabId, tab);
  } finally {
    autoStartTimerTabIds.delete(tabId);
  }
};

const updateTimerAfterTabLoad = async (tabId, tab, timerSettings) => {
  const tabOrigin = getUrlOrigin(tab.url);

  if (tabOrigin && tabOrigin !== timerSettings.mainOrigin) {
    return pauseTimerForNavigation(timerSettings, tab);
  }

  return updateTimerSettingsByTabId(tabId, (timerSettings) => ({
    ...timerSettings,
    mainOrigin: timerSettings.mainOrigin,
    origins: normalizeOrigins([timerSettings.mainOrigin]),
    tabTitle: tab.title || timerSettings.tabTitle,
    tabUrl: tab.url || timerSettings.tabUrl,
    windowId: tab.windowId
  }));
};

const handleCompletedTabUpdate = async (tabId, tab) => {
  const timerSettings = await getTimerSettingsByTabId(tabId);

  if (timerSettings?.enabled) {
    const updatedTimerSettings = await updateTimerAfterTabLoad(
      tabId,
      tab,
      timerSettings
    );

    if (updatedTimerSettings?.pauseReason !== pauseReasons.navigation) {
      await injectTypingProtection(tabId);
    }

    await startBadgeCountdown();
    return;
  }

  await autoStartTimerForTab(tabId, tab);
};

const saveTimerRunResult = async (timerSettings, result) => {
  const latestTimerSettings = await getTimerSettingsByTabId(timerSettings.tabId);

  if (!latestTimerSettings?.enabled) {
    return null;
  }

  const updatedTimerSettings = {
    ...latestTimerSettings,
    lastError: result.error || null,
    lastRunAt: result.finishedAt,
    lastRunStatus: result.status,
    nextRunAt: latestTimerSettings.paused
      ? latestTimerSettings.nextRunAt
      : getNextRunDate(latestTimerSettings.intervalInMinutes),
    origins: result.origins || latestTimerSettings.origins
  };

  await saveLastTimerRun(result);
  await upsertTimerSettings(updatedTimerSettings);
  await recordTimerHistoryEntry(
    updatedTimerSettings,
    actionHistoryTypes.automaticRefresh,
    {
      detail: result.error || null,
      status: result.status === "success"
        ? actionHistoryStatuses.success
        : actionHistoryStatuses.error
    }
  );

  if (!updatedTimerSettings.paused) {
    await createTimerAlarm(updatedTimerSettings);
  }

  await startBadgeCountdown();

  return updatedTimerSettings;
};

const captureTabScrollPosition = async (tabId) => {
  try {
    const [frameResult] = await chrome.scripting.executeScript({
      target: {
        tabId
      },
      func: () => ({
        x: window.scrollX,
        y: window.scrollY
      })
    });

    const x = Number(frameResult?.result?.x);
    const y = Number(frameResult?.result?.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return {
      x: Math.max(0, x),
      y: Math.max(0, y)
    };
  } catch (error) {
    console.warn("Nao foi possivel guardar a posicao da pagina:", error);
    return null;
  }
};

const restorePendingScrollPosition = async (tabId) => {
  const scrollPosition = pendingScrollPositions.get(tabId);

  if (!scrollPosition) {
    return;
  }

  pendingScrollPositions.delete(tabId);

  for (const delay of [0, 250, 750]) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      await chrome.scripting.executeScript({
        target: {
          tabId
        },
        args: [scrollPosition],
        func: (position) => {
          window.scrollTo(position.x, position.y);
        }
      });
    } catch (error) {
      console.warn("Nao foi possivel restaurar a posicao da pagina:", error);
      return;
    }
  }
};

const clearCacheAndReloadTab = async (
  timerSettings,
  preserveScrollPosition = false
) => {
  const tab = await chrome.tabs.get(timerSettings.tabId);
  const tabOrigin = getUrlOrigin(tab.url);

  if (!tabOrigin || tabOrigin !== timerSettings.mainOrigin) {
    await pauseTimerForNavigation(timerSettings, tab);
    throw new Error("Timer pausado porque a aba saiu do dominio original.");
  }

  const fallbackOrigins = normalizeOrigins([
    timerSettings.mainOrigin,
    tabOrigin,
    ...(timerSettings.origins || [])
  ]);
  const origins = await collectLoadedOrigins(timerSettings.tabId, fallbackOrigins);

  if (origins.length === 0) {
    throw new Error("Nenhuma origem valida para limpeza de cache.");
  }

  if (preserveScrollPosition) {
    const scrollPosition = await captureTabScrollPosition(timerSettings.tabId);

    if (scrollPosition) {
      pendingScrollPositions.set(timerSettings.tabId, scrollPosition);
    }
  }

  await clearCacheForOrigins(origins);

  try {
    await reloadTabIgnoringCache(timerSettings.tabId);
  } catch (error) {
    pendingScrollPositions.delete(timerSettings.tabId);
    throw error;
  }

  return origins;
};

const runScheduledRefresh = async (tabId) => {
  if (scheduledRefreshTabIds.has(tabId)) {
    return;
  }

  scheduledRefreshTabIds.add(tabId);
  let timerSettings;

  try {
    timerSettings = await getTimerSettingsByTabId(tabId);

    if (!timerSettings?.enabled || timerSettings.paused) {
      return;
    }

    if (
      !timerSettings.nextRunAt
      || getRemainingSeconds(timerSettings.nextRunAt) > 0
    ) {
      await updateTimerBadge(timerSettings);
      return;
    }

    if (await isTabEditingText(timerSettings.tabId)) {
      await pauseTimerForTyping(timerSettings);
      return;
    }

    const mediaActivity = await getTabMediaActivity(timerSettings.tabId);

    if (mediaActivity.isMediaActive) {
      await pauseTimerForMedia(timerSettings, mediaActivity.mediaKind);
      return;
    }

    try {
      const appSettings = await getAppSettings();
      const origins = await clearCacheAndReloadTab(
        timerSettings,
        appSettings.preserveScrollPosition
      );

      await saveTimerRunResult(timerSettings, {
        error: null,
        finishedAt: new Date().toISOString(),
        origins,
        status: "success",
        tabId: timerSettings.tabId
      });
    } catch (error) {
      console.error("Erro no timer do RecarregaAi:", error);

      await saveTimerRunResult(timerSettings, {
        error: error.message,
        finishedAt: new Date().toISOString(),
        origins: timerSettings.origins,
        status: "error",
        tabId: timerSettings.tabId
      });
    }
  } finally {
    scheduledRefreshTabIds.delete(tabId);
  }
};

const restoreTimerAlarms = async () => {
  await clearChromeAlarm(alarmNames.legacyTimer);

  const timerCollection = await getStoredTimerCollection();
  const timerSettingsList = getAllTimerSettingsFromCollection(timerCollection);

  if (timerSettingsList.length === 0) {
    await clearChromeAlarm(alarmNames.badgeCountdown);
    await clearAllTimerBadges();
    return;
  }

  const [browserSessionId, openTabs] = await Promise.all([
    getBrowserSessionId(),
    chrome.tabs.query({})
  ]);
  const restorationPlan = createTimerRestorationPlan({
    browserSessionId,
    openTabs,
    timerSettingsList
  });

  for (const timerSettings of restorationPlan.stale) {
    await removeTimerSettingsByTabId(timerSettings.tabId);
    await clearTimerAlarm(timerSettings.tabId);
    await clearTimerBadge(timerSettings);
  }

  for (const { tab, timerSettings } of restorationPlan.navigationPaused) {
    const restoredTimerSettings = {
      ...timerSettings,
      browserSessionId,
      tabId: tab.id,
      tabTitle: tab.title || timerSettings.tabTitle,
      tabUrl: tab.url || timerSettings.tabUrl,
      windowId: tab.windowId
    };

    await pauseTimerForNavigation(restoredTimerSettings, tab);
  }

  for (const {
    isRebound,
    tab,
    timerSettings
  } of restorationPlan.active) {
    if (isRebound && tab.id !== timerSettings.tabId) {
      await removeTimerSettingsByTabId(timerSettings.tabId);
      await clearTimerAlarm(timerSettings.tabId);
      await clearTimerBadge(timerSettings);
    }

    const restoredTimerSettings = {
      ...timerSettings,
      browserSessionId,
      tabId: tab.id,
      tabTitle: tab.title || timerSettings.tabTitle,
      tabUrl: tab.url || timerSettings.tabUrl,
      windowId: tab.windowId
    };

    await upsertTimerSettings(restoredTimerSettings);
    await injectTypingProtection(restoredTimerSettings.tabId);

    if (restoredTimerSettings.paused) {
      await clearTimerAlarm(restoredTimerSettings.tabId);
      await updateTimerBadge(restoredTimerSettings);
      continue;
    }

    const remainingSeconds = getRemainingSeconds(
      restoredTimerSettings.nextRunAt
    );

    if (remainingSeconds === 0) {
      await runScheduledRefresh(restoredTimerSettings.tabId);
      continue;
    }

    await createTimerAlarm(
      restoredTimerSettings,
      remainingSeconds / 60
    );
  }

  await startBadgeCountdown();
};

const ensureRuntimeTimerAlarms = async () => {
  const timerSettingsList = await getAllTimerSettings();
  const browserSessionId = await getBrowserSessionId();
  const requiresSessionRestoration = browserSessionId
    && timerSettingsList.some((timerSettings) => (
      timerSettings.browserSessionId !== browserSessionId
    ));

  if (requiresSessionRestoration) {
    await restoreTimerAlarms();
    return;
  }

  for (const timerSettings of timerSettingsList) {
    if (!timerSettings.enabled || timerSettings.paused) {
      continue;
    }

    const alarmName = getTimerAlarmName(timerSettings.tabId);
    const alarm = await chrome.alarms.get(alarmName);

    if (alarm) {
      continue;
    }

    const remainingSeconds = getRemainingSeconds(timerSettings.nextRunAt);

    if (remainingSeconds === 0) {
      await runScheduledRefresh(timerSettings.tabId);
      continue;
    }

    await createTimerAlarm(timerSettings, remainingSeconds / 60);
  }

  if (timerSettingsList.length > 0) {
    await startBadgeCountdown();
  }
};

const resumeTimerAfterTyping = async (tabId) => {
  if (await isTabEditingText(tabId)) {
    return getTimerSettingsByTabId(tabId);
  }

  const mediaActivity = await getTabMediaActivity(tabId);

  if (mediaActivity.isMediaActive) {
    return pauseTimerForMedia(
      await getTimerSettingsByTabId(tabId),
      mediaActivity.mediaKind
    );
  }

  return resumeTimer(tabId, {
    expectedPauseReason: pauseReasons.typing
  });
};

const resumeTimerAfterMedia = async (tabId) => {
  const mediaActivity = await getTabMediaActivity(tabId);

  if (mediaActivity.isMediaActive) {
    return pauseTimerForMedia(
      await getTimerSettingsByTabId(tabId),
      mediaActivity.mediaKind
    );
  }

  if (await isTabEditingText(tabId)) {
    return pauseTimerForTyping(await getTimerSettingsByTabId(tabId));
  }

  return resumeTimerWhenMediaSafetyEnds(
    await getTimerSettingsByTabId(tabId)
  );
};

const handleTypingState = async (payload, tabId) => {
  if (typeof tabId !== "number") {
    return null;
  }

  const timerSettings = await getTimerSettingsByTabId(tabId);

  if (!timerSettings?.enabled) {
    return timerSettings;
  }

  if (payload?.isTyping) {
    return pauseTimerForTyping(timerSettings);
  }

  if (timerSettings.pauseReason === pauseReasons.typing) {
    return resumeTimerAfterTyping(tabId);
  }

  return timerSettings;
};

const handleMediaState = async (payload, tabId) => {
  if (typeof tabId !== "number") {
    return null;
  }

  const timerSettings = await getTimerSettingsByTabId(tabId);

  if (!timerSettings?.enabled) {
    return timerSettings;
  }

  if (payload?.isMediaActive) {
    return pauseTimerForMedia(timerSettings, payload.mediaKind);
  }

  if (timerSettings.pauseReason === pauseReasons.media) {
    return resumeTimerAfterMedia(tabId);
  }

  return timerSettings;
};

const getTimerStateResponse = async (activeTabId) => {
  const timerCollection = await getStoredTimerCollection();
  const activeTimers = getAllTimerSettingsFromCollection(timerCollection);
  const timerSettings = getTimerSettingsFromCollection(
    timerCollection,
    activeTabId
  );

  return {
    activeTimerCount: activeTimers.length,
    activeTimers,
    appSettings: await getAppSettings(),
    globalPause: await getActiveGlobalPause(),
    lastTimerRun: await getLastTimerRun(),
    ok: true,
    timerSettings
  };
};

const getMessageTabId = (message, sender) => {
  const senderTabId = Number(sender?.tab?.id);

  if (Number.isInteger(senderTabId)) {
    return senderTabId;
  }

  const payloadTabId = Number(message?.payload?.tabId);

  if (Number.isInteger(payloadTabId)) {
    return payloadTabId;
  }

  return sender?.tab?.id;
};

const isOwnExtensionSender = (sender) => (
  sender?.id === chrome.runtime.id
);

const isExtensionPageSender = (sender) => (
  isOwnExtensionSender(sender)
  && typeof sender.url === "string"
  && sender.url.startsWith(extensionBaseUrl)
);

const isContentScriptSender = (sender) => (
  isOwnExtensionSender(sender)
  && Number.isInteger(sender?.tab?.id)
  && !isExtensionPageSender(sender)
);

const validateRuntimeMessageSender = (message, sender) => {
  if (contentScriptMessageTypes.has(message?.type)) {
    if (!isContentScriptSender(sender)) {
      throw new Error("Mensagem de pagina com remetente invalido.");
    }

    return;
  }

  if (extensionPageMessageTypes.has(message?.type)) {
    if (!isExtensionPageSender(sender)) {
      throw new Error("Acao privilegiada com remetente invalido.");
    }

    return;
  }

  throw new Error("Mensagem desconhecida.");
};

const validateTimerStartPayload = async (payload) => {
  const tabId = Number(payload?.tabId);

  if (!Number.isInteger(tabId)) {
    throw new Error("Guia invalida para ativar o timer.");
  }

  const tab = await chrome.tabs.get(tabId);
  const tabOrigin = getUrlOrigin(tab.url);
  const requestedOrigin = getUrlOrigin(payload?.mainOrigin);

  if (!tabOrigin || tabOrigin !== requestedOrigin) {
    throw new Error("A origem solicitada nao pertence a guia informada.");
  }

  const hasPermission = await chrome.permissions.contains({
    origins: [getPermissionPatternForOrigin(tabOrigin)]
  });

  if (!hasPermission) {
    throw new Error("Permissao ausente para iniciar o timer nesta guia.");
  }

  return {
    ...payload,
    mainOrigin: tabOrigin,
    tabId,
    tabTitle: tab.title || null,
    tabUrl: tab.url,
    windowId: tab.windowId
  };
};

const createTimerSettingsResponse = (timerSettings) => ({
  ok: true,
  timerSettings
});

const runtimeMessageHandlers = {
  [runtimeMessageTypes.clearActionHistory]: async () => {
    await clearActionHistory();

    return {
      entries: [],
      ok: true
    };
  },
  [runtimeMessageTypes.getActionHistory]: async () => ({
    entries: await getActionHistory(),
    ok: true
  }),
  [runtimeMessageTypes.getTimerState]: async (message) => {
    const activeTabId = Number(message?.payload?.activeTabId);

    return getTimerStateResponse(
      Number.isInteger(activeTabId) ? activeTabId : null
    );
  },
  [runtimeMessageTypes.mediaState]: async (message, sender) => {
    const timerSettings = await handleMediaState(
      message.payload,
      sender.tab?.id
    );

    return createTimerSettingsResponse(timerSettings);
  },
  [runtimeMessageTypes.openTimerTab]: async (message, sender) => {
    const timerSettings = await openTimerTab(getMessageTabId(message, sender));

    return createTimerSettingsResponse(timerSettings);
  },
  [runtimeMessageTypes.pauseAllTimers]: async (message) => ({
    globalPause: await pauseAllTimers(message.payload?.durationInMinutes),
    ok: true
  }),
  [runtimeMessageTypes.recordManualCleanup]: async (message) => {
    const isError = message.payload?.status === actionHistoryStatuses.error;
    const historyEntry = await recordHistoryEntry({
      detail: isError ? message.payload?.detail : null,
      origin: message.payload?.origin,
      status: isError
        ? actionHistoryStatuses.error
        : actionHistoryStatuses.success,
      type: actionHistoryTypes.manualCleanup
    });

    return {
      historyEntry,
      ok: true
    };
  },
  [runtimeMessageTypes.pauseTimer]: async (message, sender) => {
    const timerSettings = await pauseTimer(getMessageTabId(message, sender));

    return createTimerSettingsResponse(timerSettings);
  },
  [runtimeMessageTypes.resumeTimer]: async (message, sender) => {
    const timerSettings = await resumeTimer(getMessageTabId(message, sender));

    return createTimerSettingsResponse(timerSettings);
  },
  [runtimeMessageTypes.resumeAllTimers]: async () => ({
    activeTimers: await resumeAllTimers(),
    globalPause: null,
    ok: true
  }),
  [runtimeMessageTypes.startTimer]: async (message) => {
    const timerSettings = await startTimer(
      await validateTimerStartPayload(message.payload)
    );

    return createTimerSettingsResponse(timerSettings);
  },
  [runtimeMessageTypes.stopTimer]: async (message, sender) => {
    await stopTimer(getMessageTabId(message, sender));

    return {
      ok: true
    };
  },
  [runtimeMessageTypes.typingState]: async (message, sender) => {
    const timerSettings = await handleTypingState(
      message.payload,
      sender.tab?.id
    );

    return createTimerSettingsResponse(timerSettings);
  }
};

const handleRuntimeMessage = async (message, sender = {}) => {
  validateRuntimeMessageSender(message, sender);

  const messageHandler = runtimeMessageHandlers[message?.type];

  if (messageHandler) {
    return messageHandler(message, sender);
  }

  return {
    ok: false,
    error: "Mensagem desconhecida."
  };
};

const openOnboardingPage = async () => {
  await chrome.tabs.create({
    active: true,
    url: chrome.runtime.getURL(appConfig.onboardingPagePath)
  });
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
    await queueTimerMaintenance(restoreTimerAlarms);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleRuntimeMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error.message
      });
    });

  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === alarmNames.badgeCountdown) {
    startStoredBadgeCountdown().catch((error) => {
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
  pendingScrollPositions.delete(tabId);
  stopTimer(tabId).catch((error) => {
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

  handleCompletedTabUpdate(tabId, tab).catch((error) => {
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

queueTimerMaintenance(ensureRuntimeTimerAlarms).catch((error) => {
  console.error("Erro ao recuperar alarmes do RecarregaAi:", error);
});
