// RecarregaAi! 2.4.0

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
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? themeModes.dark
    : themeModes.light
);

export const getChromeLocalStorage = () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
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
  defaultTheme = null,
  onChange = null,
  root = document.documentElement,
  storageArea = getChromeLocalStorage()
} = {}) => {
  if (!storageArea) {
    const resolved = defaultTheme || getSystemTheme();
    return applyThemePreference({ onChange, root, theme: resolved });
  }

  const storedData = await storageArea.get(storageKeys.theme);
  const storedTheme = storedData[storageKeys.theme];

  if (storedTheme) {
    return applyThemePreference({ onChange, root, theme: storedTheme });
  }

  const systemTheme = getSystemTheme();
  return applyThemePreference({ onChange, root, theme: systemTheme });
};

export const saveThemePreference = async ({
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
  if (systemThemeListener) {
    return;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  systemThemeListener = async () => {
    if (!storageArea) {
      return;
    }

    const storedData = await storageArea.get(storageKeys.theme);

    if (storedData[storageKeys.theme]) {
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
  if (!systemThemeListener) {
    return;
  }

  window.matchMedia("(prefers-color-scheme: dark)")
    .removeEventListener("change", systemThemeListener);

  systemThemeListener = null;
};
