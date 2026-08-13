// RecarregaAi! 2.5.0 — Modo debug

import { storageKeys } from "./shared.js";

let debugEnabled = false;

export const isDebugMode = () => debugEnabled;

export const setDebugMode = async (enabled) => {
  debugEnabled = Boolean(enabled);

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({
      [storageKeys.debugMode]: debugEnabled
    });
  }
};

export const loadDebugMode = async () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return false;
  }

  const storedData = await chrome.storage.local.get(storageKeys.debugMode);
  debugEnabled = Boolean(storedData[storageKeys.debugMode]);
  return debugEnabled;
};

export const debugLog = (...args) => {
  if (!debugEnabled) {
    return;
  }

  console.log(
    "%c[RecarregaAi Debug]",
    "color: #3b82f6; font-weight: bold;",
    ...args
  );
};

export const debugWarn = (...args) => {
  if (!debugEnabled) {
    return;
  }

  console.warn(
    "%c[RecarregaAi Debug]",
    "color: #d97706; font-weight: bold;",
    ...args
  );
};

export const debugError = (...args) => {
  if (!debugEnabled) {
    return;
  }

  console.error(
    "%c[RecarregaAi Debug]",
    "color: #dc2626; font-weight: bold;",
    ...args
  );
};

export const debugGroup = (label) => {
  if (!debugEnabled) {
    return { log: () => {}, end: () => {} };
  }

  console.group(
    `%c[RecarregaAi Debug] ${label}`,
    "color: #3b82f6; font-weight: bold;"
  );

  return {
    log: (...args) => console.log(...args),
    end: () => console.groupEnd()
  };
};
