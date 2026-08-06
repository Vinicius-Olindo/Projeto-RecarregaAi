// RecarregaAi! 2.4.0

import { storageKeys } from "./shared.js";

export const defaultLanguage = "pt-BR";
export const supportedLanguages = [
  "pt-BR",
  "en",
  "es",
  "fr",
  "de",
  "it",
  "id",
  "tr"
];

const getElement = (selector, root = document) => root.querySelector(selector);

export const normalizeLanguage = (language) => (
  supportedLanguages.includes(language) ? language : defaultLanguage
);

export const getChromeLanguageStorage = () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
};

export const loadLanguagePreference = async ({
  fallbackLanguage = defaultLanguage,
  storageArea = getChromeLanguageStorage()
} = {}) => {
  const normalizedFallback = normalizeLanguage(fallbackLanguage);

  if (!storageArea) {
    return normalizedFallback;
  }

  const storedData = await storageArea.get(storageKeys.language);

  return normalizeLanguage(
    storedData[storageKeys.language] || normalizedFallback
  );
};

export const saveLanguagePreference = async ({
  language,
  storageArea = getChromeLanguageStorage()
}) => {
  const nextLanguage = normalizeLanguage(language);

  if (storageArea) {
    await storageArea.set({
      [storageKeys.language]: nextLanguage
    });
  }

  return nextLanguage;
};

export const initLanguageDialog = ({
  closeSelector = "#close-language-button",
  dialogSelector = "#language-dialog",
  onChange = () => {},
  optionSelector = "[data-language-option]",
  openSelector = "#open-language-button",
  storageKey,
  triggerFocusOnClose = true
} = {}) => {
  const dialog = getElement(dialogSelector);
  const openButton = getElement(openSelector);
  const closeButton = getElement(closeSelector);
  const optionButtons = [...document.querySelectorAll(optionSelector)];

  if (!dialog || !openButton || !closeButton || optionButtons.length === 0) {
    return;
  }

  const getStoredLanguage = () => {
    if (!storageKey) {
      return document.documentElement.lang;
    }

    return localStorage.getItem(storageKey) || document.documentElement.lang;
  };

  const applyLanguage = (language) => {
    const nextLanguage = normalizeLanguage(language);

    document.documentElement.lang = nextLanguage;

    optionButtons.forEach((button) => {
      const isSelected = button.dataset.languageOption === nextLanguage;

      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });

    if (storageKey) {
      localStorage.setItem(storageKey, nextLanguage);
    }

    onChange(nextLanguage);
  };

  const openDialog = () => {
    dialog.hidden = false;
    document.body.classList.add("has-open-dialog");

    const selectedButton = optionButtons.find((button) => (
      button.dataset.languageOption === document.documentElement.lang
    ));

    (selectedButton || closeButton).focus();
  };

  const closeDialog = () => {
    dialog.hidden = true;
    document.body.classList.remove("has-open-dialog");

    if (triggerFocusOnClose) {
      openButton.focus();
    }
  };

  openButton.addEventListener("click", openDialog);
  closeButton.addEventListener("click", closeDialog);

  dialog.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-language]")) {
      closeDialog();
    }
  });

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.languageOption);
      closeDialog();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.hidden) {
      closeDialog();
    }
  });

  applyLanguage(getStoredLanguage());

  return {
    applyLanguage,
    closeDialog,
    openDialog
  };
};
