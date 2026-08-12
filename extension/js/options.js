// RecarregaAi! 2.5.0

import { initFloatingTools } from "./modules/floating-tools.js";
import { loadPageI18n } from "./modules/i18n.js";
import {
  defaultLanguage,
  initLanguageDialog,
  loadLanguagePreference,
  saveLanguagePreference,
  normalizeLanguage
} from "./modules/language-dialog.js";
import {
  actionHistoryStatuses,
  actionHistoryTypes,
  defaultAppSettings,
  getPermissionPatternForOrigin,
  getUrlOrigin,
  normalizeOperatingHours,
  runtimeMessageTypes,
  storageKeys
} from "./modules/shared.js";
import {
  loadThemePreference,
  normalizeTheme,
  saveThemePreference,
  toggleThemePreference,
  watchSystemTheme
} from "./modules/theme.js";

const optionsPreviewStorageKey = "recarregaAiOptionsPreviewSettings";
const optionsPageLanguageStorageKey = "recarregaAiPageLanguage";
const settingsExportType = "recarregaai-settings";
const settingsExportVersion = 2;
const historyPageSize = 5;

const optionsElements = {
  addSiteButton: document.querySelector("#add-site-button"),
  clearHistoryButton: document.querySelector("#clear-history-button"),
  closeOptionsButton: document.querySelector("#close-options-button"),
  collapseHistoryButton: document.querySelector("#collapse-history-button"),
  defaultIntervalInput: document.querySelector("#default-interval-input"),
  extensionVersion: document.querySelector("#extension-version"),
  exportSettingsButton: document.querySelector("#export-settings-button"),
  importSettingsButton: document.querySelector("#import-settings-button"),
  importSettingsInput: document.querySelector("#import-settings-input"),
  historyCount: document.querySelector("#history-count"),
  historyEmptyState: document.querySelector("#history-empty-state"),
  historyFilterButtons: document.querySelectorAll("[data-history-filter]"),
  historyList: document.querySelector("#history-list"),
  historyPagination: document.querySelector("#history-pagination"),
  historyVisibleCount: document.querySelector("#history-visible-count"),
  optionsStatus: document.querySelector("#options-status"),
  operatingHoursEnabled: document.querySelector("#operating-hours-enabled"),
  operatingHoursFields: document.querySelector("#operating-hours-fields"),
  operatingStartTime: document.querySelector("#operating-start-time"),
  operatingEndTime: document.querySelector("#operating-end-time"),
  operatingWeekdays: document.querySelectorAll("[name='operating-weekday']"),
  preserveScrollInput: document.querySelector("#preserve-scroll-input"),
  saveSettingsButton: document.querySelector("#save-settings-button"),
  showMoreHistoryButton: document.querySelector("#show-more-history-button"),
  siteFormAlert: document.querySelector("#site-form-alert"),
  siteFormAlertText: document.querySelector("#site-form-alert-text"),
  siteIntervalInput: document.querySelector("#site-interval-input"),
  siteOriginInput: document.querySelector("#site-origin-input"),
  sitesEmptyState: document.querySelector("#sites-empty-state"),
  sitesList: document.querySelector("#sites-list"),
  themeToggleButton: document.querySelector("#theme-toggle-button"),
  themeToggleLabel: document.querySelector("#theme-toggle-label")
};

let optionsTranslations = {};
let activeOptionsLanguage = defaultLanguage;

const getOptionsCopy = (key) => (
  optionsTranslations[activeOptionsLanguage]?.[key]
  || optionsTranslations["pt-BR"]?.[key]
  || key
);

let currentSettings = { ...defaultAppSettings };
let currentActionHistory = [];
let activeHistoryFilter = "all";
let visibleHistoryLimit = historyPageSize;
let historyClearResetTimerId = null;
let isHistoryClearPending = false;
let optionsLanguageDialog = null;

const replaceOptionsToken = (key, replacements) => (
  Object.entries(replacements).reduce(
    (text, [token, value]) => text.replace(`{${token}}`, value),
    getOptionsCopy(key)
  )
);

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

