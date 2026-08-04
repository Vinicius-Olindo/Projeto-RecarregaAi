// RecarregaAi! 2.3.9

import { getTimerAlarmName } from "./shared.js";

export const clearChromeAlarm = async (alarmName) => {
  try {
    return await chrome.alarms.clear(alarmName);
  } catch (error) {
    console.warn(`Nao foi possivel limpar o alarme ${alarmName}:`, error);
    throw error;
  }
};

export const createChromeAlarm = async (alarmName, alarmInfo) => {
  try {
    await chrome.alarms.create(alarmName, alarmInfo);

    const createdAlarm = await chrome.alarms.get(alarmName);

    if (!createdAlarm) {
      throw new Error(`Alarme ${alarmName} nao encontrado apos criacao.`);
    }

    return createdAlarm;
  } catch (error) {
    console.error(`Nao foi possivel criar o alarme ${alarmName}:`, error);
    throw error;
  }
};

export const clearTimerAlarm = async (tabId) => {
  await clearChromeAlarm(getTimerAlarmName(tabId));
};

export const createTimerAlarm = async (
  timerSettings,
  delayInMinutes = timerSettings.intervalInMinutes
) => {
  const alarmName = getTimerAlarmName(timerSettings.tabId);

  await clearChromeAlarm(alarmName);
  await createChromeAlarm(alarmName, {
    delayInMinutes: Math.max(0.5, delayInMinutes),
    periodInMinutes: timerSettings.intervalInMinutes
  });
};
