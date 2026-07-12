// RecarregaAi! 2.3.9

import { appConfig } from "./modules/config.js";
import {
  extendPageTranslations,
  extendReasonTranslationMap
} from "./modules/extended-translations.js";
import { initFloatingTools } from "./modules/floating-tools.js";
import {
  loadThemePreference,
  toggleThemePreference
} from "./modules/theme.js";
import { enforceTopLevelPublicPage } from "./modules/public-page-security.js";

enforceTopLevelPublicPage();

const feedbackBackendUrl = appConfig.feedbackBackendUrl;
const defaultVersionLabel = "2.3.9";
const defaultLanguage = "pt-BR";
const defaultReason = "Não informou motivo";
const feedbackCooldownInMilliseconds = 60 * 1000;
const feedbackResponseTimeoutInMilliseconds = 20 * 1000;
const feedbackLastSubmitAtKey = "recarregaAiFeedbackLastSubmitAt";
const feedbackMessageMaxLength = 1200;
const feedbackEmailMaxLength = 254;
const feedbackResponseSource = "recarregaai-feedback";
const feedbackResponseHostnames = new Set([
  "script.google.com",
  "script.googleusercontent.com"
]);
const feedbackResponseHostnamePattern =
  /^[a-z0-9-]+-script\.googleusercontent\.com$/;
const feedbackPageLoadedAt = new Date().toISOString();
const languageStorageKey = "recarregaAiPageLanguage";
const legacyLanguageStorageKey = "recarregaAiUninstallLanguage";