const formatHistoryDate = (createdAt) => {
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

const getHistoryDetails = (entry) => {
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

const renderActionHistory = () => {
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
    details.textContent = getHistoryDetails(entry).join(" · ");
    time.className = "history-item__time";
    time.dateTime = entry.createdAt;
    time.textContent = formatHistoryDate(entry.createdAt);

    heading.append(title, status);
    content.append(heading, details, time);
    item.append(icon, content);
    optionsElements.historyList.append(item);
  });

  updateHistoryCount();
  updateHistoryPagination(filteredHistory.length, visibleHistory.length);
};

const loadActionHistory = async () => {
  const response = await sendOptionsRuntimeMessage({
    type: runtimeMessageTypes.getActionHistory
  });

  currentActionHistory = Array.isArray(response?.entries) ? response.entries : [];
  visibleHistoryLimit = historyPageSize;
  renderActionHistory();
};

const resetHistoryClearConfirmation = () => {
  isHistoryClearPending = false;
  optionsElements.clearHistoryButton.classList.remove("is-confirming");
  optionsElements.clearHistoryButton.textContent = getOptionsCopy("historyClear");

  if (historyClearResetTimerId) {
    window.clearTimeout(historyClearResetTimerId);
    historyClearResetTimerId = null;
  }
};

const clearStoredActionHistory = async () => {
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

  await sendOptionsRuntimeMessage({
    type: runtimeMessageTypes.clearActionHistory
  });
  currentActionHistory = [];
  visibleHistoryLimit = historyPageSize;
  resetHistoryClearConfirmation();
  renderActionHistory();
  updateOptionsStatus(getOptionsCopy("historyCleared"), "success");
};

const setText = (selector, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = getOptionsCopy(key);
  }
};

const setTexts = (selector, keys) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    const key = keys[index];

    if (key) {
      element.textContent = getOptionsCopy(key);
    }
  });
};

const setAttribute = (selector, attribute, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute(attribute, getOptionsCopy(key));
  }
};

const getOptionsStorageArea = () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
};

const getPreviewSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(optionsPreviewStorageKey)) || {};
  } catch {
    return {};
  }
};

const savePreviewSettings = (settings) => {
  localStorage.setItem(optionsPreviewStorageKey, JSON.stringify(settings));
};

const updateOptionsStatus = (message, status = "neutral") => {
  optionsElements.optionsStatus.textContent = message;
  optionsElements.optionsStatus.dataset.status = status;
};

const updateSiteFormAlert = (message = "") => {
  optionsElements.siteFormAlertText.textContent = message;
  optionsElements.siteFormAlert.hidden = !message;
};

const closeOptionsPage = () => {
  if (typeof chrome === "undefined" || !chrome.tabs?.getCurrent || !chrome.tabs?.remove) {
    window.close();
    return;
  }

  chrome.tabs.getCurrent((currentTab) => {
    if (chrome.runtime.lastError || !currentTab?.id) {
      window.close();
      return;
    }

    chrome.tabs.remove(currentTab.id);
  });
};

const formatMinuteLabel = (minutes) => {
  if (minutes === 1) {
    return getOptionsCopy("minuteSingular");
  }

  return replaceOptionsToken("minutePlural", {
    count: String(minutes)
  });
};

const getStoredOptionsSettings = async () => {
  const storageArea = getOptionsStorageArea();
  const storedData = storageArea
    ? await storageArea.get(storageKeys.appSettings)
    : {
      [storageKeys.appSettings]: getPreviewSettings()
    };
  const storedSettings = storedData[storageKeys.appSettings] || {};

  return {
    ...defaultAppSettings,
    ...storedSettings,
    autoStartSites: Array.isArray(storedSettings.autoStartSites)
      ? storedSettings.autoStartSites
      : [],
    operatingHours: normalizeOperatingHours(storedSettings.operatingHours),
    preserveScrollPosition: Boolean(storedSettings.preserveScrollPosition)
  };
};

const saveOptionsSettings = async () => {
  const storageArea = getOptionsStorageArea();

  if (!storageArea) {
    savePreviewSettings(currentSettings);
    return;
  }

  await storageArea.set({
    [storageKeys.appSettings]: currentSettings
  });
};

const hasOwnProperty = (object, property) => (
  Object.prototype.hasOwnProperty.call(object, property)
);

