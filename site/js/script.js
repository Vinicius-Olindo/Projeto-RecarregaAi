// RecarregaAi! 2.5.0

import { appConfig } from "./modules/config.js";
import {
  loadThemePreference,
  toggleThemePreference
} from "./modules/theme.js";
import { extendPageTranslations } from "./modules/extended-translations.js";
import { supportedLanguages } from "./modules/language-dialog.js";
import { enforceTopLevelPublicPage } from "./modules/public-page-security.js";

enforceTopLevelPublicPage();

const welcomeLanguageStorageKey = "recarregaAiPageLanguage";
const legacyWelcomeLanguageStorageKey = "recarregaAiWelcomeLanguage";
const defaultWelcomeLanguage = "pt-BR";

const supportedWelcomeLanguages = supportedLanguages;

const welcomeTranslations = extendPageTranslations({
  "pt-BR": {
    documentTitle: "RecarregaAi! | Atualizacao automatica por guia",
    howItWorks: "Como funciona",
    features: "Funcionalidades",
    useCases: "Usos",
    faq: "FAQ",
    installButton: "Instalar no Chrome",
    heroEyebrow: "Extensao Manifest V3 para rotinas operacionais",
    heroTitle: "Mantenha sistemas criticos sempre atualizados,",
    heroTitleAccent: "sem limpar cache manualmente.",
    heroDescription: "O RecarregaAi! automatiza recargas por guia, limpa cache do site aberto e pausa de forma inteligente quando voce esta digitando, assistindo ou usando midia.",
    viewHow: "Ver como funciona",
    finalTitle: "Instale o RecarregaAi! e pare de atualizar sistemas na mao.",
    finalBody: "Leve, direto e feito para manter suas paginas de trabalho atualizadas com controle por guia e pausa inteligente.",
    startNow: "Instalar no Chrome",
    footerHome: "Inicio",
    footerPrivacy: "Privacidade",
    footerFeedback: "Feedback",
    footerDeveloper: "Desenvolvido por:",
    languageLabel: "Idioma",
    backToTop: "Voltar ao inicio",
    quickActionsLabel: "Acoes rapidas",
    linksLabel: "Links finais",
    contactChannelsLabel: "Canais de contato",
    closeDialog: "Fechar",
    languageDialogTitle: "Idioma",
    languageDialogDescription: "Escolha o idioma preferido para navegar pelo RecarregaAi!.",
    languageGridLabel: "Idiomas disponiveis",
    themeToDark: "Tema escuro",
    themeToLight: "Tema claro"
  },
  en: {
    documentTitle: "RecarregaAi! | Automatic refresh by tab",
    howItWorks: "How it works",
    features: "Features",
    useCases: "Uses",
    faq: "FAQ",
    installButton: "Install on Chrome",
    heroEyebrow: "Manifest V3 extension for operational workflows",
    heroTitle: "Keep critical systems always updated,",
    heroTitleAccent: "without clearing cache manually.",
    heroDescription: "RecarregaAi! automates reloads by tab, clears the open site's cache and pauses intelligently when you are typing, watching or using media.",
    viewHow: "See how it works",
    finalTitle: "Install RecarregaAi! and stop refreshing systems by hand.",
    finalBody: "Lightweight, direct and built to keep work pages updated with tab-level control and smart pause.",
    startNow: "Install on Chrome",
    footerHome: "Home",
    footerPrivacy: "Privacy",
    footerFeedback: "Feedback",
    footerDeveloper: "Developed by:",
    languageLabel: "Language",
    backToTop: "Back to top",
    quickActionsLabel: "Quick actions",
    linksLabel: "Footer links",
    contactChannelsLabel: "Contact channels",
    closeDialog: "Close",
    languageDialogTitle: "Language",
    languageDialogDescription: "Choose your preferred language to browse RecarregaAi!.",
    languageGridLabel: "Available languages",
    themeToDark: "Dark theme",
    themeToLight: "Light theme"
  },
  es: {
    documentTitle: "RecarregaAi! | Actualizacion automatica por pestana",
    howItWorks: "Como funciona",
    features: "Funcionalidades",
    useCases: "Usos",
    faq: "FAQ",
    installButton: "Instalar en Chrome",
    heroEyebrow: "Extension Manifest V3 para rutinas operativas",
    heroTitle: "Mantiene sistemas criticos siempre actualizados,",
    heroTitleAccent: "sin limpiar cache manualmente.",
    heroDescription: "RecarregaAi! automatiza recargas por pestana, limpia la cache del sitio abierto y pausa de forma inteligente cuando escribes, miras o usas medios.",
    viewHow: "Ver como funciona",
    finalTitle: "Instala RecarregaAi! y deja de actualizar sistemas a mano.",
    finalBody: "Ligero, directo y hecho para mantener paginas de trabajo actualizadas con control por pestana y pausa inteligente.",
    startNow: "Instalar en Chrome",
    footerHome: "Inicio",
    footerPrivacy: "Privacidad",
    footerFeedback: "Feedback",
    footerDeveloper: "Desarrollado por:",
    languageLabel: "Idioma",
    backToTop: "Volver al inicio",
    quickActionsLabel: "Acciones rapidas",
    linksLabel: "Enlaces finales",
    contactChannelsLabel: "Canales de contacto",
    closeDialog: "Cerrar",
    languageDialogTitle: "Idioma",
    languageDialogDescription: "Elige el idioma preferido para navegar por RecarregaAi!.",
    languageGridLabel: "Idiomas disponibles",
    themeToDark: "Tema oscuro",
    themeToLight: "Tema claro"
  }
}, "welcome");

