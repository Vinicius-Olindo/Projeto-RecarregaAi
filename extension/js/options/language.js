// RecarregaAi! 2.5.0 — Idioma das configurações

import { loadPageI18n } from "../modules/i18n.js";
import {
  defaultLanguage,
  initLanguageDialog,
  loadLanguagePreference,
  saveLanguagePreference,
  normalizeLanguage
} from "../modules/language-dialog.js";

const optionsPageLanguageStorageKey = "recarregaAiPageLanguage";

let optionsTranslations = {};
let activeOptionsLanguage = defaultLanguage;
let optionsLanguageDialog = null;

export const getActiveLanguage = () => activeOptionsLanguage;

export const getOptionsCopy = (key) => (
  optionsTranslations[activeOptionsLanguage]?.[key]
  || optionsTranslations["pt-BR"]?.[key]
  || key
);

export const replaceOptionsToken = (key, replacements) => (
  Object.entries(replacements).reduce(
    (text, [token, value]) => text.replace(`{${token}}`, value),
    getOptionsCopy(key)
  )
);

const setText = (selector, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = getOptionsCopy(key);
  }
};

const setTexts = (selector, keys) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    const key = keys[index];

    if (key) {
      element.textContent = getOptionsCopy(key);
    }
  });
};

const setAttribute = (selector, attribute, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute(attribute, getOptionsCopy(key));
  }
};

