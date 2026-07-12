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
  loadThemePreference
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
import { extendPageTranslations } from "./modules/extended-translations.js";
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

const popupTranslations = extendPageTranslations({
  "pt-BR": {
    activeCountPlural: "{count} páginas",
    activeCountSingular: "1 página",
    activePageOffStatus: "{count} atualizando. Esta página ainda está desligada.",
    activeStatus: "Atualização ligada nesta página: a cada {interval}.",
    activeTimerTitle: "Atualizações em andamento",
    activatingTimer: "Ativando...",
    audioCountdown: "Áudio",
    audioPausedStatus:
      "Áudio em reprodução. A atualização pausou e será retomada quando o áudio parar.",
    audioPauseDetail:
      "Retoma automaticamente quando o áudio terminar ou for pausado.",
    audioPauseTitle: "Pausado por áudio",
    autoLabel: "Automático",
    automaticResumeStatus:
      "Atividade encerrada. A atualização foi retomada.",
    chooseTime: "Escolha um tempo para começar.",
    chooseTimeBelow: "Escolha um tempo abaixo para começar.",
    cleaningPage: "Limpando dados antigos desta página...",
    cleanupError: "Não consegui limpar esta página agora.",
    cleanupSuccess: "Página limpa e atualizada.",
    countdownBadge: "min:seg",
    currentButton: "Atual",
    currentPageLabel: "Página atual",
    customIntervalOption: "Outro tempo",
    customTimerLabel: "Outro tempo em minutos",
    defaultStartButton: "Ligar atualização",
    intervalLegend: "Escolha de quanto em quanto tempo a página será atualizada",
    invalidInterval: "Informe pelo menos 1 minuto.",
    loadingCleanup: "Limpando...",
    manualHint: "Limpa dados antigos e atualiza esta página uma vez.",
    manualLabel: "Manual",
    mediaCountdown: "Mídia",
    mediaPausedStatus:
      "Mídia em uso. A atualização pausou e será retomada quando a atividade terminar.",
    mediaPauseDetail:
      "Retoma automaticamente quando a atividade de mídia terminar.",
    mediaPauseTitle: "Pausado por mídia",
    minutePlural: "{count} minutos",
    minuteShort: "min",
    minuteSingular: "1 minuto",
    noActiveStatus: "Nenhuma página atualizando sozinha agora.",
    openButton: "Abrir",
    openControlledPage: "Abrir página",
    openControlledPageError: "Não consegui abrir essa página.",
    otherPagesLabel: "Outras páginas",
    pageNotIdentified: "Página não identificada",
    pausedCountdown: "Pausado",
    pauseError: "Não consegui pausar agora.",
    pausedStatus: "Atualização pausada.",
    pauseTimer: "Pausar",
    permissionNeeded: "Você precisa autorizar este site para ligar a atualização.",
    prepareTimer: "Preparando atualização automática...",
    readyStatus: "Pronto para limpar e atualizar a página aberta.",
    recurringTitle: "Atualização recorrente",
    recordingCountdown: "Gravando",
    recordingPausedStatus:
      "Gravação em andamento. A atualização pausou e será retomada quando a gravação terminar.",
    recordingPauseDetail:
      "Retoma automaticamente quando a gravação terminar.",
    recordingPauseTitle: "Pausado por gravação",
    refreshOffTitle: "Atualização desligada",
    reloadOnceTitle: "Atualizar agora",
    removeTimer: "Remover",
    resumeError: "Não consegui retomar agora.",
    resumeStatus: "Atualização retomada.",
    resumeTimer: "Retomar",
    safetyPauseDetail:
      "A atividade terminou. Retoma em {seconds}s para evitar uma atualização imediata.",
    safetyPausedStatus:
      "Mídia encerrada. A atualização será retomada em {seconds}s.",
    safetyPauseTitle: "Pausa de segurança após mídia",
    settings: "Configurações",
    startError: "Não consegui ligar a atualização automática agora.",
    startedStatus: "Atualização ligada: a cada {interval}.",
    statusLabel: "Status",
    stopError: "Não consegui desligar agora.",
    stopStatus: "Atualização automática desligada.",
    stopTimer: "Desligar",
    subtitle: "Atualize a página com dados novos.",
    tabUnavailable: "Não consegui identificar a página aberta.",
    timerNote:
      "O contador no ícone pode variar um pouco quando este painel está fechado.",
    timerTabFallback: "Página em atualização",
    typingCountdown: "Digitando",
    typingPauseDetail:
      "Retoma automaticamente quando você sair do campo de texto.",
    typingPausedStatus:
      "Você está digitando. A atualização pausou e será retomada ao sair do campo de texto.",
    typingPauseTitle: "Pausado por digitação",
    unsupportedPage: "Esta página não permite esse tipo de limpeza.",
    updateNowButton: "Limpar e atualizar",
    videoCountdown: "Vídeo",
    videoPausedStatus:
      "Vídeo em reprodução. A atualização pausou e será retomada quando o vídeo parar.",
    videoPauseDetail:
      "Retoma automaticamente quando o vídeo terminar ou for pausado.",
    videoPauseTitle: "Pausado por vídeo",
    waitForPage: "Aguarde esta página aparecer no painel e tente de novo.",
    workingCheck: "Verificando o que precisa ser limpo..."
  },
  en: {
    activeCountPlural: "{count} pages",
    activeCountSingular: "1 page",
    activePageOffStatus: "{count} refreshing. This page is still off.",
    activeStatus: "Refresh enabled on this page: every {interval}.",
    activeTimerTitle: "Refreshes in progress",
    activatingTimer: "Starting...",
    audioCountdown: "Audio",
    audioPausedStatus:
      "Audio is playing. Refresh paused and will resume when the audio stops.",
    audioPauseDetail:
      "Resumes automatically when the audio ends or is paused.",
    audioPauseTitle: "Paused for audio",
    autoLabel: "Automatic",
    automaticResumeStatus: "Activity ended. Refresh has resumed.",
    chooseTime: "Choose a time to start.",
    chooseTimeBelow: "Choose a time below to start.",
    cleaningPage: "Clearing old data from this page...",
    cleanupError: "I could not clear this page right now.",
    cleanupSuccess: "Page cleared and refreshed.",
    countdownBadge: "min:sec",
    currentButton: "Current",
    currentPageLabel: "Current page",
    customIntervalOption: "Custom time",
    customTimerLabel: "Custom time in minutes",
    defaultStartButton: "Start refresh",
    intervalLegend: "Choose how often the page will be refreshed",
    invalidInterval: "Enter at least 1 minute.",
    loadingCleanup: "Clearing...",
    manualHint: "Clears old data and refreshes this page once.",
    manualLabel: "Manual",
    mediaCountdown: "Media",
    mediaPausedStatus:
      "Media is in use. Refresh paused and will resume when the activity ends.",
    mediaPauseDetail:
      "Resumes automatically when the media activity ends.",
    mediaPauseTitle: "Paused for media",
    minutePlural: "{count} minutes",
    minuteShort: "min",
    minuteSingular: "1 minute",
    noActiveStatus: "No page is refreshing automatically right now.",
    openButton: "Open",
    openControlledPage: "Open page",
    openControlledPageError: "I could not open that page.",
    otherPagesLabel: "Other pages",
    pageNotIdentified: "Page not identified",
    pausedCountdown: "Paused",
    pauseError: "I could not pause right now.",
    pausedStatus: "Refresh paused.",
    pauseTimer: "Pause",
    permissionNeeded: "You need to allow this site to start the refresh.",
    prepareTimer: "Preparing automatic refresh...",
    readyStatus: "Ready to clear and refresh the open page.",
    recurringTitle: "Recurring refresh",
    recordingCountdown: "Recording",
    recordingPausedStatus:
      "Recording is in progress. Refresh paused and will resume when recording ends.",
    recordingPauseDetail:
      "Resumes automatically when recording ends.",
    recordingPauseTitle: "Paused for recording",
    refreshOffTitle: "Refresh off",
    reloadOnceTitle: "Refresh now",
    removeTimer: "Remove",
    resumeError: "I could not resume right now.",
    resumeStatus: "Refresh resumed.",
    resumeTimer: "Resume",
    safetyPauseDetail:
      "The activity ended. Resumes in {seconds}s to avoid an immediate refresh.",
    safetyPausedStatus:
      "Media ended. Refresh will resume in {seconds}s.",
    safetyPauseTitle: "Safety pause after media",
    settings: "Settings",
    startError: "I could not start automatic refresh right now.",
    startedStatus: "Refresh started: every {interval}.",
    statusLabel: "Status",
    stopError: "I could not turn it off right now.",
    stopStatus: "Automatic refresh turned off.",
    stopTimer: "Turn off",
    subtitle: "Refresh the page with fresh data.",
    tabUnavailable: "I could not identify the open page.",
    timerNote:
      "The icon countdown may vary slightly while this panel is closed.",
    timerTabFallback: "Page refreshing",
    typingCountdown: "Typing",
    typingPauseDetail:
      "Resumes automatically when you leave the text field.",
    typingPausedStatus:
      "You are typing. Refresh paused and will resume when you leave the text field.",
    typingPauseTitle: "Paused for typing",
    unsupportedPage: "This page does not allow this type of cleanup.",
    updateNowButton: "Clear and refresh",
    videoCountdown: "Video",
    videoPausedStatus:
      "Video is playing. Refresh paused and will resume when the video stops.",
    videoPauseDetail:
      "Resumes automatically when the video ends or is paused.",
    videoPauseTitle: "Paused for video",
    waitForPage: "Wait for this page to appear in the panel and try again.",
    workingCheck: "Checking what needs to be cleared..."
  },
  es: {
    activeCountPlural: "{count} páginas",
    activeCountSingular: "1 página",
    activePageOffStatus: "{count} actualizándose. Esta página sigue apagada.",
    activeStatus: "Actualización activa en esta página: cada {interval}.",
    activeTimerTitle: "Actualizaciones en curso",
    activatingTimer: "Activando...",
    audioCountdown: "Audio",
    audioPausedStatus:
      "Hay audio en reproducción. La actualización se pausó y se reanudará cuando el audio se detenga.",
    audioPauseDetail:
      "Se reanuda automáticamente cuando el audio termina o se pausa.",
    audioPauseTitle: "Pausado por audio",
    autoLabel: "Automático",
    automaticResumeStatus:
      "La actividad terminó. La actualización se reanudó.",
    chooseTime: "Elige un tiempo para empezar.",
    chooseTimeBelow: "Elige un tiempo abajo para empezar.",
    cleaningPage: "Limpiando datos antiguos de esta página...",
    cleanupError: "No pude limpiar esta página ahora.",
    cleanupSuccess: "Página limpia y actualizada.",
    countdownBadge: "min:seg",
    currentButton: "Actual",
    currentPageLabel: "Página actual",
    customIntervalOption: "Otro tiempo",
    customTimerLabel: "Otro tiempo en minutos",
    defaultStartButton: "Activar actualización",
    intervalLegend: "Elige cada cuánto tiempo se actualizará la página",
    invalidInterval: "Ingresa al menos 1 minuto.",
    loadingCleanup: "Limpiando...",
    manualHint: "Limpia datos antiguos y actualiza esta página una vez.",
    manualLabel: "Manual",
    mediaCountdown: "Medios",
    mediaPausedStatus:
      "Hay medios en uso. La actualización se pausó y se reanudará cuando termine la actividad.",
    mediaPauseDetail:
      "Se reanuda automáticamente cuando termina la actividad multimedia.",
    mediaPauseTitle: "Pausado por medios",
    minutePlural: "{count} minutos",
    minuteShort: "min",
    minuteSingular: "1 minuto",
    noActiveStatus: "Ninguna página se está actualizando sola ahora.",
    openButton: "Abrir",
    openControlledPage: "Abrir página",
    openControlledPageError: "No pude abrir esa página.",
    otherPagesLabel: "Otras páginas",
    pageNotIdentified: "Página no identificada",
    pausedCountdown: "Pausado",
    pauseError: "No pude pausar ahora.",
    pausedStatus: "Actualización pausada.",
    pauseTimer: "Pausar",
    permissionNeeded: "Debes autorizar este sitio para activar la actualización.",
    prepareTimer: "Preparando actualización automática...",
    readyStatus: "Listo para limpiar y actualizar la página abierta.",
    recurringTitle: "Actualización recurrente",
    recordingCountdown: "Grabando",
    recordingPausedStatus:
      "Hay una grabación en curso. La actualización se pausó y se reanudará cuando termine.",
    recordingPauseDetail:
      "Se reanuda automáticamente cuando termina la grabación.",
    recordingPauseTitle: "Pausado por grabación",
    refreshOffTitle: "Actualización apagada",
    reloadOnceTitle: "Actualizar ahora",
    removeTimer: "Eliminar",
    resumeError: "No pude retomar ahora.",
    resumeStatus: "Actualización retomada.",
    resumeTimer: "Retomar",
    safetyPauseDetail:
      "La actividad terminó. Se reanuda en {seconds}s para evitar una actualización inmediata.",
    safetyPausedStatus:
      "Los medios terminaron. La actualización se reanudará en {seconds}s.",
    safetyPauseTitle: "Pausa de seguridad después de medios",
    settings: "Configuración",
    startError: "No pude activar la actualización automática ahora.",
    startedStatus: "Actualización activa: cada {interval}.",
    statusLabel: "Estado",
    stopError: "No pude desactivar ahora.",
    stopStatus: "Actualización automática desactivada.",
    stopTimer: "Desactivar",
    subtitle: "Actualiza la página con datos nuevos.",
    tabUnavailable: "No pude identificar la página abierta.",
    timerNote:
      "El contador del ícono puede variar un poco cuando este panel está cerrado.",
    timerTabFallback: "Página en actualización",
    typingCountdown: "Escribiendo",
    typingPauseDetail:
      "Se reanuda automáticamente cuando sales del campo de texto.",
    typingPausedStatus:
      "Estás escribiendo. La actualización se pausó y se reanudará cuando salgas del campo de texto.",
    typingPauseTitle: "Pausado por escritura",
    unsupportedPage: "Esta página no permite este tipo de limpieza.",
    updateNowButton: "Limpiar y actualizar",
    videoCountdown: "Video",
    videoPausedStatus:
      "Hay un video en reproducción. La actualización se pausó y se reanudará cuando el video se detenga.",
    videoPauseDetail:
      "Se reanuda automáticamente cuando el video termina o se pausa.",
    videoPauseTitle: "Pausado por video",
    waitForPage: "Espera a que esta página aparezca en el panel e inténtalo de nuevo.",
    workingCheck: "Verificando qué se debe limpiar..."
  }
}, "popup");

const getPopupCopy = (key) => (
  popupTranslations[activePopupLanguage]?.[key]
  || popupTranslations["pt-BR"][key]
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
  setPopupText(".quick-action__title", "reloadOnceTitle");
  setPopupText(".quick-action .popup__hint", "manualHint");
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

setInterval(() => {
  refreshTimerState({
    updateStatus: true
  }).catch((error) => {
    console.error("Erro ao atualizar estado do timer:", error);
  });
}, 1000);
