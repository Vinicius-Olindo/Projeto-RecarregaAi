// RecarregaAi! 2.3.9

export const oneSecondInMilliseconds = 1000;
export const mediaResumeSafetySeconds = 3;

export const storageKeys = Object.freeze({
  actionHistory: "recarregaAiActionHistory",
  appSettings: "recarregaAiSettings",
  globalPause: "recarregaAiGlobalPause",
  language: "recarregaAiLanguage",
  lastTimerRun: "recarregaAiLastTimerRun",
  theme: "recarregaAiTheme",
  timerSettingsPrefix: "recarregaAiTimer:",
  timerSettings: "recarregaAiTimerSettings"
});

export const actionHistoryTypes = Object.freeze({
  automaticRefresh: "automatic-refresh",
  manualCleanup: "manual-cleanup",
  timerPaused: "timer-paused",
  timerResumed: "timer-resumed",
  timerStarted: "timer-started",
  timerStopped: "timer-stopped"
});

export const actionHistoryStatuses = Object.freeze({
  error: "error",
  info: "info",
  success: "success",
  warning: "warning"
});

export const alarmNames = Object.freeze({
  badgeCountdown: "recarregaAiBadgeCountdown",
  globalPause: "recarregaAiGlobalPause",
  legacyTimer: "recarregaAiAutomaticReload",
  operatingHoursBoundary: "recarregaAiOperatingHoursBoundary",
  timerPrefix: "recarregaAiAutomaticReload:"
});

export const runtimeMessageTypes = Object.freeze({
  clearActionHistory: "RECARREGA_AI_CLEAR_ACTION_HISTORY",
  getActionHistory: "RECARREGA_AI_GET_ACTION_HISTORY",
  getTimerState: "RECARREGA_AI_GET_TIMER_STATE",
  openTimerTab: "RECARREGA_AI_OPEN_TIMER_TAB",
  pauseAllTimers: "RECARREGA_AI_PAUSE_ALL_TIMERS",
  pauseTimer: "RECARREGA_AI_PAUSE_TIMER",
  resumeAllTimers: "RECARREGA_AI_RESUME_ALL_TIMERS",
  resumeTimer: "RECARREGA_AI_RESUME_TIMER",
  mediaState: "RECARREGA_AI_MEDIA_STATE",
  recordManualCleanup: "RECARREGA_AI_RECORD_MANUAL_CLEANUP",
  startTimer: "RECARREGA_AI_START_TIMER",
  stopTimer: "RECARREGA_AI_STOP_TIMER",
  typingState: "RECARREGA_AI_TYPING_STATE"
});

export const pauseReasons = Object.freeze({
  global: "global",
  manual: "manual",
  media: "media",
  navigation: "navigation",
  schedule: "schedule",
  typing: "typing"
});

export const mediaKinds = Object.freeze({
  audio: "audio",
  generic: "media",
  image: "image",
  recording: "recording",
  video: "video"
});

const supportedMediaKinds = new Set(Object.values(mediaKinds));

export const normalizeMediaKind = (mediaKind) => (
  supportedMediaKinds.has(mediaKind) ? mediaKind : mediaKinds.generic
);

export const themeModes = Object.freeze({
  dark: "dark",
  light: "light"
});

export const defaultOperatingHours = Object.freeze({
  enabled: false,
  endTime: "18:00",
  startTime: "08:00",
  weekdays: Object.freeze([1, 2, 3, 4, 5])
});

export const defaultAppSettings = Object.freeze({
  autoStartSites: [],
  defaultIntervalInMinutes: 3,
  operatingHours: defaultOperatingHours,
  preserveScrollPosition: false
});

const normalizeClockTime = (time, fallback) => (
  typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ? time
    : fallback
);

export const normalizeOperatingHours = (operatingHours) => {
  const weekdays = Array.isArray(operatingHours?.weekdays)
    ? [...new Set(
      operatingHours.weekdays
        .map(Number)
        .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
    )].sort((firstWeekday, secondWeekday) => firstWeekday - secondWeekday)
    : [...defaultOperatingHours.weekdays];

  return {
    enabled: Boolean(operatingHours?.enabled),
    endTime: normalizeClockTime(
      operatingHours?.endTime,
      defaultOperatingHours.endTime
    ),
    startTime: normalizeClockTime(
      operatingHours?.startTime,
      defaultOperatingHours.startTime
    ),
    weekdays
  };
};

const getClockMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

export const isWithinOperatingHours = (operatingHours, date = new Date()) => {
  const schedule = normalizeOperatingHours(operatingHours);

  if (!schedule.enabled) {
    return true;
  }

  if (schedule.weekdays.length === 0) {
    return false;
  }

  const startMinutes = getClockMinutes(schedule.startTime);
  const endMinutes = getClockMinutes(schedule.endTime);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const currentWeekday = date.getDay();

  if (startMinutes === endMinutes) {
    return schedule.weekdays.includes(currentWeekday);
  }

  if (startMinutes < endMinutes) {
    return schedule.weekdays.includes(currentWeekday)
      && currentMinutes >= startMinutes
      && currentMinutes < endMinutes;
  }

  if (currentMinutes >= startMinutes) {
    return schedule.weekdays.includes(currentWeekday);
  }

  const previousWeekday = (currentWeekday + 6) % 7;

  return currentMinutes < endMinutes
    && schedule.weekdays.includes(previousWeekday);
};