const normalizeOptionsInterval = (
  interval,
  fallback = defaultAppSettings.defaultIntervalInMinutes
) => {
  const intervalInMinutes = Number(interval);

  if (!Number.isFinite(intervalInMinutes) || intervalInMinutes < 1) {
    return fallback;
  }

  return Math.floor(intervalInMinutes);
};

const normalizeAutoStartSite = (site, fallbackInterval) => {
  const origin = getUrlOrigin(site?.origin);

  if (!origin) {
    return null;
  }

  return {
    enabled: site.enabled !== false,
    intervalInMinutes: normalizeOptionsInterval(
      site.intervalInMinutes,
      fallbackInterval
    ),
    origin
  };
};

const normalizeOptionsSettings = (settings) => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  if (
    !hasOwnProperty(settings, "defaultIntervalInMinutes")
    && !hasOwnProperty(settings, "autoStartSites")
  ) {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  if (
    hasOwnProperty(settings, "autoStartSites")
    && !Array.isArray(settings.autoStartSites)
  ) {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  const defaultIntervalInMinutes = normalizeOptionsInterval(
    settings.defaultIntervalInMinutes
  );
  const siteMap = new Map();

  (settings.autoStartSites || []).forEach((site) => {
    const normalizedSite = normalizeAutoStartSite(
      site,
      defaultIntervalInMinutes
    );

    if (normalizedSite) {
      siteMap.set(normalizedSite.origin, normalizedSite);
    }
  });

  return {
    autoStartSites: [...siteMap.values()],
    defaultIntervalInMinutes,
    operatingHours: normalizeOperatingHours(settings.operatingHours),
    preserveScrollPosition: Boolean(settings.preserveScrollPosition)
  };
};

const getOptionsVersionLabel = () => {
  if (typeof chrome === "undefined" || !chrome.runtime?.getManifest) {
    return "preview";
  }

  const manifest = chrome.runtime.getManifest();

  return manifest.version_name || manifest.version;
};

const getCurrentOptionsLanguage = () => (
  normalizeLanguage(
    localStorage.getItem(optionsPageLanguageStorageKey)
    || document.documentElement.lang
  )
);

const getCurrentOptionsTheme = () => (
  normalizeTheme(document.documentElement.dataset.theme)
);

const createSettingsExportPayload = () => ({
  app: "RecarregaAi!",
  exportedAt: new Date().toISOString(),
  extensionVersion: getOptionsVersionLabel(),
  preferences: {
    language: getCurrentOptionsLanguage(),
    theme: getCurrentOptionsTheme()
  },
  settings: normalizeOptionsSettings(currentSettings),
  type: settingsExportType,
  version: settingsExportVersion
});

const downloadJsonFile = (fileName, payload) => {
  const downloadUrl = URL.createObjectURL(
    new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json"
    })
  );
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.hidden = true;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 0);
};

const exportOptionsSettings = () => {
  const exportDate = new Date().toISOString().slice(0, 10);
  const fileName = `recarregaai-configuracoes-${exportDate}.json`;

  downloadJsonFile(fileName, createSettingsExportPayload());
  updateOptionsStatus(getOptionsCopy("formExported"), "success");
};

const parseSettingsImportPayload = (fileText) => {
  let payload;

  try {
    payload = JSON.parse(fileText);
  } catch {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(getOptionsCopy("formImportInvalid"));
  }

  const isWrappedPayload = payload.type === settingsExportType
    || hasOwnProperty(payload, "settings")
    || hasOwnProperty(payload, "preferences");
  const settings = normalizeOptionsSettings(
    isWrappedPayload ? payload.settings : payload
  );
  const preferences = isWrappedPayload && payload.preferences
    && typeof payload.preferences === "object"
    && !Array.isArray(payload.preferences)
    ? payload.preferences
    : {};

  return {
    preferences: {
      language: hasOwnProperty(preferences, "language")
        ? normalizeLanguage(preferences.language)
        : null,
      theme: hasOwnProperty(preferences, "theme")
        ? normalizeTheme(preferences.theme)
        : null
    },
    settings
  };
};

