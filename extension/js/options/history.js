// RecarregaAi! 2.5.0 — Histórico das configurações

import {
  actionHistoryStatuses,
  actionHistoryTypes,
  runtimeMessageTypes
} from "../modules/shared.js";
import { optionsElements } from "./elements.js";
import { getOptionsCopy, replaceOptionsToken } from "./language.js";

const historyPageSize = 5;

const historyRefreshTypes = new Set([
  actionHistoryTypes.automaticRefresh,
  actionHistoryTypes.manualCleanup
]);

const historyTimerTypes = new Set([
  actionHistoryTypes.timerPaused,
  actionHistoryTypes.timerResumed,
  actionHistoryTypes.timerStarted,
  actionHistoryTypes.timerStopped
]);

const historyTitleKeys = Object.freeze({
  [actionHistoryTypes.automaticRefresh]: "historyAutomaticRefresh",
  [actionHistoryTypes.manualCleanup]: "historyManualCleanup",
  [actionHistoryTypes.timerPaused]: "historyTimerPaused",
  [actionHistoryTypes.timerResumed]: "historyTimerResumed",
  [actionHistoryTypes.timerStarted]: "historyTimerStarted",
  [actionHistoryTypes.timerStopped]: "historyTimerStopped"
});

const historyStatusKeys = Object.freeze({
  [actionHistoryStatuses.error]: "historyStatusError",
  [actionHistoryStatuses.info]: "historyStatusInfo",
  [actionHistoryStatuses.success]: "historyStatusSuccess",
  [actionHistoryStatuses.warning]: "historyStatusWarning"
});

const historyPauseKeys = Object.freeze({
  global: "historyPauseGlobal",
  manual: "historyPauseManual",
  media: "historyPauseMedia",
  navigation: "historyPauseNavigation",
  schedule: "historyPauseSchedule",
  typing: "historyPauseTyping"
});

let currentActionHistory = [];
let activeHistoryFilter = "all";
let visibleHistoryLimit = historyPageSize;
let historyClearResetTimerId = null;
let isHistoryClearPending = false;

const getHistoryEntryGroup = (entry) => (
  historyRefreshTypes.has(entry.type) ? "refresh" : "timer"
);

const getFilteredActionHistory = () => {
  if (activeHistoryFilter === "refresh") {
    return currentActionHistory.filter((entry) => historyRefreshTypes.has(entry.type));
  }

  if (activeHistoryFilter === "timer") {
    return currentActionHistory.filter((entry) => historyTimerTypes.has(entry.type));
  }

  return currentActionHistory;
};

const getHistoryOriginLabel = (origin) => {
  try {
    return new URL(origin).hostname || getOptionsCopy("historyUnknownSite");
  } catch {
    return getOptionsCopy("historyUnknownSite");
  }
};

