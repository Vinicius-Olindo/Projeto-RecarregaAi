// RecarregaAi! 2.4.0

import { normalizeLanguage } from "./language-dialog.js";

const translationCache = new Map();

const loadPageTranslations = async (pageName) => {
  if (translationCache.has(pageName)) {
    return translationCache.get(pageName);
  }

  try {
    const url = chrome.runtime.getURL(`translations/${pageName}.json`);
    const response = await fetch(url);
    const translations = await response.json();

    translationCache.set(pageName, translations);

    return translations;
  } catch (error) {
    console.warn(`Falha ao carregar traducoes de ${pageName}:`, error);
    return {};
  }
};

export const createGetCopy = (pageName, fallbackLanguage = "pt-BR") => {
  let cachedTranslations = null;
  let activeLanguage = fallbackLanguage;

  const ensureLoaded = async () => {
    if (!cachedTranslations) {
      cachedTranslations = await loadPageTranslations(pageName);
    }
  };

  const getCopy = (key) => {
    if (!cachedTranslations) {
      return key;
    }

    return cachedTranslations[activeLanguage]?.[key]
      || cachedTranslations[fallbackLanguage]?.[key]
      || key;
  };

  const setLanguage = (language) => {
    activeLanguage = normalizeLanguage(language);
  };

  const load = async (language) => {
    await ensureLoaded();
    setLanguage(language);

    return getCopy;
  };

  const getTranslations = () => cachedTranslations;

  return {
    getCopy,
    load,
    setLanguage,
    getTranslations
  };
};

export const loadPageI18n = async (pageName, language) => {
  const translations = await loadPageTranslations(pageName);
  const normalizedLanguage = normalizeLanguage(language);

  const getCopy = (key) => (
    translations[normalizedLanguage]?.[key]
    || translations["pt-BR"]?.[key]
    || key
  );

  return {
    getCopy,
    translations,
    language: normalizedLanguage
  };
};