const requestAutoStartPermissions = async (autoStartSites) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.request) {
    return true;
  }

  const origins = [...new Set(
    autoStartSites
      .filter((site) => site.enabled !== false)
      .map((site) => getPermissionPatternForOrigin(site.origin))
  )];

  if (origins.length === 0) {
    return true;
  }

  return chrome.permissions.request({
    origins
  });
};

const removeUnusedAutoStartPermissions = async (
  previousAutoStartSites,
  nextAutoStartSites
) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.remove) {
    return;
  }

  const nextOrigins = new Set(nextAutoStartSites.map((site) => site.origin));
  const previousOrigins = [...new Set(
    previousAutoStartSites.map((site) => site.origin)
  )];
  const originsToRemove = previousOrigins.filter((origin) => (
    !nextOrigins.has(origin)
  ));

  await Promise.all(originsToRemove.map(async (origin) => {
    try {
      await chrome.permissions.remove({
        origins: [getPermissionPatternForOrigin(origin)]
      });
    } catch (error) {
      console.debug("Permissão antiga mantida pelo navegador:", error);
    }
  }));
};

const applyImportedPreferences = async (preferences) => {
  if (preferences.theme) {
    await saveThemePreference({
      onChange: updateOptionsThemeButtonLabel,
      theme: preferences.theme
    });
  }

  if (!preferences.language) {
    return;
  }

  if (optionsLanguageDialog) {
    optionsLanguageDialog.applyLanguage(preferences.language);
    return;
  }

  localStorage.setItem(optionsPageLanguageStorageKey, preferences.language);
  applyOptionsLanguage(preferences.language);
};

const importOptionsSettingsFromFile = async (file) => {
  if (!file) {
    return;
  }

  const importedData = parseSettingsImportPayload(await file.text());
  const hasPermission = await requestAutoStartPermissions(
    importedData.settings.autoStartSites
  );

  if (!hasPermission) {
    throw new Error(getOptionsCopy("formImportPermissionDenied"));
  }

  const previousSettings = currentSettings;

  currentSettings = importedData.settings;

  try {
    await saveOptionsSettings();
    await removeUnusedAutoStartPermissions(
      previousSettings.autoStartSites,
      currentSettings.autoStartSites
    );
    await applyImportedPreferences(importedData.preferences);
  } catch (error) {
    currentSettings = previousSettings;
    throw error;
  }

  optionsElements.defaultIntervalInput.value =
    currentSettings.defaultIntervalInMinutes;
  syncPreferenceControls();
  renderSites();
  updateOptionsStatus(getOptionsCopy("formImported"), "success");
};

const requestAutoStartPermission = async (origin) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.request) {
    return true;
  }

  const originPattern = getPermissionPatternForOrigin(origin);

  return chrome.permissions.request({
    origins: [originPattern]
  });
};

const removeAutoStartPermissionIfUnused = async (origin) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.remove) {
    return;
  }

  const originPattern = getPermissionPatternForOrigin(origin);
  const isStillUsed = currentSettings.autoStartSites.some((site) => (
    site.origin === origin
  ));

  if (isStillUsed) {
    return;
  }

  await chrome.permissions.remove({
    origins: [originPattern]
  });
};

const normalizeSiteOrigin = (inputValue) => {
  const trimmedValue = inputValue.trim();
  const urlValue = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
  const url = new URL(urlValue);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(getOptionsCopy("formInvalidOrigin"));
  }

  return url.origin;
};

const renderSites = () => {
  optionsElements.sitesList.replaceChildren();

  const hasSites = currentSettings.autoStartSites.length > 0;

  optionsElements.sitesEmptyState.hidden = hasSites;
  optionsElements.sitesList.hidden = !hasSites;

  currentSettings.autoStartSites.forEach((site, index) => {
    const item = document.createElement("li");
    const info = document.createElement("span");
    const origin = document.createElement("span");
    const meta = document.createElement("span");
    const removeButton = document.createElement("button");

    item.className = "site-list__item";
    info.className = "site-list__info";
    origin.className = "site-list__origin";
    meta.className = "site-list__meta";
    removeButton.className = "button button--danger";
    removeButton.type = "button";
    removeButton.dataset.removeIndex = String(index);

    origin.textContent = site.origin;
    meta.textContent = replaceOptionsToken("siteMeta", {
      interval: formatMinuteLabel(site.intervalInMinutes)
    });
    removeButton.textContent = getOptionsCopy("removeSite");

    info.append(origin, meta);
    item.append(info, removeButton);
    optionsElements.sitesList.append(item);
  });
};

