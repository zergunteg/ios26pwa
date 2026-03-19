const page = document.body.dataset.page || "home";
const header = document.querySelector(".appbar");
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
document.documentElement.classList.toggle("page-color-header", page === "color-header");

const setNavDirection = (direction) => {
  try {
    sessionStorage.setItem("nav-direction", direction);
  } catch {
    // no-op
  }
};

const syncAppViewportHeight = () => {
  if (isStandalone) {
    document.documentElement.style.setProperty("--app-vh", `${window.innerHeight}px`);
    document.documentElement.style.setProperty("--appbar-top-pad", "0px");
  } else {
    document.documentElement.style.removeProperty("--app-vh");
    document.documentElement.style.removeProperty("--appbar-top-pad");
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
const appbarZones =
  page === "color-content"
    ? Array.from(document.querySelectorAll("[data-appbar-zone]"))
    : heroHeader
      ? [heroHeader]
      : [];
const appbarToneReleaseOffset = page === "color-content" ? 0 : 80;
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

const getScrollTop = () => Math.max(0, window.scrollY || 0);

const syncAppbarTone = () => {
  const scrollTop = getScrollTop();
  const probeY = Math.max(1, scrollTop + 1);
  let activeZone = null;

  for (const zone of appbarZones) {
    const start = zone.offsetTop;
    const end = start + Math.max(0, zone.offsetHeight - appbarToneReleaseOffset);
    if (probeY >= start && probeY < end) {
      activeZone = zone;
      break;
    }
  }

  // iOS momentum/rubber-band can briefly emit unstable values near top.
  // Keep color-header pinned to hero zone at the very top to avoid light flash.
  if (!activeZone && page === "color-header" && heroHeader && scrollTop <= 4) {
    activeZone = heroHeader;
  }

  const isHeroZone = Boolean(activeZone);
  const shouldForceDark = isHeroZone && !darkSchemeQuery.matches;
  const activeZoneColor = activeZone
    ? activeZone.dataset.appbarColor || getComputedStyle(activeZone).backgroundColor
    : "";

  if (activeZoneColor) {
    document.documentElement.style.setProperty("--hero-header-bg", activeZoneColor);
  } else {
    document.documentElement.style.removeProperty("--hero-header-bg");
  }

  document.body.classList.toggle("shell-hero-bg", isHeroZone);
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
  const scrollTop = getScrollTop();
  document.body.classList.toggle("scrolled", scrollTop > 0);
  syncThemeColor();
};
syncScrollState();
window.addEventListener("scroll", syncScrollState, { passive: true });

const cards = document.querySelector("#cards");
const cardTemplate = document.querySelector("#card-template");
if (cards && cardTemplate) {
  const cardMarkup = cardTemplate ? cardTemplate.innerHTML.trim() : "";
  cards.innerHTML = Array.from({ length: 20 }, () => cardMarkup).join("");
}

const backButton = document.querySelector("[data-back-to-home]");
if (backButton) {
  backButton.addEventListener("click", () => {
    setNavDirection("pop");
    const backHref = backButton.dataset.backHref || "index.html";
    window.location.href = backHref;
  });
}

document.querySelectorAll("a.nav-link[href]").forEach((link) => {
  link.addEventListener("click", () => {
    setNavDirection("push");
  });
});

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