export const applyOptionsLanguage = (language, {
  renderSites,
  renderActionHistory,
  updateOptionsThemeButtonLabel,
  isHistoryClearPending
} = {}) => {
  activeOptionsLanguage = optionsTranslations[language]
    ? language
    : defaultLanguage;
  document.title = getOptionsCopy("documentTitle");

  setText("#close-options-button span", "headerExit");
  setText("#options-title", "pageTitle");
  setText(".brand__subtitle", "pageDescription");
  setText("#general-section .settings-section__eyebrow", "preferencesEyebrow");
  setText("#general-title", "defaultTimeLabel");
  setText("#general-section .settings-section__description", "timeDescription");
  setText(".inline-row .field__label", "defaultIntervalInputLabel");
  setText("#save-settings-button", "saveDefaultInterval");
  setText("#preserve-scroll-title", "preserveScrollTitle");
  setText("#preserve-scroll-description", "preserveScrollDescription");
  setText("#play-sound-title", "playSoundTitle");
  setText("#play-sound-description", "playSoundDescription");
  setText("#advanced-cleanup-title", "advancedCleanupTitle");
  setText("#advanced-cleanup-description", "advancedCleanupDescription");
  setText("#operating-hours-title", "operatingTitle");
  setText("#operating-hours-description", "operatingDescription");
  setText("#operating-days-label", "operatingDays");
  setText("#operating-start-label", "operatingStart");
  setText("#operating-end-label", "operatingEnd");

  const weekdayShorts = getOptionsCopy("weekdayShorts");

  if (Array.isArray(weekdayShorts)) {
    document.querySelectorAll(".weekday-picker label span")
      .forEach((weekdayLabel, index) => {
        weekdayLabel.textContent = weekdayShorts[index] || weekdayLabel.textContent;
      });
  }
  setText("#sites-title", "sitesTitle");
  setText("#sites-section .settings-section__eyebrow", "autoStartEyebrow");
  setText("#sites-section .settings-section__description", "autoStartDescription");
  setText("#site-origin-label", "siteAddressLabel");
  setText("#site-interval-label", "siteIntervalLabel");
  setText("#add-site-button", "addSite");
  setText(".empty-state strong", "emptySitesTitle");
  setText(".empty-state div span", "emptySitesDescription");
  setText("#backup-section .settings-section__eyebrow", "backupEyebrow");
  setText("#backup-title", "backupTitle");
  setText("#backup-section .settings-section__description", "backupDescription");
  setText("#export-settings-label", "backupExport");
  setText("#export-settings-description", "backupExportDescription");
  setText("#import-settings-label", "backupImport");
  setText("#import-settings-description", "backupImportDescription");
  setText(".backup-note span", "backupNoteWithHistory");
  setText("#history-section .settings-section__eyebrow", "historyEyebrow");
  setText("#history-title", "historyTitle");
  setText("#history-section .settings-section__description", "historyDescription");
  setText("#clear-history-button", isHistoryClearPending
    ? "historyClearConfirm"
    : "historyClear");
  setText("#export-diagnostics-button", "diagnosticsExport");
  setTexts(".history-filter", [
    "historyFilterAll",
    "historyFilterRefreshes",
    "historyFilterTimers"
  ]);
  setText(".history-empty-state strong", "historyEmptyTitle");
  setText(".history-empty-state div span", "historyEmptyDescription");
  setText("#show-more-history-button", "historyShowMore");
  setText("#collapse-history-button", "historyCollapse");
  setText(".history-note", "historyLimitNote");
  setText("#permissions-title", "permissionsTitle");
  setText("#permissions-section .settings-section__eyebrow", "transparencyEyebrow");
  setText("#permissions-section .settings-section__description", "permissionsDescription");
  setTexts(".permission-item strong", [
    "currentPageTitle",
    "cleanupTitle",
    "authorizedSitesTitle",
    "localPreferencesTitle"
  ]);
  setTexts(".permission-item p", [
    "currentPageDescription",
    "cleanupDescription",
    "authorizedSitesDescription",
    "localPreferencesDescription"
  ]);
  setTexts(".privacy-footer__nav a", [
    "footerHome",
    "footerPrivacy",
    "footerFeedback"
  ]);
  setText("#language-dialog-title", "languageDialogTitle");
  setText(".language-dialog__description", "languageDialogDescription");

  setText("#shortcuts-title", "shortcutsTitle");
  setText("#shortcuts-section .settings-section__description", "shortcutsDescription");
  setText("#shortcut-start-timer-label", "shortcutStartTimer");
  setText("#shortcut-start-timer-description", "shortcutStartTimerDescription");
  setText("#shortcut-pause-all-label", "shortcutPauseAll");
  setText("#shortcut-pause-all-description", "shortcutPauseAllDescription");
  setText("#shortcut-resume-all-label", "shortcutResumeAll");
  setText("#shortcut-resume-all-description", "shortcutResumeAllDescription");
  setText("#shortcuts-hint", "shortcutHint");
  setText("#debug-mode-title", "debugTitle");
  setText("#debug-mode-description", "debugDescription");

  setAttribute(".permissions-grid", "aria-label", "permissionsGridLabel");
  setAttribute("#sites-list", "aria-label", "siteListLabel");
  setAttribute("#history-list", "aria-label", "historyTitle");
  setAttribute(".history-toolbar", "aria-label", "historyFilterLabel");
  setAttribute(".privacy-footer__nav", "aria-label", "linksLabel");
  setAttribute(".privacy-footer__social", "aria-label", "contactChannelsLabel");
  setAttribute(".language-grid", "aria-label", "languageGridLabel");
  setAttribute("#open-language-button", "aria-label", "languageLabel");
  setAttribute("#back-to-top-button", "aria-label", "backToTop");
  setAttribute("#close-language-button", "aria-label", "closeDialog");

  const langCodeMap = {
    "pt-BR": "PT-BR",
    "en": "EN",
    "es": "ES",
    "fr": "FR",
    "de": "DE",
    "it": "IT",
    "id": "ID",
    "tr": "TR"
  };
  const langCodeElement = document.querySelector(".header-action__lang-code");

  if (langCodeElement) {
    langCodeElement.textContent = langCodeMap[language] || "PT-BR";
  }

  if (renderSites) {
    renderSites();
  }
  if (renderActionHistory) {
    renderActionHistory();
  }
  if (updateOptionsThemeButtonLabel) {
    updateOptionsThemeButtonLabel({
      isDarkTheme: document.documentElement.dataset.theme === "dark"
    });
  }
};

export const handleOptionsLanguageChange = async (language, callbacks) => {
  const { translations } = await loadPageI18n("options", language);

  optionsTranslations = translations;
  activeOptionsLanguage = normalizeLanguage(language);

  applyOptionsLanguage(activeOptionsLanguage, callbacks);

  saveLanguagePreference({
    language
  }).catch((error) => {
    console.error("Erro ao salvar idioma do RecarregaAi:", error);
  });
};

export const initializeOptionsLanguageDialog = async (callbacks) => {
  const storedLanguage = await loadLanguagePreference({
    fallbackLanguage: (
      localStorage.getItem(optionsPageLanguageStorageKey)
      || document.documentElement.lang
    )
  });

  localStorage.setItem(optionsPageLanguageStorageKey, storedLanguage);

  const { translations } = await loadPageI18n("options", storedLanguage);

  optionsTranslations = translations;
  activeOptionsLanguage = normalizeLanguage(storedLanguage);

  optionsLanguageDialog = initLanguageDialog({
    onChange: (language) => handleOptionsLanguageChange(language, callbacks),
    storageKey: optionsPageLanguageStorageKey
  });

  applyOptionsLanguage(activeOptionsLanguage, callbacks);
};

export const getOptionsLanguageDialog = () => optionsLanguageDialog;
