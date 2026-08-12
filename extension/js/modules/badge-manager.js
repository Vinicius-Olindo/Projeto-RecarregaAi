// RecarregaAi! 2.5.0

import {
  alarmNames,
  formatCountdownTime,
  getBadgeColor,
  getBadgeText,
  getRemainingSeconds,
  mediaKinds,
  normalizeMediaKind,
  oneSecondInMilliseconds,
  pauseReasons
} from "./shared.js";
import { clearChromeAlarm, createChromeAlarm } from "./alarm-manager.js";
import { getTabMediaActivity, isTabEditingText } from "./media-detection.js";

let badgeCountdownTimerId = null;
let badgeCountdownRestartQueue = Promise.resolve();
const previousBadgeState = new Map();

const mediaBadgeStates = {
  [mediaKinds.audio]: {
    badgeText: "A",
    countdownTime: "audio ativo"
  },
  [mediaKinds.generic]: {
    badgeText: "M",
    countdownTime: "midia ativa"
  },
  [mediaKinds.image]: {
    badgeText: "IMG",
    countdownTime: "imagem aberta"
  },
  [mediaKinds.recording]: {
    badgeText: "REC",
    countdownTime: "gravando tela"
  },
  [mediaKinds.video]: {
    badgeText: "V",
    countdownTime: "video ativo"
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

export const clearTimerBadge = async (timerSettings) => {
  await clearActionBadge(timerSettings);
};

export const clearAllTimerBadges = async (timerSettingsList = []) => {
  stopBadgeCountdown();
  await Promise.all(timerSettingsList.map(clearActionBadge));
  await clearGlobalActionBadge();
};

export const updateTimerBadge = async (timerSettings) => {
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
    badgeColor = "#737373";
    badgeText = "II";
    countdownTime = "pausado";

    if (isPausedGlobally) {
      badgeColor = "#6366f1";
      badgeText = "ALL";
      countdownTime = "pausa geral";
    }

    if (isPausedBySchedule) {
      badgeColor = "#525252";
      badgeText = "H";
      countdownTime = "fora do horario";
    }

    if (isPausedByTyping) {
      badgeColor = "#d97706";
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

      badgeColor = "#0d9488";
      badgeText = mediaBadgeState.badgeText;
      countdownTime = mediaBadgeState.countdownTime;

      if (safetySeconds > 0) {
        badgeColor = "#059669";
        badgeText = `${safetySeconds}s`;
        countdownTime = `retomado em ${safetySeconds}s`;
      }
    }
  }

  try {
    const badgeKey = badgeTarget.tabId ?? "global";
    const newState = `${badgeColor}|${badgeText}`;
    const prevState = previousBadgeState.get(badgeKey);

    if (prevState === newState) {
      return;
    }

    previousBadgeState.set(badgeKey, newState);

    await chrome.action.setBadgeBackgroundColor({
      ...badgeTarget,
      color: badgeColor
    });
    await chrome.action.setBadgeText({
      ...badgeTarget,
      text: badgeText
    });
    await chrome.action.setBadgeTextColor({
      ...badgeTarget,
      color: "#ffffff"
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

export const updateAllTimerBadges = async (timerSettingsList) => {
  await Promise.all(timerSettingsList.map(updateTimerBadge));
};

export const createBadgeCountdownAlarm = async () => {
  await clearChromeAlarm(alarmNames.badgeCountdown);

  await createChromeAlarm(alarmNames.badgeCountdown, {
    delayInMinutes: 0.5,
    periodInMinutes: 0.5
  });
};

export const refreshPausedMediaTimers = async (
  timerSettingsList,
  pauseTimerForMedia,
  pauseTimerForTyping,
  resumeTimerWhenMediaSafetyEnds
) => (
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

export const handleBadgeCountdownTick = async (
  getAllTimerSettings,
  pauseTimerForMedia,
  pauseTimerForTyping,
  resumeTimerWhenMediaSafetyEnds
) => {
  const timerSettingsList = await getAllTimerSettings();
  const refreshedTimerSettingsList = await refreshPausedMediaTimers(
    timerSettingsList,
    pauseTimerForMedia,
    pauseTimerForTyping,
    resumeTimerWhenMediaSafetyEnds
  );

  await updateAllTimerBadges(refreshedTimerSettingsList);
};

export const restartBadgeCountdown = async (
  getAllTimerSettings,
  pauseTimerForMedia,
  pauseTimerForTyping,
  resumeTimerWhenMediaSafetyEnds
) => {
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
    handleBadgeCountdownTick(
      getAllTimerSettings,
      pauseTimerForMedia,
      pauseTimerForTyping,
      resumeTimerWhenMediaSafetyEnds
    ).catch((error) => {
      console.error("Erro ao atualizar badges do RecarregaAi:", error);
    });
  }, oneSecondInMilliseconds);
};

export const startBadgeCountdown = (
  getAllTimerSettings,
  pauseTimerForMedia,
  pauseTimerForTyping,
  resumeTimerWhenMediaSafetyEnds
) => {
  const restartPromise = badgeCountdownRestartQueue
    .catch(() => undefined)
    .then(() => restartBadgeCountdown(
      getAllTimerSettings,
      pauseTimerForMedia,
      pauseTimerForTyping,
      resumeTimerWhenMediaSafetyEnds
    ));

  badgeCountdownRestartQueue = restartPromise;

  return restartPromise;
};

export const startStoredBadgeCountdown = async (
  getAllTimerSettings,
  pauseTimerForMedia,
  pauseTimerForTyping,
  resumeTimerWhenMediaSafetyEnds
) => {
  await startBadgeCountdown(
    getAllTimerSettings,
    pauseTimerForMedia,
    pauseTimerForTyping,
    resumeTimerWhenMediaSafetyEnds
  );
};