const syncPreferenceControls = () => {
  const operatingHours = normalizeOperatingHours(currentSettings.operatingHours);
  const isEnabled = operatingHours.enabled;

  currentSettings.operatingHours = operatingHours;
  optionsElements.preserveScrollInput.checked = Boolean(
    currentSettings.preserveScrollPosition
  );
  optionsElements.operatingHoursEnabled.checked = isEnabled;
  optionsElements.operatingStartTime.value = operatingHours.startTime;
  optionsElements.operatingEndTime.value = operatingHours.endTime;
  optionsElements.operatingHoursFields.dataset.enabled = String(isEnabled);

  optionsElements.operatingWeekdays.forEach((weekdayInput) => {
    weekdayInput.checked = operatingHours.weekdays.includes(
      Number(weekdayInput.value)
    );
    weekdayInput.disabled = !isEnabled;
  });

  optionsElements.operatingStartTime.disabled = !isEnabled;
  optionsElements.operatingEndTime.disabled = !isEnabled;
};

const savePreferenceSettings = async () => {
  currentSettings.preserveScrollPosition =
    optionsElements.preserveScrollInput.checked;
  currentSettings.operatingHours = normalizeOperatingHours({
    enabled: optionsElements.operatingHoursEnabled.checked,
    endTime: optionsElements.operatingEndTime.value,
    startTime: optionsElements.operatingStartTime.value,
    weekdays: [...optionsElements.operatingWeekdays]
      .filter((weekdayInput) => weekdayInput.checked)
      .map((weekdayInput) => Number(weekdayInput.value))
  });

  await saveOptionsSettings();
  syncPreferenceControls();
  updateOptionsStatus(getOptionsCopy("formSettingsSaved"), "success");
};

const loadOptionsSettings = async () => {
  currentSettings = await getStoredOptionsSettings();
  optionsElements.defaultIntervalInput.value = currentSettings.defaultIntervalInMinutes;
  syncPreferenceControls();
  renderSites();
};

const saveDefaultInterval = async () => {
  const defaultInterval = Number(optionsElements.defaultIntervalInput.value);

  if (!Number.isFinite(defaultInterval) || defaultInterval < 1) {
    updateOptionsStatus(
      getOptionsCopy("formInvalidInterval"),
      "error"
    );
    return;
  }

  currentSettings.defaultIntervalInMinutes = Math.floor(defaultInterval);
  await saveOptionsSettings();
  updateOptionsStatus(getOptionsCopy("formSettingsSaved"), "success");
};

const addAutoStartSite = async () => {
  try {
    updateSiteFormAlert();

    const origin = normalizeSiteOrigin(optionsElements.siteOriginInput.value);
    const isDuplicateSite = currentSettings.autoStartSites.some(
      (site) => site.origin === origin
    );

    if (isDuplicateSite) {
      updateSiteFormAlert(getOptionsCopy("formSiteDuplicate"));
      optionsElements.siteOriginInput.focus();
      optionsElements.siteOriginInput.select();
      return;
    }

    const hasPermission = await requestAutoStartPermission(origin);

    if (!hasPermission) {
      updateOptionsStatus(
        getOptionsCopy("formPermissionDenied"),
        "error"
      );
      return;
    }

    const rawInterval = Number(optionsElements.siteIntervalInput.value);
    const intervalInMinutes = Number.isFinite(rawInterval) && rawInterval >= 1
      ? Math.floor(rawInterval)
      : currentSettings.defaultIntervalInMinutes;

    currentSettings.autoStartSites = currentSettings.autoStartSites
      .filter((site) => site.origin !== origin);
    currentSettings.autoStartSites.push({
      enabled: true,
      intervalInMinutes,
      origin
    });

    await saveOptionsSettings();
    renderSites();

    chrome.runtime.sendMessage({
      type: runtimeMessageTypes.autoStartTimerForOrigin,
      payload: { origin }
    }).catch(() => undefined);

    optionsElements.siteOriginInput.value = "";
    optionsElements.siteIntervalInput.value = "";
    updateOptionsStatus(getOptionsCopy("formSiteSaved"), "success");
  } catch (error) {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSiteAddError"),
      "error"
    );
  }
};

