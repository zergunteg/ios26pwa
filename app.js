const page = document.body.dataset.page || "home";
const header = document.querySelector(".appbar");
const scrollContainer = document.querySelector("#app-scroll");
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
document.body.classList.toggle("standalone-mode", isStandalone);

const syncAppViewportHeight = () => {
  if (isStandalone) {
    document.documentElement.style.setProperty("--app-vh", `${window.innerHeight}px`);
  } else {
    document.documentElement.style.removeProperty("--app-vh");
  }
};

syncAppViewportHeight();
window.addEventListener("resize", syncAppViewportHeight);
window.addEventListener("orientationchange", syncAppViewportHeight);
window.addEventListener("pageshow", syncAppViewportHeight);

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
const appbarToneReleaseOffset = 80;
let themeAnimationTimer = null;

const getHeroHeaderColor = () => {
  const color = getComputedStyle(document.documentElement).getPropertyValue("--hero-header-bg").trim();
  return color || "#333333";
};

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
  }, 150);
};

const syncAppbarTone = () => {
  const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
  const heroCutoff = heroHeader ? Math.max(0, heroHeader.offsetHeight - appbarToneReleaseOffset) : 0;
  const isHeroZone = page === "color-header" && heroHeader && scrollTop < heroCutoff;
  const shouldForceDark = isHeroZone && !darkSchemeQuery.matches;
  document.body.classList.toggle("shell-hero-bg", Boolean(isHeroZone));
  document.body.classList.toggle("appbar-dark-forced", Boolean(shouldForceDark));
  return Boolean(shouldForceDark);
};

const syncThemeColor = () => {
  if (!themeColorMeta) return;
  const forceDarkOnHero = syncAppbarTone();
  const nextColor = darkSchemeQuery.matches ? "#000000" : forceDarkOnHero ? getHeroHeaderColor() : "#ffffff";

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
};
syncThemeColor();
window.requestAnimationFrame(syncThemeColor);
window.addEventListener("load", syncThemeColor);
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
  const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
  document.body.classList.toggle("scrolled", scrollTop > 0);
  syncThemeColor();
};
syncScrollState();
if (scrollContainer) {
  scrollContainer.addEventListener("scroll", syncScrollState, { passive: true });
} else {
  window.addEventListener("scroll", syncScrollState, { passive: true });
}

const cards = document.querySelector("#cards");
const cardTemplate = document.querySelector("#card-template");
if (cards && (page === "normal" || page === "color-header")) {
  const cardMarkup = cardTemplate ? cardTemplate.innerHTML.trim() : "";
  cards.innerHTML = Array.from({ length: 20 }, () => cardMarkup).join("");
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
