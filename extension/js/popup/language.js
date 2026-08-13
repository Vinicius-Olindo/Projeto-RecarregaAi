// RecarregaAi! 2.5.0 — Idioma do popup

import {
  normalizeLanguage,
  loadLanguagePreference,
  saveLanguagePreference
} from "../modules/language-dialog.js";
import { loadPageI18n } from "../modules/i18n.js";

const popupLanguageStorageKey = "recarregaAiPageLanguage";

let activePopupLanguage = normalizeLanguage(document.documentElement.lang);
let popupTranslations = {};

export const getActiveLanguage = () => activePopupLanguage;

export const getPopupCopy = (key) => (
  popupTranslations[activePopupLanguage]?.[key]
  || popupTranslations["pt-BR"]?.[key]
  || key
);

export const replacePopupTokens = (key, replacements) => (
  Object.entries(replacements).reduce(
    (text, [token, value]) => text.replace(`{${token}}`, value),
    getPopupCopy(key)
  )
);

const setPopupText = (selector, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = getPopupCopy(key);
  }
};

const setPopupTexts = (selector, keys) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    const key = keys[index];

    if (key) {
      element.textContent = getPopupCopy(key);
    }
  });
};

export const applyPopupLanguage = () => {
  document.documentElement.lang = activePopupLanguage;

  setPopupText(".popup__subtitle", "subtitle");
  setPopupText(".popup__status .popup__label", "statusLabel");
  setPopupText("#status-message", "readyStatus");
  setPopupText(".timer-overview__copy .popup__label", "currentPageLabel");
  setPopupText("#controlled-tab-title", "refreshOffTitle");
  setPopupText("#controlled-tab-url", "chooseTimeBelow");
  setPopupText(".timer-overview__note", "timerNote");
  setPopupText("#open-controlled-tab-button", "openControlledPage");
  setPopupText("#pause-timer-button", "pauseTimer");
  setPopupText("#resume-timer-button", "resumeTimer");
  setPopupText("#remove-timer-button", "removeTimer");
  setPopupText("#quick-action-title", "manualLabel");
  setPopupText(".popup__primary-action .popup__hint", "manualHint");
  setPopupText("#reload-page-button", "updateNowButton");
  setPopupText(".popup__timer .popup__label", "autoLabel");
  setPopupText("#timer-title", "recurringTitle");
  setPopupText(".popup__timer .popup__badge", "countdownBadge");
  setPopupText(".timer-options legend", "intervalLegend");
  setPopupTexts(".timer-options__label", [
    "minuteShort",
    "minuteShort",
    "minuteShort",
    "customIntervalOption"
  ]);
  setPopupText(".custom-timer__label", "customTimerLabel");
  setPopupText(".custom-timer__suffix", "minuteShort");
  setPopupText("#start-timer-button", "defaultStartButton");
  setPopupText("#stop-timer-button", "stopTimer");
  setPopupText(".active-timers .popup__label", "otherPagesLabel");
  setPopupText("#active-timers-title", "activeTimerTitle");
  setPopupText("#open-options-button", "settings");
};

export const loadPopupLanguage = async () => {
  const fallbackLanguage = normalizeLanguage(
    localStorage.getItem(popupLanguageStorageKey)
    || document.documentElement.lang
  );

  try {
    activePopupLanguage = await loadLanguagePreference({
      fallbackLanguage
    });
  } catch (error) {
    console.error("Erro ao carregar idioma do popup:", error);
    activePopupLanguage = fallbackLanguage;
  }

  localStorage.setItem(popupLanguageStorageKey, activePopupLanguage);

  try {
    const { translations } = await loadPageI18n("popup", activePopupLanguage);

    popupTranslations = translations;
  } catch (error) {
    console.error("Erro ao carregar traducoes do popup:", error);
  }

  applyPopupLanguage();

  try {
    await saveLanguagePreference({
      language: activePopupLanguage
    });
  } catch (error) {
    console.error("Erro ao sincronizar idioma do popup:", error);
  }
};

export const setActiveLanguage = (language) => {
  activePopupLanguage = normalizeLanguage(language);
  localStorage.setItem(popupLanguageStorageKey, activePopupLanguage);
  applyPopupLanguage();
};
