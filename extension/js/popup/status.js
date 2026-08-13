// RecarregaAi! 2.5.0 — Status e UI do popup

import {
  mediaKinds,
  normalizeMediaKind,
  pauseReasons,
  formatCountdownTime,
  getRemainingSeconds
} from "../modules/shared.js";
import { popupElements } from "./elements.js";
import { getPopupCopy, replacePopupTokens } from "./language.js";

export const updateStatusMessage = (message, status = "neutral") => {
  if (popupElements.statusMessage) {
    popupElements.statusMessage.textContent = message;
  }

  if (popupElements.statusPanel) {
    popupElements.statusPanel.dataset.status = status;
  }
};

export const updateButtonState = (button, isLoading, loadingText, defaultText) => {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
  button.classList.toggle("is-loading", isLoading);
};

export const loadExtensionVersion = () => {
  const manifest = chrome.runtime.getManifest();

  popupElements.extensionVersion.textContent = manifest.version_name
    || `V.${manifest.version}`;
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

export const getAutomaticPausePresentation = (timerSettings) => {
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

export const getTimerVisualState = (timerSettings) => {
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

export const getTimerTabLabel = (timerSettings) => (
  timerSettings.tabTitle || timerSettings.mainOrigin || getPopupCopy("timerTabFallback")
);

export const formatActiveTimerCount = (count) => {
  if (count === 1) {
    return getPopupCopy("activeCountSingular");
  }

  return replacePopupTokens("activeCountPlural", {
    count: String(count)
  });
};

export const formatTimerInterval = (intervalInMinutes) => {
  if (intervalInMinutes === 1) {
    return getPopupCopy("minuteSingular");
  }

  return replacePopupTokens("minutePlural", {
    count: String(intervalInMinutes)
  });
};

export const getPausePresentationCopy = (presentation, keyName) => {
  const copyKey = presentation[keyName];

  if (!presentation.replacements) {
    return getPopupCopy(copyKey);
  }

  return replacePopupTokens(copyKey, presentation.replacements);
};
