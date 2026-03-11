const page = document.body.dataset.page || "home";
const header = document.querySelector(".appbar");

if (header) {
  const blurLayer = document.createElement("div");
  blurLayer.className = "appbar-blur-layer";
  blurLayer.innerHTML = Array.from({ length: 20 }, (_, i) => `<span style="--step: ${i}"></span>`).join("");
  header.appendChild(blurLayer);
}

// iOS Safari reliably applies :active only after a touchstart handler exists.
document.addEventListener("touchstart", () => {}, { passive: true });

let themeColorMeta = document.querySelector('meta[name="theme-color"]');
const darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const heroHeader = page === "color-header" ? document.querySelector(".hero-header") : null;
let themeAnimationTimer = null;

const triggerThemeAnimation = () => {
  document.body.classList.remove("theme-animating");
  // Force reflow to restart the transition window on repeated toggles.
  void document.body.offsetWidth;
  document.body.classList.add("theme-animating");
  if (themeAnimationTimer) {
    window.clearTimeout(themeAnimationTimer);
  }
  themeAnimationTimer = window.setTimeout(() => {
    document.body.classList.remove("theme-animating");
    themeAnimationTimer = null;
  }, 360);
};

const syncAppbarTone = () => {
  const shouldForceDark =
    page === "color-header" && !darkSchemeQuery.matches && heroHeader && window.scrollY < heroHeader.offsetHeight;
  document.body.classList.toggle("appbar-dark-forced", Boolean(shouldForceDark));
};

const syncThemeColor = () => {
  if (!themeColorMeta) return;
  const nextColor = darkSchemeQuery.matches ? "#000000" : "#ffffff";

  // Keep UA color-scheme and toolbar color aligned.
  document.documentElement.style.colorScheme = darkSchemeQuery.matches ? "dark" : "light";

  // iOS Safari may ignore in-place content updates, so replace the tag.
  if (themeColorMeta.getAttribute("content") !== nextColor) {
    const replacementMeta = themeColorMeta.cloneNode();
    replacementMeta.setAttribute("content", nextColor);
    themeColorMeta.replaceWith(replacementMeta);
    themeColorMeta = replacementMeta;
  } else {
    themeColorMeta.setAttribute("content", nextColor);
  }
  syncAppbarTone();
};
syncThemeColor();
const handleThemeSchemeChange = () => {
  triggerThemeAnimation();
  syncThemeColor();
};
if (typeof darkSchemeQuery.addEventListener === "function") {
  darkSchemeQuery.addEventListener("change", handleThemeSchemeChange);
} else if (typeof darkSchemeQuery.addListener === "function") {
  darkSchemeQuery.addListener(handleThemeSchemeChange);
}
window.addEventListener("pageshow", syncThemeColor);
window.addEventListener("focus", syncThemeColor);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncThemeColor();
});

const syncScrollState = () => {
  document.body.classList.toggle("scrolled", window.scrollY > 0);
  syncAppbarTone();
};
syncScrollState();
window.addEventListener("scroll", syncScrollState, { passive: true });

const cards = document.querySelector("#cards");
const cardIcon =
  '<span class="card-leading"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12.7803 1.79476C12.4702 1.13515 11.5398 1.13515 11.2197 1.79476L8.65867 8.28094L1.76593 8.50082C1.02563 8.58077 0.735518 9.50023 1.28574 9.99993L6.58785 14.2574L4.86716 20.7636C4.7171 21.4832 5.4774 22.0429 6.12766 21.6931L12 17.9553L17.8723 21.6931C18.5126 22.0429 19.2729 21.4832 19.1328 20.7636L17.4122 14.2574L22.7143 9.99993C23.2645 9.50023 22.9744 8.59076 22.2341 8.50082L15.3413 8.28094L12.7803 1.79476Z" fill="white"/></svg></span>';
if (cards && (page === "normal" || page === "color-header")) {
  cards.innerHTML = Array.from({ length: 20 }, () => `<section class="card"><p>${cardIcon}<span>Card title</span></p></section>`).join("");
}

const backButton = document.querySelector("[data-back-to-home]");
if (backButton) {
  backButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

const reloadBtn = document.querySelector("#reload-btn");
const hardRefresh = async () => {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString());
  window.location.replace(url.toString());
};
if (reloadBtn) {
  reloadBtn.addEventListener("click", () => {
    hardRefresh().catch(() => window.location.reload());
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  });
}