const welcomeElements = {
  chromeWebStoreLinks: document.querySelectorAll("[data-chrome-web-store-link]"),
  closeLanguageButton: document.querySelector("#close-language-button"),
  languageBackdrop: document.querySelector("[data-close-language]"),
  languageDialog: document.querySelector("#language-dialog"),
  languageOptionButtons: document.querySelectorAll("[data-language-option]"),
  openLanguageButton: document.querySelector("#open-language-button"),
  themeToggleButton: document.querySelector("#theme-toggle-button"),
  languageToggleLabel: document.querySelector("#language-toggle-label")
};

let activeWelcomeLanguage = defaultWelcomeLanguage;

const configureChromeWebStoreLink = () => {
  welcomeElements.chromeWebStoreLinks.forEach((link) => {
    link.hidden = true;
    link.removeAttribute("href");
  });

  if (!appConfig.chromeWebStoreUrl) {
    return;
  }

  welcomeElements.chromeWebStoreLinks.forEach((link) => {
    link.href = appConfig.chromeWebStoreUrl;
    link.hidden = false;
  });
};

const getWelcomeCopy = (key) => (
  welcomeTranslations[activeWelcomeLanguage]?.[key]
  || welcomeTranslations[defaultWelcomeLanguage][key]
  || key
);

const setText = (selector, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = getWelcomeCopy(key);
  }
};

const setTexts = (selector, keys) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    const key = keys[index];

    if (key) {
      element.textContent = getWelcomeCopy(key);
    }
  });
};

const setAttribute = (selector, attribute, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute(attribute, getWelcomeCopy(key));
  }
};

const setHeroTitle = () => {
  const heroTitle = document.querySelector("#welcome-title");

  if (!heroTitle) {
    return;
  }

  const accent = document.createElement("span");

  accent.textContent = getWelcomeCopy("heroTitleAccent");
  heroTitle.replaceChildren(getWelcomeCopy("heroTitle"), " ", accent);
};

const updateWelcomeText = () => {
  document.title = getWelcomeCopy("documentTitle");

  setTexts(".top-nav__link span", [
    "howItWorks",
    "features",
    "useCases",
    "faq"
  ]);
  setText(".chrome-install-button__label", "installButton");
  setAttribute(".chrome-install-button", "aria-label", "installButton");
  setText(".hero__eyebrow", "heroEyebrow");
  setHeroTitle();
  setText(".hero__description", "heroDescription");
  setText("#finish-welcome-button", "installButton");
  setText(".hero__actions .button--secondary", "viewHow");
  setText("#final-title", "finalTitle");
  setText(".final-cta__content > p:not(.section__eyebrow)", "finalBody");
  setText(".final-cta [data-install-cta]", "startNow");
  setTexts(".privacy-footer__nav a", [
    "footerHome",
    "footerPrivacy",
    "footerFeedback"
  ]);
  setText(".privacy-footer__developer-label", "footerDeveloper");
  setText("#language-dialog-title", "languageDialogTitle");
  setText(".language-dialog__description", "languageDialogDescription");

  setAttribute(".privacy-footer__nav", "aria-label", "linksLabel");
  setAttribute(".privacy-footer__social", "aria-label", "contactChannelsLabel");
  setAttribute("#open-language-button", "aria-label", "languageLabel");
  setAttribute("#close-language-button", "aria-label", "closeDialog");
  setAttribute(".language-grid", "aria-label", "languageGridLabel");
};
const getChromeLocalStorage = () => {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  return chrome.storage.local;
};

