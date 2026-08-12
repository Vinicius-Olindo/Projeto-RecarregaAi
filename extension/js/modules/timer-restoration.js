// RecarregaAi! 2.5.0

import { getUrlOrigin } from "./shared.js";

const normalizeComparableUrl = (urlValue) => {
  try {
    const url = new URL(urlValue);

    url.hash = "";

    return url.href;
  } catch {
    return "";
  }
};

const isMatchingTimerPage = (timerSettings, tab) => (
  getUrlOrigin(tab?.url) === timerSettings.mainOrigin
  && normalizeComparableUrl(tab?.url)
    === normalizeComparableUrl(timerSettings.tabUrl)
);

export const createTimerRestorationPlan = ({
  browserSessionId,
  openTabs,
  timerSettingsList
}) => {
  const availableTabs = openTabs.filter((tab) => Number.isInteger(tab?.id));
  const tabsById = new Map(availableTabs.map((tab) => [tab.id, tab]));
  const claimedTabIds = new Set();
  const plan = {
    active: [],
    navigationPaused: [],
    stale: []
  };

  timerSettingsList.forEach((timerSettings) => {
    const belongsToCurrentSession = !browserSessionId
      || timerSettings.browserSessionId === browserSessionId;
    const currentTab = tabsById.get(timerSettings.tabId);

    if (belongsToCurrentSession && currentTab) {
      claimedTabIds.add(currentTab.id);

      if (getUrlOrigin(currentTab.url) !== timerSettings.mainOrigin) {
        plan.navigationPaused.push({
          tab: currentTab,
          timerSettings
        });
        return;
      }

      plan.active.push({
        isRebound: false,
        tab: currentTab,
        timerSettings
      });
      return;
    }

    const matchingTabs = availableTabs.filter((tab) => (
      !claimedTabIds.has(tab.id)
      && isMatchingTimerPage(timerSettings, tab)
    ));

    if (matchingTabs.length !== 1) {
      plan.stale.push(timerSettings);
      return;
    }

    const [matchingTab] = matchingTabs;

    claimedTabIds.add(matchingTab.id);
    plan.active.push({
      isRebound: (
        !belongsToCurrentSession
        || matchingTab.id !== timerSettings.tabId
      ),
      tab: matchingTab,
      timerSettings
    });
  });

  return plan;
};
