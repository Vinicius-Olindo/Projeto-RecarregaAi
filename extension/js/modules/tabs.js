// RecarregaAi! 2.4.0

import {
  collectFrameOrigins,
  normalizeOrigins
} from "./shared.js";

export const collectLoadedOrigins = async (tabId, fallbackOrigins = []) => {
  const origins = new Set(fallbackOrigins);

  try {
    const frameResults = await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: collectFrameOrigins
    });

    frameResults.forEach((frameResult) => {
      if (!Array.isArray(frameResult.result)) {
        return;
      }

      frameResult.result.forEach((origin) => {
        origins.add(origin);
      });
    });
  } catch (error) {
    console.warn("Nao foi possivel coletar todas as origens:", error);
  }

  return normalizeOrigins(Array.from(origins));
};
