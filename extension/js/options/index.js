// RecarregaAi! 2.5.0 — Configurações principal

import { initFloatingTools } from "../modules/floating-tools.js";
import {
  maximumTimerIntervalInMinutes,
  minimumTimerIntervalInMinutes,
  normalizeOperatingHours,
  storageKeys
} from "../modules/shared.js";
import {
  loadThemePreference,
  toggleThemePreference,
  watchSystemTheme
} from "../modules/theme.js";
import { optionsElements } from "./elements.js";
import {
  getOptionsCopy,
  initializeOptionsLanguageDialog,
  applyOptionsLanguage
} from "./language.js";
import {
  renderActionHistory,
  loadActionHistory,
  clearStoredActionHistory,
  exportDebugDiagnostics,
  resetHistoryClearConfirmation,
  setActiveHistoryFilter,
  incrementVisibleHistoryLimit,
  resetVisibleHistoryLimit,
  isHistoryClearPendingState,
  setCurrentActionHistory
} from "./history.js";
import {
  getCurrentSettings,
  setCurrentSettings,
  getStoredOptionsSettings,
  saveOptionsSettings,
  updateOptionsStatus,
  updateSiteFormAlert,
  closeOptionsPage,
  exportOptionsSettings,
  parseSettingsImportPayload,
  requestAutoStartPermissions,
  removeUnusedAutoStartPermissions
} from "./settings.js";
import { renderSites, addAutoStartSite, removeAutoStartSite } from "./sites.js";
import { initShortcuts } from "./shortcuts.js";

const syncPreferenceControls = () => {
  const currentSettings = getCurrentSettings();
  const operatingHours = normalizeOperatingHours(currentSettings.operatingHours);
  const isEnabled = operatingHours.enabled;

  currentSettings.operatingHours = operatingHours;
  optionsElements.advancedCleanupInput.checked = Boolean(
    currentSettings.advancedCleanupEnabled
  );
  optionsElements.preserveScrollInput.checked = Boolean(
    currentSettings.preserveScrollPosition
  );
  optionsElements.playSoundInput.checked = Boolean(
    currentSettings.playSoundOnComplete
  );
  optionsElements.debugModeInput.checked = Boolean(
    currentSettings.debugMode
  );
  optionsElements.exportDiagnosticsButton.hidden = !currentSettings.debugMode;
  optionsElements.operatingHoursEnabled.checked = isEnabled;
  optionsElements.operatingStartTime.value = operatingHours.startTime;
  optionsElements.operatingEndTime.value = operatingHours.endTime;
  optionsElements.operatingHoursFields.dataset.enabled = String(isEnabled);

  optionsElements.operatingWeekdays.forEach((weekdayInput) => {
    weekdayInput.checked = operatingHours.weekdays.includes(
      Number(weekdayInput.value)
    );
    weekdayInput.disabled = !isEnabled;
  });

  optionsElements.operatingStartTime.disabled = !isEnabled;
  optionsElements.operatingEndTime.disabled = !isEnabled;
};

const savePreferenceSettings = async () => {
  const currentSettings = getCurrentSettings();

  currentSettings.advancedCleanupEnabled =
    optionsElements.advancedCleanupInput.checked;
  currentSettings.preserveScrollPosition =
    optionsElements.preserveScrollInput.checked;
  currentSettings.playSoundOnComplete =
    optionsElements.playSoundInput.checked;
  currentSettings.debugMode =
    optionsElements.debugModeInput.checked;
  currentSettings.operatingHours = normalizeOperatingHours({
    enabled: optionsElements.operatingHoursEnabled.checked,
    endTime: optionsElements.operatingEndTime.value,
    startTime: optionsElements.operatingStartTime.value,
    weekdays: [...optionsElements.operatingWeekdays]
      .filter((weekdayInput) => weekdayInput.checked)
      .map((weekdayInput) => Number(weekdayInput.value))
  });

  await saveOptionsSettings();
  syncPreferenceControls();
  updateOptionsStatus(getOptionsCopy("formSettingsSaved"), "success");
};

const loadOptionsSettings = async () => {
  const currentSettings = await getStoredOptionsSettings();
  setCurrentSettings(currentSettings);
  optionsElements.defaultIntervalInput.value = currentSettings.defaultIntervalInMinutes;
  syncPreferenceControls();
  renderSites();
};

