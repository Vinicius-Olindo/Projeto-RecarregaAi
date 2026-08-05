// RecarregaAi! 2.3.9

import {
  loadThemePreference,
  toggleThemePreference,
  watchSystemTheme
} from "./modules/theme.js";
import {
  loadLanguagePreference,
  normalizeLanguage,
  saveLanguagePreference
} from "./modules/language-dialog.js";
import { loadPageI18n } from "./modules/i18n.js";

const onboardingLanguageStorageKey = "recarregaAiPageLanguage";

const onboardingElements = {
  finishButton: document.querySelector("#finish-onboarding-button"),
  openOptionsButton: document.querySelector("#open-options-button"),
  themeToggleButton: document.querySelector("#theme-toggle-button")
};

let onboardingTranslations = null;
let activeOnboardingLanguage = "pt-BR";

const setOnboardingText = (selector, key) => {
  const element = document.querySelector(selector);

  if (!element || !onboardingTranslations) {
    return;
  }

  const text = onboardingTranslations[activeOnboardingLanguage]?.[key]
    || onboardingTranslations["pt-BR"]?.[key]
    || key;

  element.textContent = text;
};

const setOnboardingAttribute = (selector, attribute, key) => {
  const element = document.querySelector(selector);

  if (!element || !onboardingTranslations) {
    return;
  }

  const text = onboardingTranslations[activeOnboardingLanguage]?.[key]
    || onboardingTranslations["pt-BR"]?.[key]
    || key;

  element.setAttribute(attribute, text);
};

const applyOnboardingLanguage = () => {
  document.documentElement.lang = activeOnboardingLanguage;

  setOnboardingText("title[data-i18n='pageTitle']", "pageTitle");
  setOnboardingText(".eyebrow[data-i18n='eyebrow']", "eyebrow");
  setOnboardingText("h1[data-i18n='title']", "title");
  setOnboardingText(".intro__description[data-i18n='description']", "description");
  setOnboardingText("h2[data-i18n='step1Title']", "step1Title");
  setOnboardingText("p[data-i18n='step1Description']", "step1Description");
  setOnboardingText("h2[data-i18n='step2Title']", "step2Title");
  setOnboardingText("p[data-i18n='step2Description']", "step2Description");
  setOnboardingText("h2[data-i18n='step3Title']", "step3Title");
  setOnboardingText("p[data-i18n='step3Description']", "step3Description");
  setOnboardingText("strong[data-i18n='controlTitle']", "controlTitle");
  setOnboardingText("span[data-i18n='controlDescription']", "controlDescription");
  setOnboardingText("#open-options-button[data-i18n='openOptionsButton']", "openOptionsButton");
  setOnboardingText("#finish-onboarding-button[data-i18n='startButton']", "startButton");
  setOnboardingAttribute("#theme-toggle-button", "aria-label",
    activeOnboardingLanguage === "pt-BR" ? "themeLight" : "themeLight");
  setOnboardingAttribute("#theme-toggle-button", "title",
    activeOnboardingLanguage === "pt-BR" ? "themeLight" : "themeLight");
};

const updateThemeButton = ({ isDarkTheme }) => {
  const key = isDarkTheme ? "themeDark" : "themeLight";
  const label = onboardingTranslations?.[activeOnboardingLanguage]?.[key]
    || onboardingTranslations?.["pt-BR"]?.[key]
    || (isDarkTheme ? "Ativar tema claro" : "Ativar tema escuro");

  onboardingElements.themeToggleButton.setAttribute("aria-label", label);
  onboardingElements.themeToggleButton.setAttribute("title", label);
  onboardingElements.themeToggleButton.setAttribute(
    "aria-pressed",
    String(isDarkTheme)
  );
};

const loadOnboardingLanguage = async () => {
  const fallbackLanguage = normalizeLanguage(
    localStorage.getItem(onboardingLanguageStorageKey)
    || document.documentElement.lang
  );

  try {
    activeOnboardingLanguage = await loadLanguagePreference({
      fallbackLanguage
    });
  } catch (error) {
    console.error("Erro ao carregar idioma do onboarding:", error);
    activeOnboardingLanguage = fallbackLanguage;
  }

  localStorage.setItem(onboardingLanguageStorageKey, activeOnboardingLanguage);

  try {
    const { translations } = await loadPageI18n("onboarding", activeOnboardingLanguage);

    onboardingTranslations = translations;
  } catch (error) {
    console.error("Erro ao carregar traducoes do onboarding:", error);
  }

  applyOnboardingLanguage();

  try {
    await saveLanguagePreference({
      language: activeOnboardingLanguage
    });
  } catch (error) {
    console.error("Erro ao sincronizar idioma do onboarding:", error);
  }
};

const finishOnboarding = async () => {
  await chrome.storage.local.set({
    recarregaAiOnboardingSeenAt: new Date().toISOString()
  });

  const currentTab = await chrome.tabs.getCurrent();

  if (typeof currentTab?.id === "number") {
    await chrome.tabs.remove(currentTab.id);
    return;
  }

  window.close();
};

onboardingElements.themeToggleButton.addEventListener("click", () => {
  toggleThemePreference({
    onChange: updateThemeButton
  }).catch((error) => {
    console.error("Erro ao alternar tema do onboarding:", error);
  });
});

onboardingElements.openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage().catch((error) => {
    console.error("Erro ao abrir configurações:", error);
  });
});

onboardingElements.finishButton.addEventListener("click", () => {
  finishOnboarding().catch((error) => {
    console.error("Erro ao finalizar onboarding:", error);
  });
});

loadOnboardingLanguage().then(() => {
  loadThemePreference({
    onChange: updateThemeButton
  }).then(() => {
    watchSystemTheme({ onChange: updateThemeButton });
  }).catch((error) => {
    console.error("Erro ao carregar tema do onboarding:", error);
  });
}).catch((error) => {
  console.error("Erro ao iniciar onboarding do RecarregaAi:", error);
});
