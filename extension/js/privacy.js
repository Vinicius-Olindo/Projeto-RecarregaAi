// RecarregaAi! 2.5.0

import { initFloatingTools } from "./modules/floating-tools.js";
import { loadPageI18n } from "./modules/i18n.js";
import {
  defaultLanguage,
  initLanguageDialog
} from "./modules/language-dialog.js";
import {
  loadThemePreference,
  toggleThemePreference,
  watchSystemTheme
} from "./modules/theme.js";
import { enforceTopLevelPublicPage } from "./modules/public-page-security.js";

enforceTopLevelPublicPage();

const policyNavLinks = [...document.querySelectorAll(".policy-nav a[href^='#']")];
const privacyHeader = document.querySelector(".privacy-header");
const privacyElements = {
  themeToggleButton: document.querySelector("#theme-toggle-button"),
  themeToggleLabel: document.querySelector("#theme-toggle-label")
};
const policyHeadings = policyNavLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const sectionTopGap = 34;
const policyNavigationReleaseDelay = 900;

let privacyTranslations = {};
let activePrivacyLanguage = "pt-BR";
const privacyHtmlKeys = new Set([
  "sectionDataBody3",
  "sectionTypingBody1"
]);

const sanitizeAndRenderHtml = (container, htmlString) => {
  const fragment = document.createDocumentFragment();
  const codeTagPattern = /<code>([^<]*)<\/code>/g;
  let lastIndex = 0;
  let match;

  while ((match = codeTagPattern.exec(htmlString)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(htmlString.slice(lastIndex, match.index))
      );
    }

    const codeElement = document.createElement("code");

    codeElement.textContent = match[1];
    fragment.appendChild(codeElement);
    lastIndex = codeTagPattern.lastIndex;
  }

  if (lastIndex < htmlString.length) {
    fragment.appendChild(
      document.createTextNode(htmlString.slice(lastIndex))
    );
  }

  container.textContent = "";
  container.appendChild(fragment);
};

const getPrivacyCopy = (key) => (
  privacyTranslations[activePrivacyLanguage]?.[key]
  || privacyTranslations["pt-BR"]?.[key]
  || key
);

const setText = (selector, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = getPrivacyCopy(key);
  }
};

const setTexts = (selector, keys) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    const key = keys[index];

    if (key) {
      element.textContent = getPrivacyCopy(key);
    }
  });
};

const setAttribute = (selector, attribute, key) => {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute(attribute, getPrivacyCopy(key));
  }
};

const setSectionText = (headingId, headingKey, paragraphKeys) => {
  const heading = document.getElementById(headingId);
  const section = heading?.closest(".policy-section");

  if (!section) {
    return;
  }

  heading.textContent = getPrivacyCopy(headingKey);
  section.querySelectorAll("p").forEach((paragraph, index) => {
    const key = paragraphKeys[index];

    if (key) {
      if (privacyHtmlKeys.has(key)) {
        sanitizeAndRenderHtml(paragraph, getPrivacyCopy(key));
        return;
      }

      paragraph.textContent = getPrivacyCopy(key);
    }
  });
};

const updatePrivacyThemeButtonLabel = ({ isDarkTheme }) => {
  const nextThemeLabel = isDarkTheme
    ? getPrivacyCopy("themeToLight")
    : getPrivacyCopy("themeToDark");

  privacyElements.themeToggleButton?.setAttribute(
    "aria-pressed",
    String(isDarkTheme)
  );
  privacyElements.themeToggleButton?.setAttribute("aria-label", nextThemeLabel);
  privacyElements.themeToggleButton?.setAttribute("title", nextThemeLabel);

  if (privacyElements.themeToggleLabel) {
    privacyElements.themeToggleLabel.textContent = nextThemeLabel;
  }
};

const loadPrivacyTranslations = async (language) => {
  const { translations } = await loadPageI18n("privacy", language);

  privacyTranslations = translations;
};

const loadPrivacyTheme = async () => {
  await loadThemePreference({
    onChange: updatePrivacyThemeButtonLabel
  });
  watchSystemTheme({ onChange: updatePrivacyThemeButtonLabel });
};

const togglePrivacyTheme = async () => {
  await toggleThemePreference({
    onChange: updatePrivacyThemeButtonLabel
  });
};

