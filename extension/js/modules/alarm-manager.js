// RecarregaAi! 2.4.0

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

    let createdAlarm;

    try {
      createdAlarm = await chrome.alarms.get(alarmName);
    } catch (verifyError) {
      console.warn(`Falha ao verificar alarme ${alarmName} (pode ter disparado):`, verifyError);
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
    delayInMinutes: Math.max(0.01, delayInMinutes),
    periodInMinutes: timerSettings.intervalInMinutes
  });
};
