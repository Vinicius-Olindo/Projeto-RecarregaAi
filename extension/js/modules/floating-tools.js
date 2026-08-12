// RecarregaAi! 2.5.0

const defaultFooterSelector = ".privacy-footer";
const defaultBackToTopSelector = "#back-to-top-button";
const scrollThreshold = 400;

const getElement = (target, root = document) => {
  if (typeof target === "string") {
    return root.querySelector(target);
  }

  return target;
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
  root = document
} = {}) => {
  const backToTopButton = getElement(backToTopSelector, root);

  if (!backToTopButton) {
    return;
  }

  const footer = getElement(footerSelector, root);
  let frameId = 0;

  const syncBackToTopVisibility = () => {
    frameId = 0;

    const scrolled = window.scrollY > scrollThreshold;
    backToTopButton.classList.toggle("is-visible", scrolled);

    const footerTop = footer?.getBoundingClientRect().top ?? window.innerHeight;
    const footerOverlap = Math.max(0, window.innerHeight - footerTop);
    const offset = footerOverlap > 0 ? footerOverlap + 16 : 24;

    backToTopButton.style.bottom = `${offset}px`;
  };

  const requestSync = () => {
    if (frameId !== 0) {
      return;
    }

    frameId = window.requestAnimationFrame(syncBackToTopVisibility);
  };

  window.addEventListener("scroll", requestSync, {
    passive: true
  });
  window.addEventListener("resize", requestSync);

  backToTopButton.addEventListener("click", scrollToTop);

  syncBackToTopVisibility();
  window.addEventListener("load", requestSync, {
    once: true
  });
};
