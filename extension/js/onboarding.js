// RecarregaAi! 2.3.9

import {
  loadThemePreference,
  toggleThemePreference
} from "./modules/theme.js";

const onboardingElements = {
  finishButton: document.querySelector("#finish-onboarding-button"),
  openOptionsButton: document.querySelector("#open-options-button"),
  themeToggleButton: document.querySelector("#theme-toggle-button")
};

const updateThemeButton = ({ isDarkTheme }) => {
  const label = isDarkTheme ? "Ativar tema claro" : "Ativar tema escuro";

  onboardingElements.themeToggleButton.setAttribute("aria-label", label);
  onboardingElements.themeToggleButton.setAttribute("title", label);
  onboardingElements.themeToggleButton.setAttribute(
    "aria-pressed",
    String(isDarkTheme)
  );
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

loadThemePreference({
  onChange: updateThemeButton
}).catch((error) => {
  console.error("Erro ao carregar tema do onboarding:", error);
});
