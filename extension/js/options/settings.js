// RecarregaAi! 2.5.0 — Configurações das opções

import {
  defaultAppSettings,
  maximumTimerIntervalInMinutes,
  minimumTimerIntervalInMinutes,
  normalizeOperatingHours,
  storageKeys
} from "../modules/shared.js";
import { normalizeLanguage } from "../modules/language-dialog.js";
import { normalizeTheme } from "../modules/theme.js";
import { getPermissionPatternForOrigin, getUrlOrigin } from "../modules/shared.js";
import { optionsElements } from "./elements.js";
import { getOptionsCopy } from "./language.js";

const optionsPreviewStorageKey = "recarregaAiOptionsPreviewSettings";
const settingsExportType = "recarregaai-settings";
const settingsExportVersion = 2;
const optionsStatusVisibleMilliseconds = 10000;
const optionsStatusFadeMilliseconds = 240;

let currentSettings = { ...defaultAppSettings };
let optionsStatusHideTimeoutId = null;
let optionsStatusClearTimeoutId = null;

export const getCurrentSettings = () => currentSettings;
export const setCurrentSettings = (settings) => {
  currentSettings = settings;
};

export const getOptionsStorageArea = () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
};

export const getPreviewSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(optionsPreviewStorageKey)) || {};
  } catch {
    return {};
  }
};

export const savePreviewSettings = (settings) => {
  localStorage.setItem(optionsPreviewStorageKey, JSON.stringify(settings));
};

export const updateOptionsStatus = (message, status = "neutral") => {
  window.clearTimeout(optionsStatusHideTimeoutId);
  window.clearTimeout(optionsStatusClearTimeoutId);

  optionsElements.optionsStatus.textContent = message;
  optionsElements.optionsStatus.dataset.status = status;
  optionsElements.optionsStatus.classList.toggle("is-visible", Boolean(message));
  optionsElements.optionsStatus.classList.remove("is-hiding");

  if (!message) {
    return;
  }

  optionsStatusHideTimeoutId = window.setTimeout(() => {
    optionsElements.optionsStatus.classList.add("is-hiding");
    optionsElements.optionsStatus.classList.remove("is-visible");

    optionsStatusClearTimeoutId = window.setTimeout(() => {
      optionsElements.optionsStatus.textContent = "";
      optionsElements.optionsStatus.dataset.status = "neutral";
      optionsElements.optionsStatus.classList.remove("is-hiding");
    }, optionsStatusFadeMilliseconds);
  }, optionsStatusVisibleMilliseconds);
};

export const updateSiteFormAlert = (message = "") => {
  optionsElements.siteFormAlertText.textContent = message;
  optionsElements.siteFormAlert.hidden = !message;
};

export const closeOptionsPage = () => {
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

export const formatMinuteLabel = (minutes) => {
  if (minutes === 1) {
    return getOptionsCopy("minuteSingular");
  }

  return getOptionsCopy("minutePlural").replace("{count}", String(minutes));
};

export const getStoredOptionsSettings = async () => {
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
    advancedCleanupEnabled: Boolean(storedSettings.advancedCleanupEnabled),
    autoStartSites: Array.isArray(storedSettings.autoStartSites)
      ? storedSettings.autoStartSites
      : [],
    operatingHours: normalizeOperatingHours(storedSettings.operatingHours),
    preserveScrollPosition: Boolean(storedSettings.preserveScrollPosition),
    useSystemTheme: Boolean(storedSettings.useSystemTheme)
  };
};

export const saveOptionsSettings = async () => {
  const storageArea = getOptionsStorageArea();

  if (!storageArea) {
    savePreviewSettings(currentSettings);
    return;
  }

  await storageArea.set({
    [storageKeys.appSettings]: currentSettings
  });
};

export const hasOwnProperty = (object, property) => (
  Object.prototype.hasOwnProperty.call(object, property)
);

export const normalizeOptionsInterval = (
  interval,
  fallback = defaultAppSettings.defaultIntervalInMinutes
) => {
  const intervalInMinutes = Number(interval);

  if (
    !Number.isFinite(intervalInMinutes)
    || intervalInMinutes < minimumTimerIntervalInMinutes
    || intervalInMinutes > maximumTimerIntervalInMinutes
  ) {
    return fallback;
  }

  return Math.floor(intervalInMinutes);
};

export const normalizeAutoStartSite = (site, fallbackInterval) => {
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

export const normalizeOptionsSettings = (settings) => {
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
    advancedCleanupEnabled: Boolean(settings.advancedCleanupEnabled),
    autoStartSites: [...siteMap.values()],
    defaultIntervalInMinutes,
    operatingHours: normalizeOperatingHours(settings.operatingHours),
    preserveScrollPosition: Boolean(settings.preserveScrollPosition),
    useSystemTheme: Boolean(settings.useSystemTheme)
  };
};

export const getOptionsVersionLabel = () => {
  if (typeof chrome === "undefined" || !chrome.runtime?.getManifest) {
    return "preview";
  }

  const manifest = chrome.runtime.getManifest();

  return manifest.version_name || manifest.version;
};

export const getCurrentOptionsLanguage = () => (
  normalizeLanguage(
    localStorage.getItem("recarregaAiPageLanguage")
    || document.documentElement.lang
  )
);

export const getCurrentOptionsTheme = () => (
  normalizeTheme(document.documentElement.dataset.theme)
);

export const createSettingsExportPayload = () => ({
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

export const downloadJsonFile = (fileName, payload) => {
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

export const exportOptionsSettings = (updateOptionsStatusFn) => {
  const exportDate = new Date().toISOString().slice(0, 10);
  const fileName = `recarregaai-configuracoes-${exportDate}.json`;

  downloadJsonFile(fileName, createSettingsExportPayload());
  updateOptionsStatusFn(getOptionsCopy("formExported"), "success");
};

export const parseSettingsImportPayload = (fileText) => {
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

export const requestAutoStartPermissions = async (autoStartSites) => {
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

export const removeUnusedAutoStartPermissions = async (
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

export const requestAutoStartPermission = async (origin) => {
  if (typeof chrome === "undefined" || !chrome.permissions?.request) {
    return true;
  }

  const originPattern = getPermissionPatternForOrigin(origin);

  return chrome.permissions.request({
    origins: [originPattern]
  });
};

export const removeAutoStartPermissionIfUnused = async (origin) => {
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

export const normalizeSiteOrigin = (inputValue) => {
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