const translations = extendPageTranslations({
  "pt-BR": {
    backToTop: "Voltar ao início",
    closeDialog: "Fechar",
    commentLabel: "Comentário",
    commentPlaceholder: "Conte em poucas palavras o que poderíamos melhorar.",
    documentTitle: "Feedback do RecarregaAi!",
    emailLabel: "E-mail para contato",
    footerDeveloper: "Desenvolvido por:",
    footerFeedback: "Feedback",
    footerHome: "Início",
    footerLegal: "© RecarregaAi! 2.3.9. Todos os direitos reservados.",
    footerPrivacy: "Privacidade",
    feedbackNotConfigured:
      "O serviço de feedback ainda não foi configurado.",
    formSubmitError:
      "Não consegui confirmar o envio agora. Tente novamente em alguns instantes.",
    formSubmitLoading: "Enviando feedback...",
    formSubmitRateLimit:
      "Aguarde {seconds} segundos antes de enviar outro feedback.",
    formSubmitSuccess: "Feedback enviado com sucesso. Obrigado por ajudar.",
    introFirst: [
      "Antes de desinstalar de vez, conte rapidamente o que não funcionou bem.",
      "Sua opinião ajuda a melhorar o RecarregaAi! para outros usuários."
    ].join(" "),
    introSecond:
      "Selecione um motivo ou deixe uma mensagem opcional descrevendo sua experiência.",
    languageDialogText:
      "Altere o idioma da página para o seu idioma preferido.",
    languageDialogTitle: "Idioma",
    languageLabel: "Idioma",
    installButton: "Adicionar ao Chrome",
    themeToDark: "Tema escuro",
    themeToLight: "Tema claro",
    noReason: "Nenhum motivo selecionado.",
    optionalCommentSummary: "Adicionar comentário opcional",
    pageTitle: "Lamentamos sua partida.",
    reasonRequired: "Selecione um motivo antes de enviar.",
    selectedPrefix: "Selecionado: ",
    sendButton: "Enviar feedback",
    versionLabel: "2.3.9"
  },
  en: {
    backToTop: "Back to start",
    closeDialog: "Close",
    commentLabel: "Comment",
    commentPlaceholder: "Tell us briefly what we could improve.",
    documentTitle: "RecarregaAi! Feedback",
    emailLabel: "Contact email",
    footerDeveloper: "Developed by:",
    footerFeedback: "Feedback",
    footerHome: "Home",
    footerLegal: "© RecarregaAi! 2.3.9. All rights reserved.",
    footerPrivacy: "Privacy",
    feedbackNotConfigured:
      "The feedback service has not been configured yet.",
    formSubmitError:
      "I could not confirm the send right now. Try again in a few moments.",
    formSubmitLoading: "Sending feedback...",
    formSubmitRateLimit:
      "Wait {seconds} seconds before sending more feedback.",
    formSubmitSuccess: "Feedback sent successfully. Thanks for helping.",
    introFirst: [
      "Before uninstalling for good, quickly tell us what did not work well.",
      "Your opinion helps improve RecarregaAi! for other users."
    ].join(" "),
    introSecond:
      "Select a reason or leave an optional message describing your experience.",
    languageDialogText: "Change this page to your preferred language.",
    languageDialogTitle: "Language",
    languageLabel: "Language",
    installButton: "Add to Chrome",
    themeToDark: "Dark theme",
    themeToLight: "Light theme",
    noReason: "No reason selected.",
    optionalCommentSummary: "Add optional comment",
    pageTitle: "Sorry to see you go.",
    reasonRequired: "Select a reason before sending.",
    selectedPrefix: "Selected: ",
    sendButton: "Send feedback",
    versionLabel: "2.3.9"
  },
  es: {
    backToTop: "Volver al inicio",
    closeDialog: "Cerrar",
    commentLabel: "Comentario",
    commentPlaceholder: "Cuéntanos brevemente qué podríamos mejorar.",
    documentTitle: "Feedback de RecarregaAi!",
    emailLabel: "Email de contacto",
    footerDeveloper: "Desarrollado por:",
    footerFeedback: "Feedback",
    footerHome: "Inicio",
    footerLegal: "© RecarregaAi! 2.3.9. Todos los derechos reservados.",
    footerPrivacy: "Privacidad",
    feedbackNotConfigured:
      "El servicio de feedback todavía no está configurado.",
    formSubmitError:
      "No pude confirmar el envío ahora. Inténtalo de nuevo en unos momentos.",
    formSubmitLoading: "Enviando feedback...",
    formSubmitRateLimit:
      "Espera {seconds} segundos antes de enviar otro feedback.",
    formSubmitSuccess: "Feedback enviado correctamente. Gracias por ayudar.",
    introFirst: [
      "Antes de desinstalar definitivamente, cuéntanos rápidamente qué no funcionó bien.",
      "Tu opinión ayuda a mejorar RecarregaAi! para otros usuarios."
    ].join(" "),
    introSecond:
      "Selecciona un motivo o deja un mensaje opcional describiendo tu experiencia.",
    languageDialogText: "Cambia esta página a tu idioma preferido.",
    languageDialogTitle: "Idioma",
    languageLabel: "Idioma",
    installButton: "Agregar a Chrome",
    themeToDark: "Tema oscuro",
    themeToLight: "Tema claro",
    noReason: "Ningún motivo seleccionado.",
    optionalCommentSummary: "Agregar comentario opcional",
    pageTitle: "Lamentamos que te vayas.",
    reasonRequired: "Selecciona un motivo antes de enviar.",
    selectedPrefix: "Seleccionado: ",
    sendButton: "Enviar feedback",
    versionLabel: "2.3.9"
  }
}, "uninstall");