const updateThemeButtonLabel = (isDarkTheme) => {
  const nextLabel = isDarkTheme
    ? getWelcomeCopy("themeToLight")
    : getWelcomeCopy("themeToDark");

  welcomeElements.themeToggleButton.setAttribute("aria-label", nextLabel);
  welcomeElements.themeToggleButton.setAttribute("title", nextLabel);
  welcomeElements.themeToggleButton.setAttribute("aria-pressed", String(isDarkTheme));

};

const handleWelcomeThemeChange = ({ isDarkTheme }) => {
  updateThemeButtonLabel(isDarkTheme);
};

const normalizeWelcomeLanguage = (language) => {
  return supportedWelcomeLanguages.includes(language)
    ? language
    : defaultWelcomeLanguage;
};

const applyWelcomeLanguage = (language) => {
  const nextLanguage = normalizeWelcomeLanguage(language);

  activeWelcomeLanguage = nextLanguage;
  document.documentElement.lang = nextLanguage;

  if (welcomeElements.languageToggleLabel) {
    welcomeElements.languageToggleLabel.textContent = nextLanguage.toUpperCase();
  }

  updateWelcomeText();
  updateThemeButtonLabel(document.documentElement.dataset.theme === "dark");

  welcomeElements.languageOptionButtons.forEach((button) => {
    const isSelected = button.dataset.languageOption === nextLanguage;

    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
};

const loadWelcomeTheme = async () => {
  await loadThemePreference({
    onChange: handleWelcomeThemeChange,
    storageArea: getChromeLocalStorage()
  });
};

const loadWelcomeLanguage = async () => {
  const storedLanguage = localStorage.getItem(welcomeLanguageStorageKey)
    || localStorage.getItem(legacyWelcomeLanguageStorageKey);

  applyWelcomeLanguage(storedLanguage);
};

const toggleWelcomeTheme = async () => {
  await toggleThemePreference({
    onChange: handleWelcomeThemeChange,
    storageArea: getChromeLocalStorage()
  });
};

const saveWelcomeLanguage = async (language) => {
  const nextLanguage = normalizeWelcomeLanguage(language);

  applyWelcomeLanguage(nextLanguage);
  localStorage.setItem(welcomeLanguageStorageKey, nextLanguage);
};

const openLanguageDialog = () => {
  welcomeElements.languageDialog.hidden = false;
  document.body.classList.add("has-open-dialog");

  const selectedButton = document.querySelector(".language-card.is-selected");
  (selectedButton || welcomeElements.closeLanguageButton).focus();
};

const closeLanguageDialog = () => {
  welcomeElements.languageDialog.hidden = true;
  document.body.classList.remove("has-open-dialog");
  welcomeElements.openLanguageButton.focus();
};

welcomeElements.themeToggleButton.addEventListener("click", () => {
  toggleWelcomeTheme().catch((error) => {
    console.error("Erro ao alternar tema da boas-vindas:", error);
  });
});

welcomeElements.openLanguageButton.addEventListener("click", () => {
  openLanguageDialog();
});

welcomeElements.closeLanguageButton.addEventListener("click", () => {
  closeLanguageDialog();
});

welcomeElements.languageBackdrop.addEventListener("click", () => {
  closeLanguageDialog();
});

welcomeElements.languageOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    saveWelcomeLanguage(button.dataset.languageOption).catch((error) => {
      console.error("Erro ao salvar idioma da boas-vindas:", error);
    });
    closeLanguageDialog();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !welcomeElements.languageDialog.hidden) {
    closeLanguageDialog();
  }
});

Promise.all([
  loadWelcomeTheme(),
  loadWelcomeLanguage()
]).catch((error) => {
  console.error("Erro ao carregar boas-vindas:", error);
});

configureChromeWebStoreLink();

