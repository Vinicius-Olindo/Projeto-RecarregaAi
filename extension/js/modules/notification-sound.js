// RecarregaAi! 2.5.0 — Notificação sonora

let audioContext = null;

const getAudioContext = () => {
  if (audioContext) {
    return audioContext;
  }

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return audioContext;
  } catch {
    return null;
  }
};

export const playNotificationSound = () => {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(1100, context.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.4);
  } catch (error) {
    console.warn("Nao foi possivel reproduzir som de notificacao:", error);
  }
};
