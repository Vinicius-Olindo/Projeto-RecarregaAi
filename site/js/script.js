// RecarregaAi! 2.3.9

import { appConfig } from "./modules/config.js";
import { initFloatingTools } from "./modules/floating-tools.js";
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
    applications: "Aplicações",
    autoStart: "Auto-início",
    autoStartText: "Sites favoritos podem iniciar o timer ao carregar.",
    backToTop: "Voltar ao início",
    closeDialog: "Fechar",
    contactChannelsLabel: "Canais de contato",
    documentTitle: "Bem-vindo ao RecarregaAi!",
    faq: "FAQ",
    faqAnswer1:
      "Não. A ação principal trabalha na guia atual. Timers ativos em outras guias continuam independentes.",
    faqAnswer2:
      "Sim. Cada guia pode ter seu próprio timer, então dois sistemas podem ficar ativos ao mesmo tempo.",
    faqAnswer3:
      "A guia pausa enquanto um campo, áudio, vídeo, gravação ou visualização dedicada de imagem está ativo e retoma após três segundos de segurança.",
    faqAnswer4:
      "Eles permitem auto-início. Quando uma guia abre um site cadastrado, o timer pode começar sozinho.",
    faqQuestion1: "O RecarregaAi! limpa o cache de todas as guias?",
    faqQuestion2: "Posso deixar dois sites recarregando juntos?",
    faqQuestion3: "O que acontece se eu estiver digitando ou usando mídia?",
    faqQuestion4: "Para que servem os sites favoritos?",
    faqTitle: "Perguntas frequentes",
    feature1Body:
      "Remove cache do site aberto e recarrega a página para buscar conteúdo atualizado.",
    feature1Title: "Limpeza com recarga",
    feature2Body:
      "Escolha rapidamente entre 3, 5 ou 10 minutos para começar sem configurar demais.",
    feature2Title: "Tempos prontos",
    feature3Body:
      "Defina seu próprio intervalo em minutos quando o fluxo pede mais controle.",
    feature3Title: "Tempo personalizado",
    feature4Body:
      "Mantenha Drive e outro sistema recarregando ao mesmo tempo, cada um em sua guia.",
    feature4Title: "Timer por guia",
    feature5Body:
      "Quando você está digitando, ouvindo áudio, vendo vídeo, gravando ou visualizando uma imagem aberta, a guia pausa para evitar perdas.",
    feature5Title: "Pausa inteligente",
    feature6Body:
      "Cadastre endereços para o RecarregaAi! iniciar sozinho quando a página abrir.",
    feature6Title: "Sites favoritos",
    features: "Funcionalidades",
    featuresDescription:
      "Em Manifest V3, a extensão junta limpeza de cache, recarregamento e automação em uma experiência simples para o dia a dia.",
    featuresEyebrow: "Visão geral",
    featuresTitle: "Funcionalidades principais",
    finalBody:
      "Fixe o ícone da extensão, abra a guia desejada e escolha o tempo que combina com seu fluxo.",
    finalTitle: "Pronto para usar o RecarregaAi!",
    footerDeveloper: "Desenvolvido por:",
    footerFeedback: "Feedback",
    footerHome: "Início",
    footerLegal: "© RecarregaAi! 2.3.9. Todos os direitos reservados.",
    footerPrivacy: "Privacidade",
    heroDescription:
      "Use timers por guia, limpe o cache do site aberto e mantenha sistemas como Drive, painéis internos e páginas de trabalho sempre atualizados.",
    heroEyebrow: "Cache limpo. Guia no ritmo certo.",
    heroTitle: "Páginas sempre novas,",
    heroTitleAccent: "sem cache antigo.",
    installButton: "Adicionar ao Chrome",
    languageDialogDescription:
      "Escolha o idioma preferido para navegar pelo RecarregaAi!.",
    languageDialogTitle: "Idioma",
    languageGridLabel: "Idiomas disponíveis",
    languageLabel: "Idioma",
    linksLabel: "Links finais",
    quickActionsLabel: "Ações rápidas",
    startNow: "Começar agora",
    startUsing: "Começar a usar",
    themeToDark: "Tema escuro",
    themeToLight: "Tema claro",
    trustCounter: "Contador visível",
    trustCounterText: "O ícone mostra a contagem da guia ativa em tempo real.",
    trustLabel:
      "Feito para fluxos que precisam de páginas atualizadas com cuidado",
    trustTab: "Controle por guia",
    trustTabText: "Ative somente as guias que realmente precisam recarregar.",
    trustTyping: "Proteção ativa",
    trustTypingText:
      "O timer pausa durante digitação, áudio, vídeo, gravação ou visualização dedicada de imagem.",
    useCase1Body:
      "Quando você acompanha arquivos que mudam com frequência, o timer ajuda a atualizar a página sem precisar limpar cache manualmente.",
    useCase1Small: "Mantenha listas, pastas e documentos sempre renovados.",
    useCase1Title: "Drive e documentos compartilhados",
    useCase2Body:
      "Ative apenas o painel que precisa ficar vivo. Outras guias seguem sem timer, sem contador e sem recarregamentos inesperados.",
    useCase2Small: "Bom para dashboards internos, filas e sistemas de trabalho.",
    useCase2Title: "Painéis operacionais",
    useCase3Body:
      "A pausa inteligente reduz o risco de recarregar enquanto você preenche uma resposta, edita um campo importante ou usa áudio.",
    useCase3Small: "Acompanhe telas que recebem chamados, pedidos ou retornos.",
    useCase3Title: "Atendimento e suporte",
    useCase4Body:
      "Use intervalos curtos quando precisa acompanhar novidades, e pare o timer quando a guia deixar de ser importante.",
    useCase4Small: "Atualize páginas que mudam ao longo do dia.",
    useCase4Title: "Vagas, listas e oportunidades",
    useCases: "Usos",
    useCasesDescription:
      "Ideias de uso para páginas que precisam de atualização constante, mas sem perder controle sobre cada guia.",
    useCasesTitle: "Onde o RecarregaAi! ajuda",
    viewFeatures: "Ver funcionalidades"
  },
  en: {
    applications: "Use cases",
    autoStart: "Auto-start",
    autoStartText: "Favorite sites can start the timer when they load.",
    backToTop: "Back to top",
    closeDialog: "Close",
    contactChannelsLabel: "Contact channels",
    documentTitle: "Welcome to RecarregaAi!",
    faq: "FAQ",
    faqAnswer1:
      "No. The main action works on the current tab. Active timers in other tabs stay independent.",
    faqAnswer2:
      "Yes. Each tab can have its own timer, so two systems can stay active at the same time.",
    faqAnswer3:
      "The tab pauses while a field, audio, video, recording or dedicated image view is active and resumes after a three-second safety period.",
    faqAnswer4:
      "They enable auto-start. When a tab opens a registered site, the timer can start by itself.",
    faqQuestion1: "Does RecarregaAi! clear the cache of every tab?",
    faqQuestion2: "Can I keep two sites refreshing together?",
    faqQuestion3: "What happens if I am typing or using media?",
    faqQuestion4: "What are favorite sites for?",
    faqTitle: "Frequently asked questions",
    feature1Body:
      "Removes cache from the open site and reloads the page to fetch updated content.",
    feature1Title: "Cleanup with reload",
    feature2Body:
      "Quickly choose 3, 5 or 10 minutes to start without extra setup.",
    feature2Title: "Ready-made times",
    feature3Body:
      "Set your own interval in minutes when your workflow needs more control.",
    feature3Title: "Custom time",
    feature4Body:
      "Keep Drive and another system refreshing at the same time, each in its own tab.",
    feature4Title: "Timer by tab",
    feature5Body:
      "When you are typing, listening to audio, watching video, recording or viewing an opened image, the tab pauses to avoid losses.",
    feature5Title: "Smart pause",
    feature6Body:
      "Register addresses so RecarregaAi! can start automatically when the page opens.",
    feature6Title: "Favorite sites",
    features: "Features",
    featuresDescription:
      "In Manifest V3, the extension combines cache cleanup, reload and automation in a simple daily experience.",
    featuresEyebrow: "Overview",
    featuresTitle: "Main features",
    finalBody:
      "Pin the extension icon, open the desired tab and choose the time that matches your workflow.",
    finalTitle: "Ready to use RecarregaAi!",
    footerDeveloper: "Developed by:",
    footerFeedback: "Feedback",
    footerHome: "Home",
    footerLegal: "© RecarregaAi! 2.3.9. All rights reserved.",
    footerPrivacy: "Privacy",
    heroDescription:
      "Use timers by tab, clear the open site's cache and keep systems such as Drive, internal dashboards and work pages always updated.",
    heroEyebrow: "Clean cache. Tab on the right rhythm.",
    heroTitle: "Always fresh pages,",
    heroTitleAccent: "without old cache.",
    installButton: "Add to Chrome",
    languageDialogDescription:
      "Choose your preferred language to browse RecarregaAi!.",
    languageDialogTitle: "Language",
    languageGridLabel: "Available languages",
    languageLabel: "Language",
    linksLabel: "Footer links",
    quickActionsLabel: "Quick actions",
    startNow: "Start now",
    startUsing: "Start using",
    themeToDark: "Dark theme",
    themeToLight: "Light theme",
    trustCounter: "Visible counter",
    trustCounterText: "The icon shows the active tab countdown in real time.",
    trustLabel: "Made for workflows that need carefully refreshed pages",
    trustTab: "Control by tab",
    trustTabText: "Enable only the tabs that really need to reload.",
    trustTyping: "Typing protection",
    trustTypingText:
      "The timer pauses during typing, audio, video, recording or dedicated image viewing.",
    useCase1Body:
      "When you follow files that change often, the timer helps refresh the page without manually clearing cache.",
    useCase1Small: "Keep lists, folders and documents refreshed.",
    useCase1Title: "Drive and shared documents",
    useCase2Body:
      "Enable only the dashboard that needs to stay alive. Other tabs continue without timer, counter or unexpected reloads.",
    useCase2Small: "Good for internal dashboards, queues and work systems.",
    useCase2Title: "Operational dashboards",
    useCase3Body:
      "Smart pause reduces the risk of reloading while you fill a response, edit an important field or use audio.",
    useCase3Small: "Follow screens that receive tickets, orders or updates.",
    useCase3Title: "Service and support",
    useCase4Body:
      "Use short intervals when you need to follow updates, and stop the timer when the tab stops being important.",
    useCase4Small: "Refresh pages that change throughout the day.",
    useCase4Title: "Jobs, lists and opportunities",
    useCases: "Uses",
    useCasesDescription:
      "Ideas for pages that need constant refresh, without losing control over each tab.",
    useCasesTitle: "Where RecarregaAi! helps",
    viewFeatures: "View features"
  },
  es: {
    applications: "Aplicaciones",
    autoStart: "Auto-inicio",
    autoStartText: "Los sitios favoritos pueden iniciar el timer al cargar.",
    backToTop: "Volver al inicio",
    closeDialog: "Cerrar",
    contactChannelsLabel: "Canales de contacto",
    documentTitle: "Bienvenido a RecarregaAi!",
    faq: "FAQ",
    faqAnswer1:
      "No. La acción principal trabaja en la pestaña actual. Los timers activos en otras pestañas siguen independientes.",
    faqAnswer2:
      "Sí. Cada pestaña puede tener su propio timer, así que dos sistemas pueden estar activos al mismo tiempo.",
    faqAnswer3:
      "La pestaña se pausa mientras hay un campo, audio, video, grabación o visualización dedicada de imagen activa y se reanuda tras tres segundos de seguridad.",
    faqAnswer4:
      "Permiten auto-inicio. Cuando una pestaña abre un sitio registrado, el timer puede comenzar solo.",
    faqQuestion1: "¿RecarregaAi! limpia la caché de todas las pestañas?",
    faqQuestion2: "¿Puedo dejar dos sitios recargando juntos?",
    faqQuestion3: "¿Qué pasa si estoy escribiendo o usando medios?",
    faqQuestion4: "¿Para qué sirven los sitios favoritos?",
    faqTitle: "Preguntas frecuentes",
    feature1Body:
      "Elimina la caché del sitio abierto y recarga la página para buscar contenido actualizado.",
    feature1Title: "Limpieza con recarga",
    feature2Body:
      "Elige rápidamente entre 3, 5 o 10 minutos para empezar sin configurar demasiado.",
    feature2Title: "Tiempos listos",
    feature3Body:
      "Define tu propio intervalo en minutos cuando el flujo necesita más control.",
    feature3Title: "Tiempo personalizado",
    feature4Body:
      "Mantén Drive y otro sistema recargando al mismo tiempo, cada uno en su pestaña.",
    feature4Title: "Timer por pestaña",
    feature5Body:
      "Cuando estás escribiendo, escuchando audio, viendo video, grabando o visualizando una imagen abierta, la pestaña se pausa para evitar pérdidas.",
    feature5Title: "Pausa inteligente",
    feature6Body:
      "Registra direcciones para que RecarregaAi! se inicie solo cuando la página se abra.",
    feature6Title: "Sitios favoritos",
    features: "Funcionalidades",
    featuresDescription:
      "En Manifest V3, la extensión reúne limpieza de caché, recarga y automatización en una experiencia simple para el día a día.",
    featuresEyebrow: "Visión general",
    featuresTitle: "Funcionalidades principales",
    finalBody:
      "Fija el icono de la extensión, abre la pestaña deseada y elige el tiempo que combina con tu flujo.",
    finalTitle: "Listo para usar RecarregaAi!",
    footerDeveloper: "Desarrollado por:",
    footerFeedback: "Feedback",
    footerHome: "Inicio",
    footerLegal: "© RecarregaAi! 2.3.9. Todos los derechos reservados.",
    footerPrivacy: "Privacidad",
    heroDescription:
      "Usa timers por pestaña, limpia la caché del sitio abierto y mantén sistemas como Drive, paneles internos y páginas de trabajo siempre actualizados.",
    heroEyebrow: "Caché limpia. Pestaña en el ritmo correcto.",
    heroTitle: "Páginas siempre nuevas,",
    heroTitleAccent: "sin caché antigua.",
    installButton: "Agregar a Chrome",
    languageDialogDescription:
      "Elige el idioma preferido para navegar por RecarregaAi!.",
    languageDialogTitle: "Idioma",
    languageGridLabel: "Idiomas disponibles",
    languageLabel: "Idioma",
    linksLabel: "Enlaces finales",
    quickActionsLabel: "Acciones rápidas",
    startNow: "Comenzar ahora",
    startUsing: "Comenzar a usar",
    themeToDark: "Tema oscuro",
    themeToLight: "Tema claro",
    trustCounter: "Contador visible",
    trustCounterText: "El icono muestra la cuenta de la pestaña activa en tiempo real.",
    trustLabel:
      "Hecho para flujos que necesitan páginas actualizadas con cuidado",
    trustTab: "Control por pestaña",
    trustTabText: "Activa solo las pestañas que realmente necesitan recargar.",
    trustTyping: "Protección activa",
    trustTypingText:
      "El timer se pausa durante escritura, audio, video, grabación o visualización dedicada de imagen.",
    useCase1Body:
      "Cuando acompañas archivos que cambian con frecuencia, el timer ayuda a actualizar la página sin limpiar caché manualmente.",
    useCase1Small: "Mantén listas, carpetas y documentos siempre renovados.",
    useCase1Title: "Drive y documentos compartidos",
    useCase2Body:
      "Activa solo el panel que necesita estar vivo. Otras pestañas siguen sin timer, contador ni recargas inesperadas.",
    useCase2Small: "Bueno para dashboards internos, filas y sistemas de trabajo.",
    useCase2Title: "Paneles operacionales",
    useCase3Body:
      "La pausa inteligente reduce el riesgo de recargar mientras completas una respuesta, editas un campo importante o usas audio.",
    useCase3Small: "Acompaña pantallas que reciben tickets, pedidos o retornos.",
    useCase3Title: "Atención y soporte",
    useCase4Body:
      "Usa intervalos cortos cuando necesitas acompañar novedades y detén el timer cuando la pestaña deje de ser importante.",
    useCase4Small: "Actualiza páginas que cambian durante el día.",
    useCase4Title: "Vacantes, listas y oportunidades",
    useCases: "Usos",
    useCasesDescription:
      "Ideas de uso para páginas que necesitan actualización constante, sin perder control sobre cada pestaña.",
    useCasesTitle: "Dónde ayuda RecarregaAi!",
    viewFeatures: "Ver funcionalidades"
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
  themeToggleLabel: document.querySelector("#theme-toggle-label")
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
    "features",
    "useCases",
    "faq"
  ]);
  setText(".chrome-install-button__label", "installButton");
  setAttribute(".chrome-install-button", "aria-label", "installButton");
  setText(".hero__eyebrow", "heroEyebrow");
  setHeroTitle();
  setText(".hero__description", "heroDescription");
  setText("#finish-welcome-button", "startUsing");
  setText(".hero__actions .button--secondary", "viewFeatures");
  setText(".trust-panel__label", "trustLabel");
  setTexts(".trust-item strong", [
    "trustCounter",
    "trustTab",
    "trustTyping",
    "autoStart"
  ]);
  setTexts(".trust-item p", [
    "trustCounterText",
    "trustTabText",
    "trustTypingText",
    "autoStartText"
  ]);
  setText("#features .section__eyebrow", "featuresEyebrow");
  setText("#features-title", "featuresTitle");
  setText("#features .section__header p:last-child", "featuresDescription");
  setTexts(".feature-card h3", [
    "feature1Title",
    "feature2Title",
    "feature3Title",
    "feature4Title",
    "feature5Title",
    "feature6Title"
  ]);
  setTexts(".feature-card p", [
    "feature1Body",
    "feature2Body",
    "feature3Body",
    "feature4Body",
    "feature5Body",
    "feature6Body"
  ]);
  setText("#use-cases .section__eyebrow", "applications");
  setText("#use-cases-title", "useCasesTitle");
  setText("#use-cases .section__header p:last-child", "useCasesDescription");
  setTexts(".accordion-card summary strong", [
    "useCase1Title",
    "useCase2Title",
    "useCase3Title",
    "useCase4Title"
  ]);
  setTexts(".accordion-card summary small", [
    "useCase1Small",
    "useCase2Small",
    "useCase3Small",
    "useCase4Small"
  ]);
  setTexts(".accordion-card > p", [
    "useCase1Body",
    "useCase2Body",
    "useCase3Body",
    "useCase4Body"
  ]);
  setText("#faq .section__eyebrow", "faq");
  setText("#faq-title", "faqTitle");
  setTexts(".faq-item summary", [
    "faqQuestion1",
    "faqQuestion2",
    "faqQuestion3",
    "faqQuestion4"
  ]);
  setTexts(".faq-item p", [
    "faqAnswer1",
    "faqAnswer2",
    "faqAnswer3",
    "faqAnswer4"
  ]);
  setText("#final-title", "finalTitle");
  setText(".final-cta__content p", "finalBody");
  setText(".final-cta [data-install-cta]", "startNow");
  setTexts(".privacy-footer__nav a", [
    "footerHome",
    "footerPrivacy",
    "footerFeedback"
  ]);
  setText(".privacy-footer__legal", "footerLegal");
  setText(".privacy-footer__developer-label", "footerDeveloper");
  setText("#open-language-button .floating-action__label", "languageLabel");
  setText("#back-to-top-button .floating-action__label", "backToTop");
  setText("#language-dialog-title", "languageDialogTitle");
  setText(".language-dialog__description", "languageDialogDescription");

  setAttribute(".privacy-footer__nav", "aria-label", "linksLabel");
  setAttribute(".privacy-footer__social", "aria-label", "contactChannelsLabel");
  setAttribute(".floating-tools", "aria-label", "quickActionsLabel");
  setAttribute("#open-language-button", "aria-label", "languageLabel");
  setAttribute("#back-to-top-button", "aria-label", "backToTop");
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

  if (welcomeElements.themeToggleLabel) {
    welcomeElements.themeToggleLabel.textContent = nextLabel;
  }
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
initFloatingTools();
