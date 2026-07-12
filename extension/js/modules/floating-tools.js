// RecarregaAi! 2.3.9

const defaultFooterSelector = ".privacy-footer";
const defaultToolsSelector = ".floating-tools";
const defaultBackToTopSelector = "#back-to-top-button";
const fallbackGapInPixels = 22;

const getElement = (target, root = document) => {
  if (typeof target === "string") {
    return root.querySelector(target);
  }

  return target;
};

const getFloatingGap = (tools) => {
  const gap = Number.parseFloat(
    window.getComputedStyle(tools).getPropertyValue("--floating-tools-gap")
  );

  return Number.isFinite(gap) ? gap : fallbackGapInPixels;
};

const scrollToTop = () => {
  window.scrollTo({
    behavior: "smooth",
    top: 0
  });
};

export const initFloatingTools = ({
  backToTopSelector = defaultBackToTopSelector,
  footerSelector = defaultFooterSelector,
  root = document,
  toolsSelector = defaultToolsSelector
} = {}) => {
  const tools = getElement(toolsSelector, root);

  if (!tools) {
    return;
  }

  const footer = getElement(footerSelector, root);
  const backToTopButton = getElement(backToTopSelector, root);
  let frameId = 0;

  const syncFloatingToolsPosition = () => {
    frameId = 0;

    const footerTop = footer?.getBoundingClientRect().top ?? window.innerHeight;
    const footerOverlap = Math.max(0, window.innerHeight - footerTop);
    const gap = getFloatingGap(tools);
    const toolsHeight = tools.getBoundingClientRect().height;
    const maxBottom = Math.max(gap, window.innerHeight - toolsHeight - gap);
    const nextBottom = Math.min(footerOverlap + gap, maxBottom);

    tools.style.setProperty(
      "--floating-tools-bottom",
      `${nextBottom}px`
    );
  };

  const requestSync = () => {
    if (frameId !== 0) {
      return;
    }

    frameId = window.requestAnimationFrame(syncFloatingToolsPosition);
  };

  window.addEventListener("scroll", requestSync, {
    passive: true
  });
  window.addEventListener("resize", requestSync);

  if (footer && "ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(requestSync);

    resizeObserver.observe(footer);
    resizeObserver.observe(tools);
    resizeObserver.observe(document.documentElement);

    if (document.body) {
      resizeObserver.observe(document.body);
    }
  }

  if ("MutationObserver" in window && document.body) {
    const mutationObserver = new MutationObserver(requestSync);

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (backToTopButton) {
    backToTopButton.addEventListener("click", scrollToTop);
  }

  syncFloatingToolsPosition();
  window.addEventListener("load", requestSync, {
    once: true
  });
};