const saveDefaultInterval = async () => {
  const defaultInterval = Number(optionsElements.defaultIntervalInput.value);

  if (
    !Number.isFinite(defaultInterval)
    || defaultInterval < minimumTimerIntervalInMinutes
    || defaultInterval > maximumTimerIntervalInMinutes
  ) {
    updateOptionsStatus(
      getOptionsCopy("formInvalidInterval"),
      "error"
    );
    return;
  }

  const currentSettings = getCurrentSettings();
  currentSettings.defaultIntervalInMinutes = Math.floor(defaultInterval);
  await saveOptionsSettings();
  updateOptionsStatus(getOptionsCopy("formSettingsSaved"), "success");
};

const updateOptionsThemeButtonLabel = ({ isDarkTheme }) => {
  const nextThemeLabel = isDarkTheme
    ? getOptionsCopy("themeToLight")
    : getOptionsCopy("themeToDark");

  optionsElements.themeToggleButton.setAttribute("aria-pressed", String(isDarkTheme));
  optionsElements.themeToggleButton.setAttribute("aria-label", nextThemeLabel);
  optionsElements.themeToggleButton.title = nextThemeLabel;

  if (optionsElements.themeToggleLabel) {
    optionsElements.themeToggleLabel.textContent = isDarkTheme
      ? getOptionsCopy("themeLight")
      : getOptionsCopy("themeDark");
  }
};

const loadOptionsTheme = async () => {
  await loadThemePreference({
    onChange: updateOptionsThemeButtonLabel
  });
  watchSystemTheme({ onChange: updateOptionsThemeButtonLabel });
};

const toggleOptionsTheme = async () => {
  await toggleThemePreference({
    onChange: updateOptionsThemeButtonLabel
  });
};

const loadOptionsVersion = () => {
  if (typeof chrome === "undefined" || !chrome.runtime?.getManifest) {
    return;
  }

  const manifest = chrome.runtime.getManifest();

  optionsElements.extensionVersion.textContent = manifest.version_name
    || manifest.version;
};

const importOptionsSettingsFromFile = async (file) => {
  if (!file) {
    return;
  }

  const importedData = parseSettingsImportPayload(await file.text());
  const hasPermission = await requestAutoStartPermissions(
    importedData.settings.autoStartSites
  );

  if (!hasPermission) {
    throw new Error(getOptionsCopy("formImportPermissionDenied"));
  }

  const previousSettings = getCurrentSettings();
  setCurrentSettings(importedData.settings);

  try {
    await saveOptionsSettings();
    await removeUnusedAutoStartPermissions(
      previousSettings.autoStartSites,
      getCurrentSettings().autoStartSites
    );

    const { saveThemePreference } = await import("../modules/theme.js");
    const { getOptionsLanguageDialog } = await import("./language.js");

    if (importedData.preferences.theme) {
      await saveThemePreference({
        onChange: updateOptionsThemeButtonLabel,
        theme: importedData.preferences.theme
      });
    }

    if (importedData.preferences.language) {
      const languageDialog = getOptionsLanguageDialog();

      if (languageDialog) {
        languageDialog.applyLanguage(importedData.preferences.language);
      } else {
        localStorage.setItem("recarregaAiPageLanguage", importedData.preferences.language);
        applyOptionsLanguage(importedData.preferences.language);
      }
    }
  } catch (error) {
    setCurrentSettings(previousSettings);
    throw error;
  }

  optionsElements.defaultIntervalInput.value =
    getCurrentSettings().defaultIntervalInMinutes;
  syncPreferenceControls();
  renderSites();
  updateOptionsStatus(getOptionsCopy("formImported"), "success");
};

const getCallbacks = () => ({
  renderSites,
  renderActionHistory: () => renderActionHistory(),
  updateOptionsThemeButtonLabel,
  isHistoryClearPending: isHistoryClearPendingState()
});

const initializeOptionsLanguageDialogWrapper = async () => {
  await initializeOptionsLanguageDialog(getCallbacks());
};

optionsElements.saveSettingsButton.addEventListener("click", () => {
  saveDefaultInterval().catch((error) => {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSettingsError"),
      "error"
    );
  });
});

const handlePreferenceChange = () => {
  savePreferenceSettings().catch((error) => {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSettingsError"),
      "error"
    );
  });
};

