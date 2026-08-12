// RecarregaAi! 2.5.0

import {
  clearCacheForOrigins,
  reloadTabIgnoringCache
} from "./cache.js";
import {
  actionHistoryStatuses,
  actionHistoryTypes,
  alarmNames,
  defaultAppSettings,
  getNextRunDate,
  getNextRunDateFromSeconds,
  getNextOperatingHoursBoundary,
  getPermissionPatternForOrigin,
  getRemainingSeconds,
  getTimerAlarmName,
  getUrlOrigin,
  isWithinOperatingHours,
  mediaResumeSafetySeconds,
  normalizeOrigins,
  normalizeMediaKind,
  pauseReasons
} from "./shared.js";
import {
  appendActionHistory
} from "./history.js";
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
} from "./storage.js";
import { collectLoadedOrigins } from "./tabs.js";
import { createTimerRestorationPlan } from "./timer-restoration.js";
import {
  clearChromeAlarm,
  createChromeAlarm,
  clearTimerAlarm,
  createTimerAlarm
} from "./alarm-manager.js";
import {
  isTabEditingText,
  getTabMediaActivity,
  injectTypingProtection
} from "./media-detection.js";
import {
  updateTimerBadge,
  clearTimerBadge,
  clearAllTimerBadges,
  startBadgeCountdown as startBadgeCountdownBase
} from "./badge-manager.js";

const startBadgeCountdown = () => startBadgeCountdownBase(
  getAllTimerSettings,
  pauseTimerForMedia,
  pauseTimerForTyping,
  resumeTimerWhenMediaSafetyEnds
);

let timerMaintenanceQueue = Promise.resolve();
const autoStartTimerTabIds = new Set();
const pendingScrollPositions = new Map();
const scheduledRefreshTabIds = new Set();
const automaticPauseReasons = new Set([
  pauseReasons.media,
  pauseReasons.typing
]);

const savePendingScrollPosition = async (tabId, position) => {
  pendingScrollPositions.set(tabId, position);

  try {
    await chrome.storage.session.set({
      [`recarregaAiScroll_${tabId}`]: position
    });
  } catch (error) {
    console.warn("Nao foi possivel salvar posicao da pagina:", error);
  }
};

const loadPendingScrollPositions = async () => {
  try {
    const data = await chrome.storage.session.get(null);
    const scrollPrefix = "recarregaAiScroll_";

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(scrollPrefix)) {
        const tabId = Number(key.slice(scrollPrefix.length));

        if (Number.isInteger(tabId) && value) {
          pendingScrollPositions.set(tabId, value);
        }
      }
    }
  } catch (error) {
    console.warn("Nao foi possivel carregar posicoes da pagina:", error);
  }
};

const clearPendingScrollPositionStorage = async (tabId) => {
  pendingScrollPositions.delete(tabId);

  try {
    await chrome.storage.session.remove(`recarregaAiScroll_${tabId}`);
  } catch (error) {
    console.warn("Nao foi possivel limpar posicao da pagina:", error);
  }
};

export const queueTimerMaintenance = (maintenanceTask) => {
  const queuedTask = timerMaintenanceQueue
    .catch(() => undefined)
    .then(maintenanceTask);

  timerMaintenanceQueue = queuedTask;

  return queuedTask;
};

export const recordHistoryEntry = async (entry) => {
  try {
    return await appendActionHistory(entry);
  } catch (error) {
    console.warn("Nao foi possivel registrar o historico do RecarregaAi:", error);
    return null;
  }
};

export const recordTimerHistoryEntry = async (
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

export const pauseTimerForAutomaticReason = async (
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

export const pauseTimerForTyping = async (timerSettings) => (
  pauseTimerForAutomaticReason(timerSettings, pauseReasons.typing)
);

export const pauseTimerForMedia = async (timerSettings, mediaKind) => (
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

export const applyTimerConstraints = async (timerSettings) => {
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

export const resumeTimerWhenMediaSafetyEnds = async (timerSettings) => {
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

export const pauseTimerForNavigation = async (timerSettings, tab) => {
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

export const resumeTimer = async (tabId, { expectedPauseReason = null } = {}) => {
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

export const resumeSystemPausedTimer = async (timerSettings, pauseReason) => {
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

export const pauseAllTimers = async (durationInMinutes) => {
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

export const resumeAllTimers = async () => {
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

export const scheduleOperatingHoursBoundary = async (operatingHours) => {
  await clearChromeAlarm(alarmNames.operatingHoursBoundary);

  const nextBoundary = getNextOperatingHoursBoundary(operatingHours);

  if (!nextBoundary) {
    return null;
  }

  return createChromeAlarm(alarmNames.operatingHoursBoundary, {
    when: nextBoundary.getTime()
  });
};

export const syncOperatingHoursState = async () => {
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

export const restoreGlobalPause = async () => {
  const globalPause = await getGlobalPause();

  if (!globalPause) {
    return;
  }

  if (new Date(globalPause.endsAt).getTime() > Date.now()) {
    await createGlobalPauseAlarm(globalPause);
    const timerSettingsList = await getAllTimerSettings();

    await Promise.all(timerSettingsList.map((timerSettings) => (
      pauseTimerForSystemReason(timerSettings, pauseReasons.global)
    )));
    return;
  }

  await resumeAllTimers();
};

export const stopTimer = async (tabId) => {
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

export const openTimerTab = async (tabId) => {
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

export const startTimer = async (payload) => {
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

export const pauseTimer = async (tabId) => {
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

export const autoStartTimerForTab = async (tabId, tab) => {
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

export const handleCompletedTabUpdate = async (tabId, tab) => {
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

  if (latestTimerSettings.paused) {
    return latestTimerSettings;
  }

  const updatedTimerSettings = {
    ...latestTimerSettings,
    lastError: result.error || null,
    lastRunAt: result.finishedAt,
    lastRunStatus: result.status,
    nextRunAt: getNextRunDate(latestTimerSettings.intervalInMinutes),
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

export const restorePendingScrollPosition = async (tabId) => {
  const scrollPosition = pendingScrollPositions.get(tabId);

  if (!scrollPosition) {
    return;
  }

  await clearPendingScrollPositionStorage(tabId);

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
      await savePendingScrollPosition(timerSettings.tabId, scrollPosition);
    }
  }

  await clearCacheForOrigins(origins);

  try {
    await reloadTabIgnoringCache(timerSettings.tabId);
  } catch (error) {
    await clearPendingScrollPositionStorage(timerSettings.tabId);
    throw error;
  }

  return origins;
};

export const runScheduledRefresh = async (tabId) => {
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

export const restoreTimerAlarms = async () => {
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

export const resumeTimerAfterTyping = async (tabId) => {
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

export const resumeTimerAfterMedia = async (tabId) => {
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

export const handleTypingState = async (payload, tabId) => {
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

export const handleMediaState = async (payload, tabId) => {
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

export const getTimerStateResponse = async (activeTabId) => {
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

export const ensureStartupAlarms = async () => {
  await loadPendingScrollPositions();
  await ensureRuntimeTimerAlarms();
};

export const removePendingScrollPosition = async (tabId) => {
  await clearPendingScrollPositionStorage(tabId);
};
