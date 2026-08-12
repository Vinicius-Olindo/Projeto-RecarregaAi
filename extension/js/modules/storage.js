// RecarregaAi! 2.5.0

import {
  createEmptyTimerCollection,
  defaultAppSettings,
  normalizeOperatingHours,
  normalizeTimerCollection,
  normalizeTimerSettings,
  storageKeys
} from "./shared.js";

const getTimerStorageKey = (tabId) => (
  `${storageKeys.timerSettingsPrefix}${tabId}`
);

const isTimerStorageKey = (storageKey) => (
  storageKey.startsWith(storageKeys.timerSettingsPrefix)
);

const browserSessionStorageKey = "recarregaAiBrowserSessionId";

const createBrowserSessionId = () => (
  typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export const getBrowserSessionId = async () => {
  if (!chrome.storage.session) {
    return null;
  }

  const storedData = await chrome.storage.session.get(
    browserSessionStorageKey
  );
  const storedSessionId = storedData[browserSessionStorageKey];

  if (typeof storedSessionId === "string" && storedSessionId) {
    return storedSessionId;
  }

  const browserSessionId = createBrowserSessionId();

  await chrome.storage.session.set({
    [browserSessionStorageKey]: browserSessionId
  });

  return browserSessionId;
};

const getTimerCollectionFromStoredData = (storedData) => {
  const timerCollection = normalizeTimerCollection(
    storedData[storageKeys.timerSettings]
  );

  Object.entries(storedData).forEach(([storageKey, storedTimerSettings]) => {
    if (!isTimerStorageKey(storageKey)) {
      return;
    }

    const timerSettings = normalizeTimerSettings(storedTimerSettings);

    if (!timerSettings) {
      return;
    }

    timerCollection.timers[String(timerSettings.tabId)] = timerSettings;
  });

  return timerCollection;
};

export const getTimerSettingsFromCollection = (timerCollection, tabId) => {
  if (typeof tabId !== "number") {
    return null;
  }

  return timerCollection.timers[String(tabId)] || null;
};

export const getAllTimerSettingsFromCollection = (timerCollection) => (
  Object.values(timerCollection.timers)
    .sort((firstTimer, secondTimer) => (
      String(firstTimer.tabTitle || firstTimer.mainOrigin)
        .localeCompare(String(secondTimer.tabTitle || secondTimer.mainOrigin))
    ))
);

export const getStoredTimerCollection = async () => {
  const storedData = await chrome.storage.local.get(null);

  return getTimerCollectionFromStoredData(storedData);
};

export const saveTimerCollection = async (timerCollection) => {
  const normalizedCollection = normalizeTimerCollection(timerCollection);
  const storedData = await chrome.storage.local.get(null);
  const existingTimerKeys = Object.keys(storedData).filter(isTimerStorageKey);
  const nextTimerKeys = Object.keys(normalizedCollection.timers)
    .map(getTimerStorageKey);
  const timerKeysToRemove = existingTimerKeys.filter((storageKey) => (
    !nextTimerKeys.includes(storageKey)
  ));
  const storageData = Object.fromEntries(
    Object.values(normalizedCollection.timers).map((timerSettings) => [
      getTimerStorageKey(timerSettings.tabId),
      timerSettings
    ])
  );

  await chrome.storage.local.remove([
    storageKeys.timerSettings,
    ...timerKeysToRemove
  ]);

  if (Object.keys(storageData).length > 0) {
    await chrome.storage.local.set(storageData);
  }

  return normalizedCollection;
};

export const getStoredTimerSettingsByTabId = async (tabId) => {
  const timerKey = getTimerStorageKey(tabId);
  const storedData = await chrome.storage.local.get([
    timerKey,
    storageKeys.timerSettings
  ]);
  const timerSettings = normalizeTimerSettings(storedData[timerKey]);

  if (timerSettings) {
    return timerSettings;
  }

  return getTimerSettingsFromCollection(
    normalizeTimerCollection(storedData[storageKeys.timerSettings]),
    tabId
  );
};

export const saveTimerSettingsByTabId = async (timerSettings) => {
  const normalizedTimerSettings = normalizeTimerSettings(timerSettings);

  if (!normalizedTimerSettings) {
    return createEmptyTimerCollection();
  }

  await chrome.storage.local.set({
    [getTimerStorageKey(normalizedTimerSettings.tabId)]: normalizedTimerSettings
  });

  return getStoredTimerCollection();
};

export const getAllTimerSettings = async () => {
  const timerCollection = await getStoredTimerCollection();

  return getAllTimerSettingsFromCollection(timerCollection);
};

export const getTimerSettingsByTabId = async (tabId) => {
  return getStoredTimerSettingsByTabId(tabId);
};

export const upsertTimerSettings = async (timerSettings) => {
  return saveTimerSettingsByTabId(timerSettings);
};

export const removeTimerSettingsByTabId = async (tabId) => {
  const timerCollection = await getStoredTimerCollection();
  const storedData = await chrome.storage.local.get(storageKeys.timerSettings);

  delete timerCollection.timers[String(tabId)];
  await chrome.storage.local.remove(getTimerStorageKey(tabId));

  if (storedData[storageKeys.timerSettings]) {
    return saveTimerCollection(timerCollection);
  }

  return getStoredTimerCollection();
};

export const updateTimerSettingsByTabId = async (tabId, updater) => {
  const timerSettings = await getStoredTimerSettingsByTabId(tabId);

  if (!timerSettings) {
    return null;
  }

  const updatedTimerSettings = updater(timerSettings);

  await saveTimerSettingsByTabId(updatedTimerSettings);

  return updatedTimerSettings;
};

export const getLastTimerRun = async () => {
  const storedData = await chrome.storage.local.get(storageKeys.lastTimerRun);

  return storedData[storageKeys.lastTimerRun];
};

export const saveLastTimerRun = async (result) => {
  await chrome.storage.local.set({
    [storageKeys.lastTimerRun]: result
  });
};

export const getAppSettings = async () => {
  const storedData = await chrome.storage.local.get(storageKeys.appSettings);
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

export const getGlobalPause = async () => {
  const storedData = await chrome.storage.local.get(storageKeys.globalPause);
  const globalPause = storedData[storageKeys.globalPause];
  const endsAt = new Date(globalPause?.endsAt).getTime();

  if (!Number.isFinite(endsAt)) {
    return null;
  }

  return {
    endsAt: new Date(endsAt).toISOString(),
    startedAt: globalPause.startedAt || null
  };
};

export const saveGlobalPause = async (globalPause) => {
  await chrome.storage.local.set({
    [storageKeys.globalPause]: globalPause
  });

  return globalPause;
};

export const clearGlobalPause = async () => {
  await chrome.storage.local.remove(storageKeys.globalPause);
};