optionsElements.preserveScrollInput.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.advancedCleanupInput.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.playSoundInput.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.debugModeInput.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingHoursEnabled.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingStartTime.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingEndTime.addEventListener(
  "change",
  handlePreferenceChange
);
optionsElements.operatingWeekdays.forEach((weekdayInput) => {
  weekdayInput.addEventListener("change", handlePreferenceChange);
});

optionsElements.addSiteButton.addEventListener("click", () => {
  addAutoStartSite().catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formSiteSaveError"), "error");
  });
});

optionsElements.sitesList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-index]");

  if (!removeButton) {
    return;
  }

  removeAutoStartSite(Number(removeButton.dataset.removeIndex)).catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formSiteRemoveError"), "error");
  });
});

optionsElements.exportSettingsButton.addEventListener("click", () => {
  try {
    exportOptionsSettings(updateOptionsStatus);
  } catch (error) {
    updateOptionsStatus(error.message || getOptionsCopy("formExportError"), "error");
  }
});

optionsElements.exportDiagnosticsButton.addEventListener("click", () => {
  exportDebugDiagnostics(updateOptionsStatus).catch((error) => {
    updateOptionsStatus(
      error.message || getOptionsCopy("diagnosticsExportError"),
      "error"
    );
  });
});

optionsElements.importSettingsButton.addEventListener("click", () => {
  optionsElements.importSettingsInput.click();
});

optionsElements.importSettingsInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];

  importOptionsSettingsFromFile(file).catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formImportError"), "error");
  }).finally(() => {
    event.target.value = "";
  });
});

optionsElements.themeToggleButton.addEventListener("click", () => {
  toggleOptionsTheme().catch((error) => {
    updateOptionsStatus(error.message || getOptionsCopy("formThemeError"), "error");
  });
});

optionsElements.closeOptionsButton.addEventListener("click", () => {
  closeOptionsPage();
});

optionsElements.siteOriginInput.addEventListener("input", () => {
  updateSiteFormAlert();
});

optionsElements.historyFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveHistoryFilter(button.dataset.historyFilter);
    resetVisibleHistoryLimit();

    optionsElements.historyFilterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;

      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });

    renderActionHistory();
  });
});

optionsElements.showMoreHistoryButton.addEventListener("click", () => {
  incrementVisibleHistoryLimit();
  renderActionHistory();
});

optionsElements.collapseHistoryButton.addEventListener("click", () => {
  resetVisibleHistoryLimit();
  renderActionHistory();
});

optionsElements.clearHistoryButton.addEventListener("click", () => {
  clearStoredActionHistory(updateOptionsStatus).catch((error) => {
    resetHistoryClearConfirmation();
    updateOptionsStatus(error.message || getOptionsCopy("formSettingsError"), "error");
  });
});

if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    const historyChange = changes[storageKeys.actionHistory];

    if (areaName !== "local" || !historyChange) {
      return;
    }

    setCurrentActionHistory(Array.isArray(historyChange.newValue)
      ? historyChange.newValue
      : []);
    renderActionHistory();
  });
}

initFloatingTools();
initializeOptionsLanguageDialogWrapper().catch((error) => {
  console.error("Erro ao carregar idioma do RecarregaAi:", error);
  applyOptionsLanguage("pt-BR");
});

loadOptionsVersion();
loadOptionsTheme().catch((error) => {
  updateOptionsStatus(error.message || "Erro ao carregar tema.", "error");
});
loadOptionsSettings().catch((error) => {
  updateOptionsStatus(
    error.message || "Erro ao carregar configurações.",
    "error"
  );
});
loadActionHistory().then(() => {
  renderActionHistory();
}).catch((error) => {
  updateOptionsStatus(
    error.message || getOptionsCopy("formSettingsLoadError"),
    "error"
  );
});

initShortcuts();

const initTabNavigation = () => {
  const navButtons = document.querySelectorAll(".settings-nav__item[data-nav-section]");
  const sections = document.querySelectorAll(".settings-section");

  if (navButtons.length === 0 || sections.length === 0) {
    return;
  }

  const showSection = (targetId) => {
    sections.forEach((section) => {
      section.hidden = section.id !== targetId;
    });

    navButtons.forEach((button) => {
      const isActive = button.dataset.navSection === targetId;
      button.classList.toggle("is-active", isActive);
    });
  };

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.navSection);
    });
  });

  showSection(navButtons[0].dataset.navSection);
};

initTabNavigation();
