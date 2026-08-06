// RecarregaAi! 2.4.0

import { cacheDataTypes } from "./shared.js";

export const clearCacheForOrigins = async (origins) => {
  await chrome.browsingData.remove(
    {
      origins
    },
    cacheDataTypes
  );
};

export const reloadTabIgnoringCache = async (tabId) => {
  await chrome.tabs.reload(tabId, {
    bypassCache: true
  });
};