const reasonTranslations = extendReasonTranslationMap({
  workflow: {
    "pt-BR": {
      label: "Fluxo de trabalho",
      reason: "Não é mais necessário para meu fluxo de trabalho",
      text: "Não é mais necessário para meu fluxo de trabalho"
    },
    en: {
      label: "Workflow",
      reason: "It is no longer needed for my workflow",
      text: "It is no longer needed for my workflow"
    },
    es: {
      label: "Flujo de trabajo",
      reason: "Ya no es necesario para mi flujo de trabajo",
      text: "Ya no es necesario para mi flujo de trabajo"
    }
  },
  cache: {
    "pt-BR": {
      label: "Cache",
      reason: "Não limpou o cache como eu esperava",
      text: "Não limpou o cache como eu esperava"
    },
    en: {
      label: "Cache",
      reason: "It did not clear cache as expected",
      text: "It did not clear cache as expected"
    },
    es: {
      label: "Cache",
      reason: "No limpió la caché como esperaba",
      text: "No limpió la caché como esperaba"
    }
  },
  reload: {
    "pt-BR": {
      label: "Reload",
      reason: "Recarregou a página na hora errada",
      text: "Recarregou a página na hora errada"
    },
    en: {
      label: "Reload",
      reason: "It reloaded the page at the wrong time",
      text: "It reloaded the page at the wrong time"
    },
    es: {
      label: "Recarga",
      reason: "Recargó la página en el momento equivocado",
      text: "Recargó la página en el momento equivocado"
    }
  },
  usability: {
    "pt-BR": {
      label: "Usabilidade",
      reason: "Ficou confuso de usar",
      text: "Ficou confuso de usar"
    },
    en: {
      label: "Usability",
      reason: "It was confusing to use",
      text: "It was confusing to use"
    },
    es: {
      label: "Usabilidad",
      reason: "Fue confuso de usar",
      text: "Fue confuso de usar"
    }
  },
  feature: {
    "pt-BR": {
      label: "Função ausente",
      reason: "Faltou alguma função importante",
      text: "Faltou alguma função importante"
    },
    en: {
      label: "Missing feature",
      reason: "An important feature was missing",
      text: "An important feature was missing"
    },
    es: {
      label: "Función faltante",
      reason: "Faltó alguna función importante",
      text: "Faltó alguna función importante"
    }
  },
  other: {
    "pt-BR": {
      label: "Outro",
      reason: "Outro motivo",
      text: "Outro motivo"
    },
    en: {
      label: "Other",
      reason: "Other reason",
      text: "Other reason"
    },
    es: {
      label: "Otro",
      reason: "Otro motivo",
      text: "Otro motivo"
    }
  }
});

const uninstallElements = {
  chromeWebStoreLink: document.querySelector("[data-chrome-web-store-link]"),
  closeLanguageButton: document.querySelector("#close-language-button"),
  contactEmail: document.querySelector("#contact-email"),
  extensionVersion: document.querySelector("#extension-version"),
  feedbackBrowserInput: document.querySelector("#feedback-browser-input"),
  feedbackDateInput: document.querySelector("#feedback-date-input"),
  feedbackDeliveryFrame: document.querySelector("#feedback-delivery-frame"),
  feedbackForm: document.querySelector("#feedback-form"),
  feedbackLanguageInput: document.querySelector("#feedback-language-input"),
  feedbackMessage: document.querySelector("#feedback-message"),
  feedbackReasonInput: document.querySelector("#feedback-reason-input"),
  feedbackStatus: document.querySelector("#feedback-status"),
  feedbackVersionInput: document.querySelector("#feedback-version-input"),
  languageDialog: document.querySelector("#language-dialog"),
  languageOptionButtons: document.querySelectorAll("[data-language-option]"),
  openLanguageButton: document.querySelector("#open-language-button"),
  pageRoot: document.querySelector("#page-root"),
  reasonInputs: document.querySelectorAll("[data-reason-id]"),
  reasonTextElements: document.querySelectorAll("[data-reason-text]"),
  sendFeedbackButton: document.querySelector("#send-feedback-button"),
  selectedReasonFeedback: document.querySelector("#selected-reason-feedback"),
  themeToggleButton: document.querySelector("#theme-toggle-button"),
  themeToggleLabel: document.querySelector("#theme-toggle-label")
};

let isSendingFeedback = false;
let activeLanguage = defaultLanguage;

const configureChromeWebStoreLink = () => {
  if (!uninstallElements.chromeWebStoreLink || !appConfig.chromeWebStoreUrl) {
    return;
  }

  uninstallElements.chromeWebStoreLink.href = appConfig.chromeWebStoreUrl;
  uninstallElements.chromeWebStoreLink.hidden = false;
};

const getVersionLabel = () => defaultVersionLabel;

const getCopy = (key) => (
  translations[activeLanguage][key] || translations[defaultLanguage][key]
);

const getConfiguredFeedbackBackendUrl = () => {
  try {
    const backendUrl = new URL(feedbackBackendUrl);
    const isGoogleAppsScriptUrl = backendUrl.protocol === "https:"
      && backendUrl.hostname === "script.google.com"
      && backendUrl.pathname.startsWith("/macros/s/")
      && backendUrl.pathname.endsWith("/exec");

    return isGoogleAppsScriptUrl ? backendUrl.href : "";
  } catch {
    return "";
  }
};

