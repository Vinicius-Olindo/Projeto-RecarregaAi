// RecarregaAi! 2.5.0

(() => {
  const guardFlag = "__recarregaAiMainWorldMediaGuardLoaded";
  const guardVersion = 3;
  const mediaStateType = "RECARREGA_AI_PAGE_MEDIA_STATE";
  const sharedStateKey = "__recarregaAiMainWorldMediaState";
  const source = "RECARREGA_AI_PAGE_MEDIA_GUARD_V3";

  if (window[guardFlag] === guardVersion) {
    return;
  }

  window[guardFlag] = guardVersion;

  const activeRecorders = new Set();

  const hasRecordingMediaRecorder = () => (
    Array.from(activeRecorders).some((recorder) => recorder.state === "recording")
  );

  const postMediaState = () => {
    const isRecording = hasRecordingMediaRecorder();

    window[sharedStateKey] = {
      isRecording
    };
    window.postMessage({
      payload: {
        isMediaActive: isRecording,
        mediaKind: isRecording ? "recording" : null
      },
      source,
      type: mediaStateType
    }, "*");
  };

  const patchMediaRecorder = () => {
    if (typeof window.MediaRecorder !== "function") {
      return;
    }

    const NativeMediaRecorder = window.MediaRecorder;

    if (NativeMediaRecorder.__recarregaAiMediaGuardVersion === guardVersion) {
      return;
    }

    function RecarregaAiMediaRecorder(...args) {
      const recorder = new NativeMediaRecorder(...args);
      const syncRecorder = () => {
        if (recorder.state === "recording") {
          activeRecorders.add(recorder);
        } else {
          activeRecorders.delete(recorder);
        }

        postMediaState();
      };

      ["error", "pause", "resume", "start", "stop"].forEach((eventName) => {
        recorder.addEventListener(eventName, syncRecorder);
      });

      syncRecorder();

      return recorder;
    }

    Object.setPrototypeOf(RecarregaAiMediaRecorder, NativeMediaRecorder);
    RecarregaAiMediaRecorder.prototype = NativeMediaRecorder.prototype;
    Object.defineProperty(RecarregaAiMediaRecorder, "__recarregaAiMediaGuardVersion", {
      value: guardVersion
    });

    window.MediaRecorder = RecarregaAiMediaRecorder;
  };

  try {
    patchMediaRecorder();
    postMediaState();
  } catch (error) {
    console.warn("RecarregaAi! nao conseguiu ativar a protecao de midia:", error);
  }
})();
