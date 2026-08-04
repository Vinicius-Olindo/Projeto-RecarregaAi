// RecarregaAi! 2.3.9

import { mediaKinds } from "./shared.js";

const hasEditableFocusInFrame = () => {
  const editableInputTypes = new Set([
    "email",
    "number",
    "search",
    "tel",
    "text",
    "url"
  ]);
  const activeElement = document.activeElement;

  if (!activeElement) {
    return false;
  }

  if (activeElement.isContentEditable) {
    return true;
  }

  if (activeElement.tagName === "TEXTAREA") {
    return !activeElement.disabled && !activeElement.readOnly;
  }

  if (activeElement.tagName !== "INPUT") {
    return false;
  }

  return !activeElement.disabled
    && !activeElement.readOnly
    && editableInputTypes.has(activeElement.type);
};

export const isTabEditingText = async (tabId) => {
  if (typeof tabId !== "number") {
    return false;
  }

  try {
    const frameResults = await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: hasEditableFocusInFrame
    });

    return frameResults.some((frameResult) => Boolean(frameResult.result));
  } catch (error) {
    console.warn("Nao foi possivel verificar digitacao na guia:", error);
    return false;
  }
};

const getActiveMediaOrImageKindInFrame = () => {
  const activeMediaElements = Array.from(
    document.querySelectorAll("audio, video")
  ).filter((element) => (
    !element.paused && !element.ended && element.readyState > 0
  ));

  if (activeMediaElements.some((element) => element.tagName === "VIDEO")) {
    return "video";
  }

  if (activeMediaElements.length > 0) {
    return "audio";
  }

  if (document.visibilityState !== "visible") {
    return null;
  }

  const imageViewerSelector = [
    "dialog[open]",
    "[aria-modal='true']:not([aria-hidden='true'])",
    "[class*='lightbox' i]",
    "[class*='image-viewer' i]",
    "[class*='photo-viewer' i]",
    "[data-testid*='image-viewer' i]",
    "[data-testid*='lightbox' i]"
  ].join(",");
  const isElementVisible = (element) => {
    if (!(element instanceof Element)) {
      return false;
    }

    const styles = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();

    return styles.display !== "none"
      && styles.visibility !== "hidden"
      && Number(styles.opacity) > 0
      && bounds.bottom > 0
      && bounds.right > 0
      && bounds.top < window.innerHeight
      && bounds.left < window.innerWidth;
  };
  const isLargeVisibleImage = (image) => {
    if (!(image instanceof HTMLImageElement) || !isElementVisible(image)) {
      return false;
    }

    const bounds = image.getBoundingClientRect();
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const visibleWidth = Math.max(
      0,
      Math.min(bounds.right, viewportWidth) - Math.max(bounds.left, 0)
    );
    const visibleHeight = Math.max(
      0,
      Math.min(bounds.bottom, viewportHeight) - Math.max(bounds.top, 0)
    );

    return visibleWidth >= Math.min(220, viewportWidth * 0.35)
      && visibleHeight >= Math.min(160, viewportHeight * 0.25)
      && visibleWidth * visibleHeight >= viewportWidth * viewportHeight * 0.08;
  };
  const hasStandaloneImage = document.contentType
    ?.toLowerCase()
    .startsWith("image/");
  const fullscreenElement = document.fullscreenElement;
  const hasFullscreenImage = Boolean(
    fullscreenElement
    && (
      fullscreenElement instanceof HTMLImageElement
      || fullscreenElement.querySelector("img")
    )
  );
  const hasImageViewer = Array.from(
    document.querySelectorAll(imageViewerSelector)
  ).some((viewer) => (
    isElementVisible(viewer)
    && Array.from(viewer.querySelectorAll("img")).some(isLargeVisibleImage)
  ));
  const hasFixedImageOverlay = Array.from(document.images).some((image) => {
    if (!isLargeVisibleImage(image)) {
      return false;
    }

    let container = image;

    while (container && container !== document.body) {
      if (window.getComputedStyle(container).position === "fixed") {
        const bounds = container.getBoundingClientRect();

        return bounds.width * bounds.height
          >= window.innerWidth * window.innerHeight * 0.35;
      }

      container = container.parentElement;
    }

    return false;
  });

  return hasStandaloneImage
    || hasFullscreenImage
    || hasImageViewer
    || hasFixedImageOverlay
    ? "image"
    : null;
};

const getRecordingMediaKindInFrame = () => (
  window.__recarregaAiMainWorldMediaState?.isRecording ? "recording" : null
);

export const getTabMediaActivity = async (tabId) => {
  if (typeof tabId !== "number") {
    return {
      isMediaActive: false,
      mediaKind: null
    };
  }

  let tab;

  try {
    tab = await chrome.tabs.get(tabId);
  } catch (error) {
    console.warn("Nao foi possivel verificar midia ativa na guia:", error);
    return {
      isMediaActive: false,
      mediaKind: null
    };
  }

  try {
    const recordingFrameResults = await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: getRecordingMediaKindInFrame,
      world: "MAIN"
    });

    if (recordingFrameResults.some((frameResult) => (
      frameResult.result === mediaKinds.recording
    ))) {
      return {
        isMediaActive: true,
        mediaKind: mediaKinds.recording
      };
    }
  } catch (error) {
    console.warn("Nao foi possivel verificar gravacao ativa na guia:", error);
  }

  try {
    const mediaImageFrameResults = await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: getActiveMediaOrImageKindInFrame
    });
    const activeKinds = mediaImageFrameResults
      .map((frameResult) => frameResult.result)
      .filter(Boolean);

    if (activeKinds.includes(mediaKinds.video)) {
      return {
        isMediaActive: true,
        mediaKind: mediaKinds.video
      };
    }

    if (activeKinds.includes(mediaKinds.audio)) {
      return {
        isMediaActive: true,
        mediaKind: mediaKinds.audio
      };
    }

    if (activeKinds.includes(mediaKinds.image)) {
      return {
        isMediaActive: true,
        mediaKind: mediaKinds.image
      };
    }
  } catch (error) {
    console.warn("Nao foi possivel verificar midia ativa na guia:", error);
  }

  if (tab?.audible) {
    return {
      isMediaActive: true,
      mediaKind: mediaKinds.audio
    };
  }

  return {
    isMediaActive: false,
    mediaKind: null
  };
};

export const injectTypingProtection = async (tabId) => {
  if (typeof tabId !== "number") {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      files: ["js/content.js"]
    });
  } catch (error) {
    console.warn("Nao foi possivel ativar protecoes da pagina:", error);
  }

  try {
    await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      files: ["js/page-media-guard.js"],
      world: "MAIN"
    });
  } catch (error) {
    console.warn("Nao foi possivel ativar protecao de midia:", error);
  }
};
