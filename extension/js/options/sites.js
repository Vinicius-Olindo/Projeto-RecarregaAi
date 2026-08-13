// RecarregaAi! 2.5.0 — Sites automáticos

import { runtimeMessageTypes } from "../modules/shared.js";
import { optionsElements } from "./elements.js";
import { getOptionsCopy, replaceOptionsToken } from "./language.js";
import {
  getCurrentSettings,
  saveOptionsSettings,
  requestAutoStartPermission,
  removeAutoStartPermissionIfUnused,
  normalizeSiteOrigin,
  formatMinuteLabel,
  updateOptionsStatus,
  updateSiteFormAlert
} from "./settings.js";

export const renderSites = () => {
  const currentSettings = getCurrentSettings();

  optionsElements.sitesList.replaceChildren();

  const hasSites = currentSettings.autoStartSites.length > 0;

  optionsElements.sitesEmptyState.hidden = hasSites;
  optionsElements.sitesList.hidden = !hasSites;

  currentSettings.autoStartSites.forEach((site, index) => {
    const item = document.createElement("li");
    const info = document.createElement("span");
    const origin = document.createElement("span");
    const meta = document.createElement("span");
    const removeButton = document.createElement("button");

    item.className = "site-list__item";
    info.className = "site-list__info";
    origin.className = "site-list__origin";
    meta.className = "site-list__meta";
    removeButton.className = "button button--danger";
    removeButton.type = "button";
    removeButton.dataset.removeIndex = String(index);

    origin.textContent = site.origin;
    meta.textContent = replaceOptionsToken("siteMeta", {
      interval: formatMinuteLabel(site.intervalInMinutes)
    });
    removeButton.textContent = getOptionsCopy("removeSite");

    info.append(origin, meta);
    item.append(info, removeButton);
    optionsElements.sitesList.append(item);
  });
};

export const addAutoStartSite = async () => {
  try {
    updateSiteFormAlert();

    const origin = normalizeSiteOrigin(optionsElements.siteOriginInput.value);
    const currentSettings = getCurrentSettings();
    const isDuplicateSite = currentSettings.autoStartSites.some(
      (site) => site.origin === origin
    );

    if (isDuplicateSite) {
      updateSiteFormAlert(getOptionsCopy("formSiteDuplicate"));
      optionsElements.siteOriginInput.focus();
      optionsElements.siteOriginInput.select();
      return;
    }

    const hasPermission = await requestAutoStartPermission(origin);

    if (!hasPermission) {
      updateOptionsStatus(
        getOptionsCopy("formPermissionDenied"),
        "error"
      );
      return;
    }

    const rawInterval = Number(optionsElements.siteIntervalInput.value);
    const intervalInMinutes = Number.isFinite(rawInterval) && rawInterval >= 1
      ? Math.floor(rawInterval)
      : currentSettings.defaultIntervalInMinutes;

    currentSettings.autoStartSites = currentSettings.autoStartSites
      .filter((site) => site.origin !== origin);
    currentSettings.autoStartSites.push({
      enabled: true,
      intervalInMinutes,
      origin
    });

    await saveOptionsSettings();
    renderSites();

    chrome.runtime.sendMessage({
      type: runtimeMessageTypes.autoStartTimerForOrigin,
      payload: { origin }
    }).catch(() => undefined);

    optionsElements.siteOriginInput.value = "";
    optionsElements.siteIntervalInput.value = "";
    updateOptionsStatus(getOptionsCopy("formSiteSaved"), "success");
  } catch (error) {
    updateOptionsStatus(
      error.message || getOptionsCopy("formSiteAddError"),
      "error"
    );
  }
};

export const removeAutoStartSite = async (index) => {
  const currentSettings = getCurrentSettings();
  const removedSite = currentSettings.autoStartSites[index];

  currentSettings.autoStartSites.splice(index, 1);
  await saveOptionsSettings();

  if (removedSite?.origin) {
    await removeAutoStartPermissionIfUnused(removedSite.origin);

    chrome.runtime.sendMessage({
      type: runtimeMessageTypes.stopTimersForOrigin,
      payload: { origin: removedSite.origin }
    }).catch(() => undefined);
  }

  renderSites();
  updateOptionsStatus(getOptionsCopy("formSiteRemoved"), "success");
};