const isTrustedFeedbackResponseOrigin = (origin) => {
  try {
    const responseUrl = new URL(origin);
    const isGoogleusercontentScriptHost = feedbackResponseHostnamePattern.test(
      responseUrl.hostname
    );

    return responseUrl.protocol === "https:"
      && (
        feedbackResponseHostnames.has(responseUrl.hostname)
        || isGoogleusercontentScriptHost
      );
  } catch {
    return false;
  }
};

const hasConfiguredFeedbackBackend = () => Boolean(
  getConfiguredFeedbackBackendUrl()
);

const updateUninstallThemeButtonLabel = ({ isDarkTheme }) => {
  const nextThemeLabel = isDarkTheme
    ? getCopy("themeToLight")
    : getCopy("themeToDark");

  uninstallElements.themeToggleButton?.setAttribute(
    "aria-pressed",
    String(isDarkTheme)
  );
  uninstallElements.themeToggleButton?.setAttribute("aria-label", nextThemeLabel);
  uninstallElements.themeToggleButton?.setAttribute("title", nextThemeLabel);

  if (uninstallElements.themeToggleLabel) {
    uninstallElements.themeToggleLabel.textContent = nextThemeLabel;
  }
};

const loadUninstallTheme = async () => {
  await loadThemePreference({
    onChange: updateUninstallThemeButtonLabel
  });
};

const toggleUninstallTheme = async () => {
  await toggleThemePreference({
    onChange: updateUninstallThemeButtonLabel
  });
};

const getReasonCopy = (reasonId) => (
  reasonTranslations[reasonId]?.[activeLanguage]
);

const getSelectedReasonInput = () => (
  document.querySelector("[data-reason-id]:checked")
);

const getSelectedReasonId = () => getSelectedReasonInput()?.dataset.reasonId;

const getSelectedReason = () => {
  const reasonCopy = getReasonCopy(getSelectedReasonId());

  return reasonCopy?.reason || defaultReason;
};

const hasSelectedReason = () => getSelectedReason() !== defaultReason;

const updateStatus = (message, { isError = false } = {}) => {
  uninstallElements.feedbackStatus.textContent = message;
  uninstallElements.feedbackStatus.classList.toggle("is-visible", Boolean(message));
  uninstallElements.feedbackStatus.classList.toggle("is-error", isError);
};

const updateSelectedReasonFeedback = () => {
  const reasonCopy = getReasonCopy(getSelectedReasonId());

  if (!reasonCopy) {
    uninstallElements.selectedReasonFeedback.textContent = getCopy("noReason");
    return;
  }

  const labelElement = document.createElement("strong");

  labelElement.textContent = reasonCopy.label;
  uninstallElements.selectedReasonFeedback.replaceChildren(
    getCopy("selectedPrefix"),
    labelElement
  );
};

const syncReasonSelection = () => {
  uninstallElements.feedbackReasonInput.value = getSelectedReason();
  uninstallElements.sendFeedbackButton.disabled = !hasSelectedReason()
    || !hasConfiguredFeedbackBackend();
  updateSelectedReasonFeedback();
};

const setFeedbackControlsDisabled = (isDisabled) => {
  uninstallElements.reasonInputs.forEach((input) => {
    input.disabled = isDisabled;
  });
  uninstallElements.contactEmail.disabled = isDisabled;
  uninstallElements.feedbackMessage.disabled = isDisabled;
  uninstallElements.openLanguageButton.disabled = isDisabled;
  uninstallElements.languageOptionButtons.forEach((button) => {
    button.disabled = isDisabled;
  });
  uninstallElements.sendFeedbackButton.disabled =
    isDisabled || !hasSelectedReason() || !hasConfiguredFeedbackBackend();
};

const prepareHiddenFields = () => {
  uninstallElements.feedbackVersionInput.value = getVersionLabel();
  uninstallElements.feedbackDateInput.value = new Date().toISOString();
  uninstallElements.feedbackBrowserInput.value = navigator.userAgent;
  uninstallElements.feedbackLanguageInput.value = activeLanguage;
};