const removeAutoStartSite = async (index) => {
  const removedSite = currentSettings.autoStartSites[index];

  currentSettings.autoStartSites.splice(index, 1);
  await saveOptionsSettings();

  if (removedSite?.origin) {
    await removeAutoStartPermissionIfUnused(removedSite.origin);

    chrome.runtime.sendMessage({
      type: runtimeMessageTypes.stopTimersForOrigin,
      payload: { origin: removedSite.origin }
    }).catch(() => undefined);
  }

  renderSites();
  updateOptionsStatus(getOptionsCopy("formSiteRemoved"), "success");
};

const updateOptionsThemeButtonLabel = ({ isDarkTheme }) => {
  const nextThemeLabel = isDarkTheme
    ? getOptionsCopy("themeToLight")
    : getOptionsCopy("themeToDark");

  optionsElements.themeToggleButton.setAttribute("aria-pressed", String(isDarkTheme));
  optionsElements.themeToggleButton.setAttribute("aria-label", nextThemeLabel);
  optionsElements.themeToggleButton.title = nextThemeLabel;

  if (optionsElements.themeToggleLabel) {
    optionsElements.themeToggleLabel.textContent = isDarkTheme
      ? getOptionsCopy("themeLight")
      : getOptionsCopy("themeDark");
  }
};

const loadOptionsTheme = async () => {
  await loadThemePreference({
    onChange: updateOptionsThemeButtonLabel
  });
  watchSystemTheme({ onChange: updateOptionsThemeButtonLabel });
};

const toggleOptionsTheme = async () => {
  await toggleThemePreference({
    onChange: updateOptionsThemeButtonLabel
  });
};

const loadOptionsVersion = () => {
  if (typeof chrome === "undefined" || !chrome.runtime?.getManifest) {
    return;
  }

  const manifest = chrome.runtime.getManifest();

  optionsElements.extensionVersion.textContent = manifest.version_name
    || manifest.version;
};

