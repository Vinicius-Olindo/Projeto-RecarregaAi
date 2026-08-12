// RecarregaAi! 2.5.0

(() => {
  const watcherFlag = "__recarregaAiPageSafetyWatcherLoaded";
  const watcherVersion = 3;
  const mediaMessageType = "RECARREGA_AI_MEDIA_STATE";
  const pageMediaGuardMessageType = "RECARREGA_AI_PAGE_MEDIA_STATE";
  const pageMediaGuardSource = "RECARREGA_AI_PAGE_MEDIA_GUARD_V3";
  const typingMessageType = "RECARREGA_AI_TYPING_STATE";
  const blurCheckDelay = 120;
  const mediaSyncDelay = 120;
  const mediaEvents = [
    "abort",
    "emptied",
    "ended",
    "loadeddata",
    "pause",
    "play",
    "playing",
    "stalled",
    "suspend",
    "waiting"
  ];
  const imageViewerSelector = [
    "dialog[open]",
    "[aria-modal='true']:not([aria-hidden='true'])",
    "[class*='lightbox' i]",
    "[class*='image-viewer' i]",
    "[class*='photo-viewer' i]",
    "[data-testid*='image-viewer' i]",
    "[data-testid*='lightbox' i]"
  ].join(",");
  const editableInputTypes = new Set([
    "email",
    "number",
    "search",
    "tel",
    "text",
    "url"
  ]);

  if (window[watcherFlag] === watcherVersion) {
    return;
  }

  if (typeof Element === "undefined" || typeof HTMLElement === "undefined") {
    return;
  }

  window[watcherFlag] = watcherVersion;

  let isTyping = false;
  let isMediaActive = false;
  let activeMediaKind = null;
  let pageMediaKind = null;
  let mediaSyncTimerId = null;
  const observedMediaElements = new WeakSet();

  const isEditableElement = (element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (element.isContentEditable) {
      return true;
    }

    if (element.tagName === "TEXTAREA") {
      return !element.disabled && !element.readOnly;
    }

    if (element.tagName !== "INPUT") {
      return false;
    }

    return !element.disabled
      && !element.readOnly
      && editableInputTypes.has(element.type);
  };

  const getEditableTarget = (target) => {
    if (!(target instanceof Element)) {
      return null;
    }

    const editableTarget = target.closest("input, textarea, [contenteditable]");

    return isEditableElement(editableTarget) ? editableTarget : null;
  };

  const isExtensionContextInvalidated = (error) => (
    error?.message?.includes("Extension context invalidated")
  );

  const handleRuntimeMessageResponse = () => {
    try {
      if (chrome.runtime.lastError) {
        return;
      }
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return;
      }

      console.debug("RecarregaAi! ignorou resposta de contexto indisponivel:", error);
    }
  };

  const sendRuntimeMessage = (type, payload) => {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime?.id) {
        return;
      }

      chrome.runtime.sendMessage({
        payload,
        type
      }, handleRuntimeMessageResponse);
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return;
      }

      console.debug("RecarregaAi! nao conseguiu enviar estado local:", error);
    }
  };

  const sendTypingState = (nextIsTyping, { force = false } = {}) => {
    if (!force && isTyping === nextIsTyping) {
      return;
    }

    isTyping = nextIsTyping;

    sendRuntimeMessage(typingMessageType, {
      isTyping: nextIsTyping
    });
  };

  const syncCurrentFocus = ({ force = false } = {}) => {
    sendTypingState(Boolean(getEditableTarget(document.activeElement)), {
      force
    });
  };

  const handleEditableActivity = (event) => {
    if (!getEditableTarget(event.target)) {
      return;
    }

    sendTypingState(true);
  };

  const handleFocusOut = () => {
    window.setTimeout(() => {
      syncCurrentFocus();
    }, blurCheckDelay);
  };

  const getActiveMediaElementKind = () => {
    const activeMediaElements = Array.from(
      document.querySelectorAll("audio, video")
    ).filter((element) => (
      !element.paused && !element.ended && element.readyState > 0
    ));

    if (activeMediaElements.some((element) => element.tagName === "VIDEO")) {
      return "video";
    }

    return activeMediaElements.length > 0 ? "audio" : null;
  };

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
    const minimumWidth = Math.min(220, viewportWidth * 0.35);
    const minimumHeight = Math.min(160, viewportHeight * 0.25);

    return visibleWidth >= minimumWidth
      && visibleHeight >= minimumHeight
      && visibleWidth * visibleHeight >= viewportWidth * viewportHeight * 0.08;
  };

  const hasStandaloneImage = () => (
    document.contentType?.toLowerCase().startsWith("image/")
  );

  const hasFullscreenImage = () => {
    const fullscreenElement = document.fullscreenElement;

    if (!fullscreenElement) {
      return false;
    }

    if (fullscreenElement instanceof HTMLImageElement) {
      return true;
    }

    return Boolean(fullscreenElement.querySelector("img"));
  };

  const hasImageViewer = () => (
    Array.from(document.querySelectorAll(imageViewerSelector)).some(
      (viewer) => (
        isElementVisible(viewer)
        && Array.from(viewer.querySelectorAll("img")).some(isLargeVisibleImage)
      )
    )
  );

  const hasFixedImageOverlay = () => (
    Array.from(document.images).some((image) => {
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
    })
  );

  const getActiveImageViewerKind = () => {
    if (document.visibilityState !== "visible") {
      return null;
    }

    return hasStandaloneImage()
      || hasFullscreenImage()
      || hasImageViewer()
      || hasFixedImageOverlay()
      ? "image"
      : null;
  };

  const getCurrentMediaKind = () => (
    pageMediaKind
    || getActiveMediaElementKind()
    || getActiveImageViewerKind()
  );

  const sendMediaState = (nextMediaKind, { force = false } = {}) => {
    const nextIsMediaActive = Boolean(nextMediaKind);

    if (
      !force
      && isMediaActive === nextIsMediaActive
      && activeMediaKind === nextMediaKind
    ) {
      return;
    }

    isMediaActive = nextIsMediaActive;
    activeMediaKind = nextMediaKind;

    sendRuntimeMessage(mediaMessageType, {
      isMediaActive: nextIsMediaActive,
      mediaKind: nextMediaKind
    });
  };

  const syncMediaState = ({ force = false } = {}) => {
    sendMediaState(getCurrentMediaKind(), {
      force
    });
  };

  const scheduleMediaSync = () => {
    if (mediaSyncTimerId) {
      window.clearTimeout(mediaSyncTimerId);
    }

    mediaSyncTimerId = window.setTimeout(() => {
      mediaSyncTimerId = null;
      syncMediaState();
    }, mediaSyncDelay);
  };

  const observeMediaElement = (element) => {
    if (observedMediaElements.has(element)) {
      return;
    }

    observedMediaElements.add(element);

    mediaEvents.forEach((eventName) => {
      element.addEventListener(eventName, scheduleMediaSync, true);
    });
  };

  const observeMediaElements = () => {
    document.querySelectorAll("audio, video").forEach(observeMediaElement);
  };

  const handlePageMediaGuardMessage = (event) => {
    if (
      event.source !== window
      || event.data?.source !== pageMediaGuardSource
      || event.data?.type !== pageMediaGuardMessageType
    ) {
      return;
    }

    pageMediaKind = event.data.payload?.isMediaActive
      ? event.data.payload.mediaKind || "recording"
      : null;
    syncMediaState();
  };

  const startMediaObserver = () => {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    const observer = new MutationObserver(() => {
      observeMediaElements();
      scheduleMediaSync();
    });

    observer.observe(document.documentElement, {
      attributeFilter: [
        "aria-hidden",
        "aria-modal",
        "class",
        "hidden",
        "open",
        "style"
      ],
      attributes: true,
      childList: true,
      subtree: true
    });
  };

  document.addEventListener("focusin", handleEditableActivity, true);
  document.addEventListener("keydown", handleEditableActivity, true);
  document.addEventListener("input", handleEditableActivity, true);
  document.addEventListener("compositionstart", handleEditableActivity, true);
  document.addEventListener("click", scheduleMediaSync, true);
  document.addEventListener("focusout", handleFocusOut, true);
  document.addEventListener("fullscreenchange", scheduleMediaSync, true);
  document.addEventListener("visibilitychange", scheduleMediaSync, true);
  window.addEventListener("resize", scheduleMediaSync, { passive: true });
  window.addEventListener("message", handlePageMediaGuardMessage);

  observeMediaElements();
  startMediaObserver();
  syncCurrentFocus({
    force: true
  });
  syncMediaState({
    force: true
  });
})();
