// RecarregaAi! 2.3.9

import {
  actionHistoryStatuses,
  actionHistoryTypes,
  getUrlOrigin,
  getPermissionPatternForOrigin,
  runtimeMessageTypes
} from "./shared.js";
import { clearActionHistory, getActionHistory } from "./history.js";
import {
  pauseAllTimers,
  pauseTimer,
  resumeAllTimers,
  resumeTimer,
  startTimer,
  stopTimer,
  openTimerTab,
  handleTypingState,
  handleMediaState,
  getTimerStateResponse,
  recordHistoryEntry,
  autoStartTimerForTab
} from "./timer-management.js";

const extensionBaseUrl = chrome.runtime.getURL("");

const contentScriptMessageTypes = new Set([
  runtimeMessageTypes.mediaState,
  runtimeMessageTypes.typingState
]);
const extensionPageMessageTypes = new Set([
  runtimeMessageTypes.autoStartTimerForOrigin,
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

const createTimerSettingsResponse = (timerSettings) => ({
  ok: true,
  timerSettings
});

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
  [runtimeMessageTypes.autoStartTimerForOrigin]: async (message) => {
    const { origin } = message.payload || {};

    if (!origin) {
      return { ok: false, error: "Origem nao informada." };
    }

    const tabs = await chrome.tabs.query({ url: `${origin}/*` });

    await Promise.all(
      tabs.map((tab) => autoStartTimerForTab(tab.id, tab).catch(() => undefined))
    );

    return { ok: true, startedCount: tabs.length };
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

export const handleRuntimeMessage = async (message, sender = {}) => {
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

export const setupMessageListener = () => {
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
};