const setActivePolicyNavLink = (headingId) => {
  policyNavLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${headingId}`;

    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "true");
      return;
    }

    link.removeAttribute("aria-current");
  });
};

const getScrollTargetTop = (heading) => {
  const section = heading.closest(".policy-section") || heading;
  const headerHeight = privacyHeader?.getBoundingClientRect().height || 0;
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;

  return Math.max(0, sectionTop - headerHeight - sectionTopGap);
};

const getPolicyHeadingViewportTop = (heading) => {
  const section = heading.closest(".policy-section") || heading;

  return section.getBoundingClientRect().top;
};

const getActivePolicyHeadingId = () => {
  const headerBottom = privacyHeader?.getBoundingClientRect().bottom || 0;
  const activeLine = headerBottom + sectionTopGap + 8;
  const pageBottom = window.scrollY + window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  let activeHeading = policyHeadings[0];

  if (pageBottom >= documentHeight - 4) {
    return policyHeadings[policyHeadings.length - 1]?.id;
  }

  policyHeadings.forEach((heading) => {
    if (getPolicyHeadingViewportTop(heading) <= activeLine) {
      activeHeading = heading;
    }
  });

  return activeHeading?.id;
};

let isPolicyNavSyncQueued = false;
let pendingPolicyNavigationId = null;
let policyNavigationReleaseTimerId = null;

const finishPolicyNavigation = () => {
  if (!pendingPolicyNavigationId) {
    return;
  }

  pendingPolicyNavigationId = null;
  window.clearTimeout(policyNavigationReleaseTimerId);
  policyNavigationReleaseTimerId = null;
  syncActivePolicyNavLink();
};

const startPolicyNavigation = (headingId) => {
  pendingPolicyNavigationId = headingId;
  window.clearTimeout(policyNavigationReleaseTimerId);
  policyNavigationReleaseTimerId = window.setTimeout(
    finishPolicyNavigation,
    policyNavigationReleaseDelay
  );
};

const syncActivePolicyNavLink = () => {
  if (isPolicyNavSyncQueued) {
    return;
  }

  isPolicyNavSyncQueued = true;

  window.requestAnimationFrame(() => {
    isPolicyNavSyncQueued = false;
    const activeHeadingId = pendingPolicyNavigationId
      || getActivePolicyHeadingId();

    if (activeHeadingId) {
      setActivePolicyNavLink(activeHeadingId);
    }
  });
};

const applyPrivacyLanguage = (language) => {
  activePrivacyLanguage = privacyTranslations[language]
    ? language
    : defaultLanguage;
  document.title = getPrivacyCopy("documentTitle");

  setTexts(".header-nav a", [
    "headerPolicy",
    "headerPermissions",
    "headerContact"
  ]);
  setText(".header-link", "headerReturn");
  setText(".eyebrow", "heroEyebrow");
  setText("#privacy-title", "heroTitle");
  setText(".policy-meta", "heroMeta");
  setText(".hero__content > p:last-child", "heroIntro");
  setTexts(".trust-panel span", [
    "trustDataSold",
    "trustProcessing",
    "trustFeedback"
  ]);
  setTexts(".trust-panel strong", [
    "trustNo",
    "trustLocal",
    "trustOptional"
  ]);
  setTexts(".summary-grid h2", [
    "summaryLocalTitle",
    "summaryNotCollectedTitle",
    "summaryFeedbackTitle"
  ]);
  setTexts(".summary-grid p", [
    "summaryLocalBody",
    "summaryNotCollectedBody",
    "summaryFeedbackBody"
  ]);
  setText(".policy-nav p", "policyNavTitle");
  setTexts(".policy-nav a", [
    "navData",
    "navNotCollected",
    "navTyping",
    "navLocalStorage",
    "navFeedback",
    "navSharing",
    "navLimitedUse",
    "navPermissions",
    "navControl",
    "navContact"
  ]);

  setSectionText("data-title", "sectionDataTitle", [
    "sectionDataBody1",
    "sectionDataBody2",
    "sectionDataBody3"
  ]);
  setSectionText("not-collected-title", "sectionNotCollectedTitle", [
    "sectionNotCollectedBody1",
    "sectionNotCollectedBody2"
  ]);
  setSectionText("typing-title", "sectionTypingTitle", [
    "sectionTypingBody1",
    "sectionTypingBody2"
  ]);
  setSectionText("local-storage-title", "sectionLocalStorageTitle", [
    "sectionLocalStorageBody1",
    "sectionLocalStorageBody2"
  ]);
  setTexts("#local-storage-title ~ .policy-list li", [
    "sectionLocalStorageList1",
    "sectionLocalStorageList2",
    "sectionLocalStorageList3",
    "sectionLocalStorageList4",
    "sectionLocalStorageList5",
    "sectionLocalStorageList6",
    "sectionLocalStorageList7"
  ]);
  setSectionText("feedback-title", "sectionFeedbackTitle", [
    "sectionFeedbackBody1",
    "sectionFeedbackBody2",
    "sectionFeedbackBody3"
  ]);
  setSectionText("sharing-title", "sectionSharingTitle", [
    "sectionSharingBody1",
    "sectionSharingBody2"
  ]);
  setSectionText("limited-use-title", "sectionLimitedUseTitle", [
    "sectionLimitedUseBody1",
    "sectionLimitedUseBody2"
  ]);
  setSectionText("permissions-title", "sectionPermissionsTitle", [
    "sectionPermissionsBody"
  ]);
  setTexts(".permission-list dd", [
    "permissionBrowsingData",
    "permissionStorage",
    "permissionActiveTab",
    "permissionScripting",
    "permissionAlarms",
    "permissionHost"
  ]);
  setSectionText("control-title", "sectionControlTitle", [
    "sectionControlBody1",
    "sectionControlBody2",
    "sectionControlBody3",
    "sectionControlBody4"
  ]);
  setSectionText("contact-title", "sectionContactTitle", [
    "sectionContactBody"
  ]);

  setTexts(".privacy-footer__nav a", [
    "footerHome",
    "footerPrivacy",
    "footerFeedback"
  ]);
  setText(".privacy-footer__legal", "footerLegal");
  setText(".privacy-footer__developer-label", "footerDeveloper");
  updatePrivacyThemeButtonLabel({
    isDarkTheme: document.documentElement.dataset.theme === "dark"
  });
  setText("#open-language-button .floating-action__label", "languageLabel");
  setText("#back-to-top-button .floating-action__label", "backToTop");
  setText("#language-dialog-title", "languageDialogTitle");
  setText(".language-dialog__description", "languageDialogDescription");

  setAttribute(".header-nav", "aria-label", "headerNavLabel");
  setAttribute(".trust-panel", "aria-label", "trustPanelLabel");
  setAttribute(".summary-grid", "aria-label", "summaryGridLabel");
  setAttribute(".policy-nav", "aria-label", "headerNavLabel");
  setAttribute(".privacy-footer__nav", "aria-label", "linksLabel");
  setAttribute(".privacy-footer__social", "aria-label", "contactChannelsLabel");
  setAttribute(".floating-tools", "aria-label", "quickActionsLabel");
  setAttribute("#open-language-button", "aria-label", "languageLabel");
  setAttribute("#back-to-top-button", "aria-label", "backToTop");
  setAttribute("#close-language-button", "aria-label", "closeDialog");
  setAttribute(".language-grid", "aria-label", "languageGridLabel");

  syncActivePolicyNavLink();
};

privacyElements.themeToggleButton?.addEventListener("click", () => {
  togglePrivacyTheme().catch((error) => {
    console.error("Erro ao alternar tema da privacidade:", error);
  });
});

policyNavLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const headingId = link.getAttribute("href").slice(1);
    const heading = document.getElementById(headingId);

    if (!heading) {
      return;
    }

    event.preventDefault();
    startPolicyNavigation(headingId);
    setActivePolicyNavLink(headingId);
    window.history.pushState(null, "", `#${headingId}`);
    window.scrollTo({
      behavior: "smooth",
      top: getScrollTargetTop(heading)
    });
  });
});

if (window.location.hash) {
  const initialHeadingId = window.location.hash.slice(1);

  if (policyHeadings.some((heading) => heading.id === initialHeadingId)) {
    setActivePolicyNavLink(initialHeadingId);
  }
}

if (policyHeadings.length > 0) {
  syncActivePolicyNavLink();
  window.addEventListener("scroll", syncActivePolicyNavLink, { passive: true });
  window.addEventListener("scrollend", finishPolicyNavigation, {
    passive: true
  });
  window.addEventListener("resize", syncActivePolicyNavLink);
}

initFloatingTools();
loadPrivacyTranslations(activePrivacyLanguage).then(() => {
  initLanguageDialog({
    onChange: applyPrivacyLanguage,
    storageKey: "recarregaAiPageLanguage"
  });
});

loadPrivacyTheme().catch((error) => {
  console.error("Erro ao carregar tema da privacidade:", error);
});