const applyOptionsLanguage = (language) => {
  activeOptionsLanguage = optionsTranslations[language]
    ? language
    : defaultLanguage;
  document.title = getOptionsCopy("documentTitle");

  setText("#close-options-button span", "headerExit");
  setText("#options-title", "pageTitle");
  setText(".brand__subtitle", "pageDescription");
  setText("#general-section .settings-section__eyebrow", "preferencesEyebrow");
  setText("#general-title", "defaultTimeLabel");
  setText("#general-section .settings-section__description", "timeDescription");
  setText(".inline-row .field__label", "defaultIntervalInputLabel");
  setText("#save-settings-button", "saveDefaultInterval");
  setText("#preserve-scroll-title", "preserveScrollTitle");
  setText("#preserve-scroll-description", "preserveScrollDescription");
  setText("#operating-hours-title", "operatingTitle");
  setText("#operating-hours-description", "operatingDescription");
  setText("#operating-days-label", "operatingDays");
  setText("#operating-start-label", "operatingStart");
  setText("#operating-end-label", "operatingEnd");

  const weekdayShorts = getOptionsCopy("weekdayShorts");

  if (Array.isArray(weekdayShorts)) {
    document.querySelectorAll(".weekday-picker label span")
      .forEach((weekdayLabel, index) => {
        weekdayLabel.textContent = weekdayShorts[index] || weekdayLabel.textContent;
      });
  }
  setText("#sites-title", "sitesTitle");
  setText("#sites-section .settings-section__eyebrow", "autoStartEyebrow");
  setText("#sites-section .settings-section__description", "autoStartDescription");
  setText("#site-origin-label", "siteAddressLabel");
  setText("#site-interval-label", "siteIntervalLabel");
  setText("#add-site-button", "addSite");
  setText(".empty-state strong", "emptySitesTitle");
  setText(".empty-state div span", "emptySitesDescription");
  setText("#backup-section .settings-section__eyebrow", "backupEyebrow");
  setText("#backup-title", "backupTitle");
  setText("#backup-section .settings-section__description", "backupDescription");
  setText("#export-settings-label", "backupExport");
  setText("#export-settings-description", "backupExportDescription");
  setText("#import-settings-label", "backupImport");
  setText("#import-settings-description", "backupImportDescription");
  setText(".backup-note span", "backupNoteWithHistory");
  setText("#history-section .settings-section__eyebrow", "historyEyebrow");
  setText("#history-title", "historyTitle");
  setText("#history-section .settings-section__description", "historyDescription");
  setText("#clear-history-button", isHistoryClearPending
    ? "historyClearConfirm"
    : "historyClear");
  setTexts(".history-filter", [
    "historyFilterAll",
    "historyFilterRefreshes",
    "historyFilterTimers"
  ]);
  setText(".history-empty-state strong", "historyEmptyTitle");
  setText(".history-empty-state div span", "historyEmptyDescription");
  setText("#show-more-history-button", "historyShowMore");
  setText("#collapse-history-button", "historyCollapse");
  setText(".history-note", "historyLimitNote");
  setText("#permissions-title", "permissionsTitle");
  setText("#permissions-section .settings-section__eyebrow", "transparencyEyebrow");
  setText("#permissions-section .settings-section__description", "permissionsDescription");
  setTexts(".permission-item strong", [
    "currentPageTitle",
    "cleanupTitle",
    "authorizedSitesTitle",
    "localPreferencesTitle"
  ]);
  setTexts(".permission-item p", [
    "currentPageDescription",
    "cleanupDescription",
    "authorizedSitesDescription",
    "localPreferencesDescription"
  ]);
  setTexts(".privacy-footer__nav a", [
    "footerHome",
    "footerPrivacy",
    "footerFeedback"
  ]);
  setText(".privacy-footer__developer a", "footerDeveloper");
  setText("#language-dialog-title", "languageDialogTitle");
  setText(".language-dialog__description", "languageDialogDescription");

  optionsElements.siteIntervalInput.placeholder = getOptionsCopy(
    "defaultIntervalPlaceholder"
  );

  setAttribute(".permissions-grid", "aria-label", "permissionsGridLabel");
  setAttribute("#sites-list", "aria-label", "siteListLabel");
  setAttribute("#history-list", "aria-label", "historyTitle");
  setAttribute(".history-toolbar", "aria-label", "historyFilterLabel");
  setAttribute(".privacy-footer__nav", "aria-label", "linksLabel");
  setAttribute(".privacy-footer__social", "aria-label", "contactChannelsLabel");
  setAttribute(".language-grid", "aria-label", "languageGridLabel");
  setAttribute("#open-language-button", "aria-label", "languageLabel");
  setAttribute("#back-to-top-button", "aria-label", "backToTop");
  setAttribute("#close-language-button", "aria-label", "closeDialog");

  renderSites();
  renderActionHistory();
  updateOptionsThemeButtonLabel({
    isDarkTheme: document.documentElement.dataset.theme === "dark"
  });
};

const handleOptionsLanguageChange = async (language) => {
  const { translations } = await loadPageI18n("options", language);

  optionsTranslations = translations;
  activeOptionsLanguage = normalizeLanguage(language);

  applyOptionsLanguage(activeOptionsLanguage);

  saveLanguagePreference({
    language
  }).catch((error) => {
    console.error("Erro ao salvar idioma do RecarregaAi:", error);
  });
};

const initializeOptionsLanguageDialog = async () => {
  const storedLanguage = await loadLanguagePreference({
    fallbackLanguage: (
      localStorage.getItem(optionsPageLanguageStorageKey)
      || document.documentElement.lang
    )
  });

  localStorage.setItem(optionsPageLanguageStorageKey, storedLanguage);

  const { translations } = await loadPageI18n("options", storedLanguage);

  optionsTranslations = translations;
  activeOptionsLanguage = normalizeLanguage(storedLanguage);

  optionsLanguageDialog = initLanguageDialog({
    onChange: handleOptionsLanguageChange,
    storageKey: optionsPageLanguageStorageKey
  });

  applyOptionsLanguage(activeOptionsLanguage);
};

