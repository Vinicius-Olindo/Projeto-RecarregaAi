// RecarregaAi! 2.3.9

import { storageKeys, themeModes } from "./shared.js";

export const normalizeTheme = (theme) => (
  theme === themeModes.dark ? themeModes.dark : themeModes.light
);

export const getNextTheme = (theme) => (
  normalizeTheme(theme) === themeModes.dark
    ? themeModes.light
    : themeModes.dark
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
  defaultTheme = themeModes.light,
  onChange = null,
  root = document.documentElement,
  storageArea = getChromeLocalStorage()
} = {}) => {
  if (!storageArea) {
    return applyThemePreference({
      onChange,
      root,
      theme: defaultTheme
    });
  }

  const storedData = await storageArea.get(storageKeys.theme);

  return applyThemePreference({
    onChange,
    root,
    theme: storedData[storageKeys.theme] || defaultTheme
  });
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