const formatHistoryDate = (createdAt, activeOptionsLanguage) => {
  const createdAtDate = new Date(createdAt);

  if (!Number.isFinite(createdAtDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(activeOptionsLanguage, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(createdAtDate);
};

const createHistoryIcon = (group) => {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const paths = group === "refresh"
    ? [
      "M20 7v5h-5",
      "M4 17v-5h5",
      "M6.1 8.5A7 7 0 0 1 18.7 7L20 12",
      "M4 12l1.3 5A7 7 0 0 0 17.9 15.5"
    ]
    : [
      "M4 12a8 8 0 1 0 2.3-5.7",
      "M4 4v5h5",
      "M12 8v5l3 2"
    ];

  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");

  paths.forEach((pathData) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.setAttribute("d", pathData);
    icon.append(path);
  });

  return icon;
};

const formatMinuteLabel = (minutes) => {
  if (minutes === 1) {
    return getOptionsCopy("minuteSingular");
  }

  return replaceOptionsToken("minutePlural", {
    count: String(minutes)
  });
};

const getHistoryDetails = (entry, _activeOptionsLanguage) => {
  const details = [getHistoryOriginLabel(entry.origin)];

  if (entry.intervalInMinutes) {
    details.push(replaceOptionsToken("historyInterval", {
      interval: formatMinuteLabel(entry.intervalInMinutes)
    }));
  }

  if (entry.type === actionHistoryTypes.timerPaused && historyPauseKeys[entry.detail]) {
    details.push(getOptionsCopy(historyPauseKeys[entry.detail]));
  }

  return details;
};

const updateHistoryCount = () => {
  const count = currentActionHistory.length;

  optionsElements.historyCount.textContent = count === 1
    ? getOptionsCopy("historyCountSingular")
    : replaceOptionsToken("historyCountPlural", {
      count
    });
  optionsElements.clearHistoryButton.disabled = count === 0;
};

const updateHistoryPagination = (totalCount, visibleCount) => {
  const hasPagination = totalCount > historyPageSize;

  optionsElements.historyPagination.hidden = !hasPagination;
  optionsElements.historyVisibleCount.textContent = replaceOptionsToken(
    "historyVisibleCount",
    {
      total: String(totalCount),
      visible: String(visibleCount)
    }
  );
  optionsElements.showMoreHistoryButton.hidden = visibleCount >= totalCount;
  optionsElements.collapseHistoryButton.hidden =
    visibleCount <= historyPageSize;
};

export const renderActionHistory = (activeOptionsLanguage) => {
  const filteredHistory = getFilteredActionHistory();
  const visibleHistory = filteredHistory.slice(0, visibleHistoryLimit);

  optionsElements.historyList.replaceChildren();
  optionsElements.historyList.hidden = filteredHistory.length === 0;
  optionsElements.historyEmptyState.hidden = filteredHistory.length > 0;

  visibleHistory.forEach((entry) => {
    const item = document.createElement("li");
    const icon = document.createElement("span");
    const content = document.createElement("div");
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    const status = document.createElement("span");
    const details = document.createElement("p");
    const time = document.createElement("time");
    const historyGroup = getHistoryEntryGroup(entry);

    item.className = "history-item";
    item.dataset.historyGroup = historyGroup;
    icon.className = "history-item__icon";
    icon.append(createHistoryIcon(historyGroup));
    content.className = "history-item__content";
    heading.className = "history-item__heading";
    title.textContent = getOptionsCopy(historyTitleKeys[entry.type]);
    status.className = "history-item__status";
    status.dataset.status = entry.status;
    status.textContent = getOptionsCopy(
      historyStatusKeys[entry.status] || "historyStatusInfo"
    );
    details.className = "history-item__details";
    details.textContent = getHistoryDetails(entry, activeOptionsLanguage).join(" · ");
    time.className = "history-item__time";
    time.dateTime = entry.createdAt;
    time.textContent = formatHistoryDate(entry.createdAt, activeOptionsLanguage);

    heading.append(title, status);
    content.append(heading, details, time);
    item.append(icon, content);
    optionsElements.historyList.append(item);
  });

  updateHistoryCount();
  updateHistoryPagination(filteredHistory.length, visibleHistory.length);
};

export const loadActionHistory = async () => {
  const sendOptionsRuntimeMessage = (message) => new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      resolve({
        entries: [],
        ok: true
      });
      return;
    }

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

  const response = await sendOptionsRuntimeMessage({
    type: runtimeMessageTypes.getActionHistory
  });

  currentActionHistory = Array.isArray(response?.entries) ? response.entries : [];
  visibleHistoryLimit = historyPageSize;
};

export const resetHistoryClearConfirmation = () => {
  isHistoryClearPending = false;
  optionsElements.clearHistoryButton.classList.remove("is-confirming");
  optionsElements.clearHistoryButton.textContent = getOptionsCopy("historyClear");

  if (historyClearResetTimerId) {
    window.clearTimeout(historyClearResetTimerId);
    historyClearResetTimerId = null;
  }
};

export const clearStoredActionHistory = async (updateOptionsStatus) => {
  if (!isHistoryClearPending) {
    isHistoryClearPending = true;
    optionsElements.clearHistoryButton.classList.add("is-confirming");
    optionsElements.clearHistoryButton.textContent = getOptionsCopy(
      "historyClearConfirm"
    );
    historyClearResetTimerId = window.setTimeout(
      resetHistoryClearConfirmation,
      5000
    );
    return;
  }

  const sendOptionsRuntimeMessage = (message) => new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      resolve({
        entries: [],
        ok: true
      });
      return;
    }

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

  await sendOptionsRuntimeMessage({
    type: runtimeMessageTypes.clearActionHistory
  });
  currentActionHistory = [];
  visibleHistoryLimit = historyPageSize;
  resetHistoryClearConfirmation();
  updateOptionsStatus(getOptionsCopy("historyCleared"), "success");
};

export const isHistoryClearPendingState = () => isHistoryClearPending;

export const setActiveHistoryFilter = (filter) => {
  activeHistoryFilter = filter;
  visibleHistoryLimit = historyPageSize;
};

export const incrementVisibleHistoryLimit = () => {
  visibleHistoryLimit += historyPageSize;
};

export const resetVisibleHistoryLimit = () => {
  visibleHistoryLimit = historyPageSize;
};

export const getCurrentActionHistory = () => currentActionHistory;

export const setCurrentActionHistory = (history) => {
  currentActionHistory = history;
};
