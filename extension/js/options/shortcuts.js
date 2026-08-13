// RecarregaAi! 2.5.0 — Atalhos de teclado

import { getOptionsCopy } from "./language.js";
import { updateOptionsStatus } from "./settings.js";

const shortcutStorageKey = "recarregaAiCustomShortcuts";

let customShortcuts = {
  "start-timer": "Ctrl+Shift+R",
  "pause-all-timers": "Ctrl+Shift+P",
  "resume-all-timers": "Ctrl+Shift+O"
};
let activeShortcutInput = null;

export const loadCustomShortcuts = async () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return;
  }

  const storedData = await chrome.storage.local.get(shortcutStorageKey);
  const stored = storedData[shortcutStorageKey];

  if (stored && typeof stored === "object") {
    customShortcuts = {
      ...customShortcuts,
      ...stored
    };
  }

  updateShortcutInputs();
};

const saveCustomShortcuts = async () => {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({
      [shortcutStorageKey]: customShortcuts
    });
  }
};

const updateShortcutInputs = () => {
  document.querySelectorAll("[data-shortcut]").forEach((input) => {
    const command = input.dataset.shortcut;
    const shortcut = customShortcuts[command];

    if (shortcut) {
      input.value = formatShortcutForDisplay(shortcut);
    }
  });
};

const getIsMacPlatform = () => {
  if (typeof navigator.userAgentData?.platform === "string") {
    return navigator.userAgentData.platform === "macOS";
  }

  return navigator.platform?.includes("Mac") ?? false;
};

const formatShortcutForDisplay = (shortcut) => {
  if (!shortcut) {
    return "";
  }

  const isMac = getIsMacPlatform();

  return shortcut
    .replace(/\+/g, " + ")
    .replace(/Ctrl/g, isMac ? "⌘" : "Ctrl")
    .replace(/Shift/g, isMac ? "⇧" : "Shift")
    .replace(/Alt/g, isMac ? "⌥" : "Alt");
};

const startShortcutRecording = (input) => {
  if (activeShortcutInput) {
    cancelShortcutRecording();
  }

  activeShortcutInput = input;
  input.dataset.recording = "true";
  input.value = getOptionsCopy("shortcutRecording");
  input.placeholder = "";
};

const cancelShortcutRecording = () => {
  if (!activeShortcutInput) {
    return;
  }

  activeShortcutInput.dataset.recording = "false";
  activeShortcutInput = null;
  updateShortcutInputs();
};

const handleShortcutKeydown = (event) => {
  if (!activeShortcutInput) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Escape") {
    cancelShortcutRecording();
    return;
  }

  if (event.key === "Control" || event.key === "Shift" || event.key === "Alt" || event.key === "Meta") {
    return;
  }

  const parts = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push("Ctrl");
  }

  if (event.shiftKey) {
    parts.push("Shift");
  }

  if (event.altKey) {
    parts.push("Alt");
  }

  const key = event.key.toUpperCase();

  if (["CONTROL", "SHIFT", "ALT", "META"].includes(key)) {
    return;
  }

  parts.push(key);
  const shortcut = parts.join("+");
  const command = activeShortcutInput.dataset.shortcut;

  const conflict = Object.entries(customShortcuts).find(
    ([cmd, existing]) => cmd !== command && existing === shortcut
  );

  if (conflict) {
    updateOptionsStatus(getOptionsCopy("shortcutConflict"), "error");
    cancelShortcutRecording();
    return;
  }

  customShortcuts[command] = shortcut;
  saveCustomShortcuts();
  cancelShortcutRecording();
  updateOptionsStatus(getOptionsCopy("shortcutSaved"), "success");
};

export const initShortcuts = () => {
  document.addEventListener("keydown", handleShortcutKeydown);

  document.querySelectorAll("[data-shortcut]").forEach((input) => {
    input.addEventListener("click", () => {
      if (activeShortcutInput === input) {
        cancelShortcutRecording();
      } else {
        startShortcutRecording(input);
      }
    });
  });

  loadCustomShortcuts();
};
