// RecarregaAi! 2.5.0

export const enforceTopLevelPublicPage = () => {
  if (window.top === window.self) {
    return;
  }

  window.stop();
  document.documentElement.replaceChildren();

  throw new Error("Incorporacao da pagina bloqueada pelo RecarregaAi!.");
};
