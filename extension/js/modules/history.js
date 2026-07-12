// RecarregaAi! 2.3.9

import {
  actionHistoryStatuses,
  actionHistoryTypes,
  getUrlOrigin,
  storageKeys
} from "./shared.js";

export const actionHistoryLimit = 100;

const supportedHistoryTypes = new Set(Object.values(actionHistoryTypes));
const supportedHistoryStatuses = new Set(Object.values(actionHistoryStatuses));
let historyWriteQueue = Promise.resolve();

const createHistoryId = () => (
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const normalizeOptionalText = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue.slice(0, 120) : null;
};

const normalizeHistoryEntry = (entry, { allowNewDate = false } = {}) => {
  if (!entry || !supportedHistoryTypes.has(entry.type)) {
    return null;
  }

  const createdAtDate = new Date(entry.createdAt);
  const hasValidDate = Number.isFinite(createdAtDate.getTime());
  const intervalInMinutes = Number(entry.intervalInMinutes);

  if (!hasValidDate && !allowNewDate) {
    return null;
  }

  return {
    createdAt: hasValidDate
      ? createdAtDate.toISOString()
      : new Date().toISOString(),
    detail: normalizeOptionalText(entry.detail),
    id: normalizeOptionalText(entry.id) || createHistoryId(),
    intervalInMinutes: Number.isFinite(intervalInMinutes)
      && intervalInMinutes >= 1
      ? Math.floor(intervalInMinutes)
      : null,
    origin: getUrlOrigin(entry.origin),
    source: normalizeOptionalText(entry.source),
    status: supportedHistoryStatuses.has(entry.status)
      ? entry.status
      : actionHistoryStatuses.info,
    type: entry.type
  };
};

const normalizeHistoryEntries = (entries) => (
  Array.isArray(entries)
    ? entries
      .map((entry) => normalizeHistoryEntry(entry))
      .filter(Boolean)
      .sort((firstEntry, secondEntry) => (
        new Date(secondEntry.createdAt).getTime()
        - new Date(firstEntry.createdAt).getTime()
      ))
      .slice(0, actionHistoryLimit)
    : []
);

const readStoredHistory = async () => {
  const storedData = await chrome.storage.local.get(storageKeys.actionHistory);

  return normalizeHistoryEntries(storedData[storageKeys.actionHistory]);
};

export const appendActionHistory = (entry) => {
  const writeOperation = historyWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const normalizedEntry = normalizeHistoryEntry(entry, {
        allowNewDate: true
      });

      if (!normalizedEntry) {
        return null;
      }

      const storedHistory = await readStoredHistory();
      const nextHistory = [
        normalizedEntry,
        ...storedHistory.filter((storedEntry) => (
          storedEntry.id !== normalizedEntry.id
        ))
      ].slice(0, actionHistoryLimit);

      await chrome.storage.local.set({
        [storageKeys.actionHistory]: nextHistory
      });

      return normalizedEntry;
    });

  historyWriteQueue = writeOperation.then(
    () => undefined,
    () => undefined
  );

  return writeOperation;
};

export const getActionHistory = async () => {
  await historyWriteQueue;

  return readStoredHistory();
};

export const clearActionHistory = async () => {
  await historyWriteQueue;
  await chrome.storage.local.remove(storageKeys.actionHistory);
};
