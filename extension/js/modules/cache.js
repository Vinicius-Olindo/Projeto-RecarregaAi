// RecarregaAi! 2.5.0

import { getCacheDataTypes } from "./shared.js";

export const clearCacheForOrigins = async (
  origins,
  {
    includeAdvancedCleanup = false
  } = {}
) => {
  await chrome.browsingData.remove(
    {
      origins
    },
    getCacheDataTypes({
      includeAdvancedCleanup
    })
  );
};

export const reloadTabIgnoringCache = async (tabId) => {
  await chrome.tabs.reload(tabId, {
    bypassCache: true
  });
};
