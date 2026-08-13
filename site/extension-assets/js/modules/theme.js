// RecarregaAi! 2.5.0

import { storageKeys, themeModes } from "./shared.js";

export const normalizeTheme = (theme) => (
  theme === themeModes.dark ? themeModes.dark : themeModes.light
);

export const getNextTheme = (theme) => (
  normalizeTheme(theme) === themeModes.dark
    ? themeModes.light
    : themeModes.dark
);

export const getSystemTheme = () => (
  typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? themeModes.dark
    : themeModes.light
);

export const getChromeLocalStorage = () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
};

const getUseSystemThemePreference = async (storageArea) => {
  if (!storageArea) {
    return false;
  }

  const storedData = await storageArea.get(storageKeys.appSettings);
  const storedSettings = storedData[storageKeys.appSettings] || {};

  return Boolean(storedSettings.useSystemTheme);
};

const disableSystemThemePreference = async (storageArea) => {
  if (!storageArea) {
    return;
  }

  const storedData = await storageArea.get(storageKeys.appSettings);
  const storedSettings = storedData[storageKeys.appSettings] || {};

  if (!storedSettings.useSystemTheme) {
    return;
  }

  await storageArea.set({
    [storageKeys.appSettings]: {
      ...storedSettings,
      useSystemTheme: false
    }
  });
};

export const applyThemePreference = ({
  onChange = null,
  root = document.documentElement,
  theme
}) => {
  const nextTheme = normalizeTheme(theme);
  const isDarkTheme = nextTheme === themeModes.dark;

  root.dataset.theme = nextTheme;

  if (typeof onChange === "function") {
    onChange({
      isDarkTheme,
      theme: nextTheme
    });
  }

  return nextTheme;
};

export const loadThemePreference = async ({
  defaultTheme = themeModes.light,
  onChange = null,
  root = document.documentElement,
  storageArea = getChromeLocalStorage()
} = {}) => {
  if (!storageArea) {
    return applyThemePreference({ onChange, root, theme: defaultTheme });
  }

  const storedData = await storageArea.get(storageKeys.theme);
  const storedTheme = storedData[storageKeys.theme];

  if (await getUseSystemThemePreference(storageArea)) {
    return applyThemePreference({ onChange, root, theme: getSystemTheme() });
  }

  if (storedTheme) {
    return applyThemePreference({ onChange, root, theme: storedTheme });
  }

  return applyThemePreference({ onChange, root, theme: defaultTheme });
};

export const saveThemePreference = async ({
  disableSystemTheme = true,
  onChange = null,
  root = document.documentElement,
  storageArea = getChromeLocalStorage(),
  theme
}) => {
  const nextTheme = applyThemePreference({
    onChange,
    root,
    theme
  });

  if (storageArea) {
    if (disableSystemTheme) {
      await disableSystemThemePreference(storageArea);
    }

    await storageArea.set({
      [storageKeys.theme]: nextTheme
    });
  }

  return nextTheme;
};

export const toggleThemePreference = async ({
  currentTheme = document.documentElement.dataset.theme,
  onChange = null,
  root = document.documentElement,
  storageArea = getChromeLocalStorage()
} = {}) => (
  saveThemePreference({
    onChange,
    root,
    storageArea,
    theme: getNextTheme(currentTheme)
  })
);

let systemThemeListener = null;

export const watchSystemTheme = ({
  onChange = null,
  root = document.documentElement,
  storageArea = getChromeLocalStorage()
} = {}) => {
  if (systemThemeListener || !storageArea || typeof window.matchMedia !== "function") {
    return;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  systemThemeListener = async () => {
    if (!await getUseSystemThemePreference(storageArea)) {
      return;
    }

    applyThemePreference({
      onChange,
      root,
      theme: getSystemTheme()
    });
  };

  mediaQuery.addEventListener("change", systemThemeListener);
};

export const unwatchSystemTheme = () => {
  if (!systemThemeListener || typeof window.matchMedia !== "function") {
    return;
  }

  window.matchMedia("(prefers-color-scheme: dark)")
    .removeEventListener("change", systemThemeListener);

  systemThemeListener = null;
};