export const getNextOperatingHoursBoundary = (
  operatingHours,
  date = new Date()
) => {
  const schedule = normalizeOperatingHours(operatingHours);

  if (!schedule.enabled || schedule.weekdays.length === 0) {
    return null;
  }

  const currentState = isWithinOperatingHours(schedule, date);
  const candidate = new Date(date);

  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  for (let minute = 0; minute <= 8 * 24 * 60; minute += 1) {
    if (isWithinOperatingHours(schedule, candidate) !== currentState) {
      return candidate;
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
};

export const cacheDataTypes = Object.freeze({
  cache: true,
  cacheStorage: true,
  serviceWorkers: true
});

export const editableInputTypes = Object.freeze([
  "email",
  "number",
  "search",
  "tel",
  "text",
  "url"
]);

export const createEmptyTimerCollection = () => ({
  timers: {},
  version: 2
});

export const getUrlOrigin = (urlValue) => {
  try {
    const url = new URL(urlValue);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.origin;
  } catch (error) {
    console.error("URL invalida para limpeza de cache:", error);
    return null;
  }
};

export const normalizeOrigins = (origins) => Array.from(
  new Set(
    origins
      .map((origin) => getUrlOrigin(origin))
      .filter(Boolean)
  )
);

export const getPermissionPatternForOrigin = (origin) => `${origin}/*`;

export const getNextRunDate = (intervalInMinutes) => (
  new Date(Date.now() + intervalInMinutes * 60 * 1000).toISOString()
);

export const getNextRunDateFromSeconds = (remainingSeconds) => (
  new Date(Date.now() + remainingSeconds * oneSecondInMilliseconds).toISOString()
);

export const getRemainingSeconds = (nextRunAt) => {
  if (!nextRunAt) {
    return 0;
  }

  const remainingMilliseconds = new Date(nextRunAt).getTime() - Date.now();

  if (!Number.isFinite(remainingMilliseconds)) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil(remainingMilliseconds / oneSecondInMilliseconds)
  );
};

export const formatCountdownTime = (remainingSeconds) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  return `${minutes}:${paddedSeconds}`;
};

export const getBadgeText = (nextRunAt) => {
  const remainingSeconds = getRemainingSeconds(nextRunAt);

  if (remainingSeconds > 5999) {
    return "99+";
  }

  return formatCountdownTime(remainingSeconds);
};

export const getBadgeColor = (nextRunAt) => {
  const remainingSeconds = getRemainingSeconds(nextRunAt);

  if (remainingSeconds <= 10) {
    return "#ef7a1f";
  }

  return "#1f7aef";
};

export const getTimerAlarmName = (tabId) => `${alarmNames.timerPrefix}${tabId}`;

export const getTabIdFromTimerAlarmName = (alarmName) => {
  if (!alarmName.startsWith(alarmNames.timerPrefix)) {
    return null;
  }

  const tabId = Number(alarmName.slice(alarmNames.timerPrefix.length));

  return Number.isInteger(tabId) ? tabId : null;
};

export const normalizeTimerSettings = (timerSettings) => {
  const tabId = Number(timerSettings?.tabId);

  if (!Number.isInteger(tabId) || timerSettings?.enabled === false) {
    return null;
  }

  return {
    ...timerSettings,
    enabled: true,
    paused: Boolean(timerSettings.paused),
    tabId
  };
};

export const normalizeTimerCollection = (storedSettings) => {
  const collection = createEmptyTimerCollection();
  const storedTimers = storedSettings?.version === 2
    ? Object.values(storedSettings.timers || {})
    : [storedSettings];

  storedTimers.forEach((timerSettings) => {
    const normalizedTimerSettings = normalizeTimerSettings(timerSettings);

    if (!normalizedTimerSettings) {
      return;
    }

    collection.timers[String(normalizedTimerSettings.tabId)] =
      normalizedTimerSettings;
  });

  return collection;
};

export const collectFrameOrigins = () => {
  const allowedProtocols = ["http:", "https:"];
  const origins = new Set();

  const addOriginFromUrl = (urlValue) => {
    if (!urlValue) {
      return;
    }

    try {
      const url = new URL(urlValue, window.location.href);

      if (allowedProtocols.includes(url.protocol)) {
        origins.add(url.origin);
      }
    } catch (error) {
      console.debug("URL ignorada pelo RecarregaAi:", error);
    }
  };

  addOriginFromUrl(window.location.href);

  performance.getEntries().forEach((entry) => {
    addOriginFromUrl(entry.name);
  });

  document.querySelectorAll("[href], [src]").forEach((element) => {
    addOriginFromUrl(element.href);
    addOriginFromUrl(element.src);
    addOriginFromUrl(element.currentSrc);
    addOriginFromUrl(element.getAttribute("href"));
    addOriginFromUrl(element.getAttribute("src"));
  });

  return Array.from(origins);
};