const buildFeedbackPayload = () => {
  const message = uninstallElements.feedbackMessage.value.trim().slice(
    0,
    feedbackMessageMaxLength
  )
    || "O usuário não informou detalhes adicionais.";
  const contactEmail = uninstallElements.contactEmail.value.trim().slice(
    0,
    feedbackEmailMaxLength
  );

  return {
    comentario: message,
    data: new Date().toISOString(),
    email: contactEmail,
    idioma: activeLanguage,
    motivo: getSelectedReason(),
    navegador: navigator.userAgent,
    responseOrigin: window.location.origin,
    startedAt: feedbackPageLoadedAt,
    submissionId: crypto.randomUUID(),
    versao: getVersionLabel(),
    website: ""
  };
};

const clearOptionalFields = () => {
  uninstallElements.feedbackMessage.value = "";
  uninstallElements.contactEmail.value = "";
};

const createFeedbackTransportForm = (feedbackPayload) => {
  const transportForm = document.createElement("form");

  transportForm.action = getConfiguredFeedbackBackendUrl();
  transportForm.hidden = true;
  transportForm.method = "POST";
  transportForm.target = uninstallElements.feedbackDeliveryFrame.name;

  Object.entries(feedbackPayload).forEach(([name, value]) => {
    const input = document.createElement("input");

    input.name = name;
    input.type = "hidden";
    input.value = value;
    transportForm.append(input);
  });

  return transportForm;
};

const submitFeedbackToBackend = (feedbackPayload) => new Promise((
  resolve,
  reject
) => {
  if (!hasConfiguredFeedbackBackend()) {
    reject(new Error("Serviço de feedback não configurado."));
    return;
  }

  const transportForm = createFeedbackTransportForm(feedbackPayload);

  const cleanup = () => {
    window.clearTimeout(timeoutId);
    window.removeEventListener("message", handleFeedbackResponse);
    transportForm.remove();
  };

  const handleFeedbackResponse = (event) => {
    const isExpectedResponse = isTrustedFeedbackResponseOrigin(event.origin)
      && event.data?.source === feedbackResponseSource
      && event.data?.submissionId === feedbackPayload.submissionId;

    if (!isExpectedResponse) {
      return;
    }

    cleanup();

    if (event.data.success === true) {
      resolve();
      return;
    }

    reject(new Error(event.data.message || "O envio do feedback falhou."));
  };

  window.addEventListener("message", handleFeedbackResponse);
  document.body.append(transportForm);

  const timeoutId = window.setTimeout(() => {
    cleanup();
    reject(new Error("O serviço de feedback não respondeu a tempo."));
  }, feedbackResponseTimeoutInMilliseconds);

  try {
    transportForm.submit();
  } catch (error) {
    cleanup();
    reject(error);
  }
});

const finishFeedbackSubmission = () => {
  localStorage.setItem(feedbackLastSubmitAtKey, String(Date.now()));
  updateStatus(getCopy("formSubmitSuccess"));
  clearOptionalFields();
  prepareHiddenFields();
};

const getFeedbackCooldownSeconds = () => {
  const lastSubmitAt = Number(localStorage.getItem(feedbackLastSubmitAtKey));

  if (!Number.isFinite(lastSubmitAt)) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil(
      (lastSubmitAt + feedbackCooldownInMilliseconds - Date.now()) / 1000
    )
  );
};

const submitFeedback = async () => {
  if (isSendingFeedback || !hasSelectedReason()) {
    return;
  }

  if (!hasConfiguredFeedbackBackend()) {
    updateStatus(getCopy("feedbackNotConfigured"), {
      isError: true
    });
    return;
  }

  const cooldownSeconds = getFeedbackCooldownSeconds();

  if (cooldownSeconds > 0) {
    updateStatus(
      getCopy("formSubmitRateLimit").replace(
        "{seconds}",
        String(cooldownSeconds)
      ),
      {
        isError: true
      }
    );
    return;
  }

  isSendingFeedback = true;
  prepareHiddenFields();
  updateStatus(getCopy("formSubmitLoading"));

  const feedbackPayload = buildFeedbackPayload();

  setFeedbackControlsDisabled(true);

  try {
    await submitFeedbackToBackend(feedbackPayload);
    finishFeedbackSubmission();
  } catch (error) {
    console.error("Erro ao enviar feedback:", error);

    updateStatus(getCopy("formSubmitError"), {
      isError: true
    });
  } finally {
    isSendingFeedback = false;
    setFeedbackControlsDisabled(false);
  }
};