optionsElements.saveSettingsButton.addEventListener("click", () => {
  saveDefaultInterval().catch((error) => {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSettingsError"),
      "error"
    );
  });
});

const handlePreferenceChange = () => {
  savePreferenceSettings().catch((error) => {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSettingsError"),
      "error"
    );
  });
};

optionsElements.preserveScrollInput.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingHoursEnabled.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingStartTime.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingEndTime.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingWeekdays.forEach((weekdayInput) => {
  weekdayInput.addEventListener("change", handlePreferenceChange);
});

optionsElements.addSiteButton.addEventListener("click", () => {
  addAutoStartSite().catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formSiteSaveError"), "error");
  });
});

optionsElements.sitesList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-index]");

  if (!removeButton) {
    return;
  }

  removeAutoStartSite(Number(removeButton.dataset.removeIndex)).catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formSiteRemoveError"), "error");
  });
});

optionsElements.exportSettingsButton.addEventListener("click", () => {
  try {
    exportOptionsSettings();
  } catch (error) {
    updateOptionsStatus(error.message || getOptionsCopy("formExportError"), "error");
  }
});

optionsElements.importSettingsButton.addEventListener("click", () => {
  optionsElements.importSettingsInput.click();
});

optionsElements.importSettingsInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];

  importOptionsSettingsFromFile(file).catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formImportError"), "error");
  }).finally(() => {
    event.target.value = "";
  });
});

optionsElements.themeToggleButton.addEventListener("click", () => {
  toggleOptionsTheme().catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formThemeError"), "error");
  });
});

optionsElements.closeOptionsButton.addEventListener("click", () => {
  closeOptionsPage();
});

optionsElements.siteOriginInput.addEventListener("input", () => {
  updateSiteFormAlert();
});

optionsElements.historyFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeHistoryFilter = button.dataset.historyFilter;
    visibleHistoryLimit = historyPageSize;

    optionsElements.historyFilterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;

      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });

    renderActionHistory();
  });
});

optionsElements.showMoreHistoryButton.addEventListener("click", () => {
  visibleHistoryLimit += historyPageSize;
  renderActionHistory();
});

optionsElements.collapseHistoryButton.addEventListener("click", () => {
  visibleHistoryLimit = historyPageSize;
  renderActionHistory();
});

optionsElements.clearHistoryButton.addEventListener("click", () => {
  clearStoredActionHistory().catch((error) => {
    resetHistoryClearConfirmation();
    updateOptionsStatus(error.message || getOptionsCopy("formSettingsError"), "error");
  });
});

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    const historyChange = changes[storageKeys.actionHistory];

    if (areaName !== "local" || !historyChange) {
      return;
    }

    currentActionHistory = Array.isArray(historyChange.newValue)
      ? historyChange.newValue
      : [];
    renderActionHistory();
  });
}

initFloatingTools();
initializeOptionsLanguageDialog().catch((error) => {
  console.error("Erro ao carregar idioma do RecarregaAi:", error);
  applyOptionsLanguage(defaultLanguage);
});

loadOptionsVersion();
loadOptionsTheme().catch((error) => {
  updateOptionsStatus(error.message || "Erro ao carregar tema.", "error");
});
loadOptionsSettings().catch((error) => {
  updateOptionsStatus(
    error.message || "Erro ao carregar configurações.",
    "error"
  );
});
loadActionHistory().catch((error) => {
  updateOptionsStatus(
    error.message || getOptionsCopy("formSettingsLoadError"),
    "error"
  );
});

const initTabNavigation = () => {
  const navButtons = document.querySelectorAll("[data-nav-section]");
  const sections = document.querySelectorAll(".settings-section");

  if (navButtons.length === 0 || sections.length === 0) {
    return;
  }

  const showSection = (targetId) => {
    sections.forEach((section) => {
      section.hidden = section.id !== targetId;
    });

    navButtons.forEach((button) => {
      const isActive = button.dataset.navSection === targetId;
      button.classList.toggle("is-active", isActive);
    });
  };

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.navSection);
    });
  });

  showSection(navButtons[0].dataset.navSection);
};

initTabNavigation();