const updateLanguageOptions = () => {
  uninstallElements.languageOptionButtons.forEach((button) => {
    const isSelected = button.dataset.languageOption === activeLanguage;

    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
};

const openLanguageDialog = () => {
  uninstallElements.languageDialog.hidden = false;
  document.body.classList.add("has-open-dialog");

  const selectedButton = document.querySelector(
    `[data-language-option="${activeLanguage}"]`
  );

  (selectedButton || uninstallElements.closeLanguageButton).focus();
};

const closeLanguageDialog = ({ shouldFocusTrigger = false } = {}) => {
  uninstallElements.languageDialog.hidden = true;
  document.body.classList.remove("has-open-dialog");

  if (shouldFocusTrigger) {
    uninstallElements.openLanguageButton.focus();
  }
};

const updateLocalizedText = () => {
  document.title = getCopy("documentTitle");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = getCopy(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute(
      "aria-label",
      getCopy(element.dataset.i18nAriaLabel)
    );
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = getCopy(element.dataset.i18nPlaceholder);
  });

  uninstallElements.reasonTextElements.forEach((element) => {
    const reasonCopy = getReasonCopy(element.dataset.reasonText);

    if (reasonCopy) {
      element.textContent = reasonCopy.text;
    }
  });

  uninstallElements.extensionVersion.textContent = getCopy("versionLabel");
  uninstallElements.pageRoot.lang = activeLanguage;
  document.documentElement.lang = activeLanguage;
  updateUninstallThemeButtonLabel({
    isDarkTheme: document.documentElement.dataset.theme === "dark"
  });
  updateLanguageOptions();
  syncReasonSelection();
  prepareHiddenFields();
};

const setLanguage = (language) => {
  activeLanguage = translations[language] ? language : defaultLanguage;
  localStorage.setItem(languageStorageKey, activeLanguage);
  updateLocalizedText();
};

const handleFeedbackSubmit = (event) => {
  event.preventDefault();

  if (!hasSelectedReason()) {
    updateStatus(getCopy("reasonRequired"), {
      isError: true
    });
    return;
  }

  submitFeedback();
};

const initializePage = () => {
  const storedLanguage = localStorage.getItem(languageStorageKey)
    || localStorage.getItem(legacyLanguageStorageKey);

  activeLanguage = translations[storedLanguage]
    ? storedLanguage
    : defaultLanguage;
  setLanguage(activeLanguage);
};

const updateFeedbackAvailability = () => {
  syncReasonSelection();

  if (!hasConfiguredFeedbackBackend()) {
    updateStatus(getCopy("feedbackNotConfigured"), {
      isError: true
    });
  }
};

uninstallElements.reasonInputs.forEach((input) => {
  input.addEventListener("change", () => {
    syncReasonSelection();

    if (hasConfiguredFeedbackBackend()) {
      updateStatus("");
    }
  });
});

uninstallElements.themeToggleButton?.addEventListener("click", () => {
  toggleUninstallTheme().catch((error) => {
    console.error("Erro ao alternar tema da desinstalação:", error);
  });
});

uninstallElements.openLanguageButton.addEventListener("click", () => {
  openLanguageDialog();
});

uninstallElements.closeLanguageButton.addEventListener("click", () => {
  closeLanguageDialog({
    shouldFocusTrigger: true
  });
});

uninstallElements.languageDialog.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-language]")) {
    closeLanguageDialog({
      shouldFocusTrigger: true
    });
  }
});

uninstallElements.languageOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.languageOption);
    updateFeedbackAvailability();
    closeLanguageDialog({
      shouldFocusTrigger: true
    });
  });
});

uninstallElements.feedbackForm.addEventListener("submit", handleFeedbackSubmit);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !uninstallElements.languageDialog.hidden) {
    closeLanguageDialog({
      shouldFocusTrigger: true
    });
  }
});

initializePage();
updateFeedbackAvailability();
configureChromeWebStoreLink();
initFloatingTools();
loadUninstallTheme().catch((error) => {
  console.error("Erro ao carregar tema da desinstalação:", error);
});
