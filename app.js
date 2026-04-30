const page = document.body.dataset.page || "home";
const header = document.querySelector(".appbar");
const isEmbeddedWebView =
  window.__IOS_WEBVIEW__ === true ||
  document.documentElement.hasAttribute("data-webview");
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true ||
  isEmbeddedWebView;
document.documentElement.classList.toggle("page-color-header", page === "color-header");

const readSafeAreaInsetTop = () => {
  const appbarButton = header?.querySelector(".appbar-btn");
  if (appbarButton) {
    return Math.max(0, Math.round(appbarButton.getBoundingClientRect().top));
  }

  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:absolute",
    "top:0",
    "left:0",
    "visibility:hidden",
    "pointer-events:none",
    "padding-top:env(safe-area-inset-top)"
  ].join(";");
  document.body.appendChild(probe);
  const inset = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return inset;
};

const syncSearchActiveSafeTop = () => {
  if (document.body.classList.contains("search-chrome-collapsed")) return;
  const activeSearch = document.querySelector("[data-search-bar].is-active");
  if (activeSearch) return;
  const activeSearchTop = readSafeAreaInsetTop();
  document.documentElement.style.setProperty("--search-active-safe-top", `${activeSearchTop}px`);
};

const detectNativeSwitch = () => {
  const testSwitch = document.createElement("input");
  testSwitch.type = "checkbox";
  testSwitch.setAttribute("switch", "");
  testSwitch.style.cssText =
    "position:absolute;left:-9999px;top:-9999px;margin:0;visibility:hidden;";
  document.body.appendChild(testSwitch);
  const rect = testSwitch.getBoundingClientRect();
  testSwitch.remove();
  return rect.width >= 30 && rect.height >= 20;
};

if (page === "switches") {
  document.documentElement.classList.toggle("supports-native-switch", detectNativeSwitch());
}

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
syncSearchActiveSafeTop();
window.addEventListener("resize", syncAppViewportHeight);
window.addEventListener("orientationchange", syncAppViewportHeight);
window.addEventListener("pageshow", syncAppViewportHeight);
window.addEventListener("resize", syncSearchActiveSafeTop);
window.addEventListener("orientationchange", syncSearchActiveSafeTop);
window.addEventListener("pageshow", syncSearchActiveSafeTop);

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
const appbarToneReleaseOffset = page === "color-content" ? 0 : 120;
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
  const nextColor = forceDarkOnHero ? getHeroHeaderColor() : darkSchemeQuery.matches ? "#000000" : "#ffffff";

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

const searchBars = Array.from(document.querySelectorAll("[data-search-bar]"));
if (searchBars.length) {
  let activeOverlaySource = null;
  let searchOverlay = null;
  let searchOverlayInput = null;
  let searchOverlayShell = null;

  const syncSearchChrome = () => {
    const shouldCollapse = Boolean(activeOverlaySource) || searchBars.some((bar) => {
      const behavior = bar.dataset.searchBehavior || "inline";
      return bar.classList.contains("is-active") && behavior !== "inline";
    });
    document.body.classList.toggle("search-chrome-collapsed", shouldCollapse);
  };

  const syncShellValueState = (shell, input) => {
    shell?.classList.toggle("has-value", (input?.value || "").length > 0);
  };

  const focusSearchOverlayInput = () => {
    if (!searchOverlayInput) return;
    try {
      searchOverlayInput.focus({ preventScroll: true });
    } catch {
      searchOverlayInput.focus();
    }
  };

  const createSearchOverlay = () => {
    if (searchOverlay) return searchOverlay;
    const sourceBar = searchBars.find((bar) => (bar.dataset.searchBehavior || "inline") !== "inline");
    if (!sourceBar) return null;

    searchOverlay = sourceBar.cloneNode(true);
    searchOverlay.hidden = true;
    searchOverlay.className = "search-bar search-bar--floating search-active-overlay";
    searchOverlay.dataset.searchBehavior = "overlay";
    searchOverlay.removeAttribute("data-search-bar");
    searchOverlay.setAttribute("aria-hidden", "true");

    searchOverlayShell = searchOverlay.querySelector(".search-input-shell");
    searchOverlayInput = searchOverlay.querySelector(".search-input");
    if (searchOverlayShell) {
      searchOverlayShell.className = "search-input-shell search-input-shell--floating";
    }
    if (searchOverlayInput) {
      searchOverlayInput.value = "";
    }

    const overlayFieldClear = searchOverlay.querySelector(".search-field-clear");
    const overlayClose = searchOverlay.querySelector(".search-clear-btn");
    searchOverlay.addEventListener("submit", (event) => {
      event.preventDefault();
    });
    searchOverlayInput?.addEventListener("input", syncOverlayValueToSource);
    overlayFieldClear?.addEventListener("click", () => {
      if (!searchOverlayInput) return;
      searchOverlayInput.value = "";
      syncOverlayValueToSource();
      focusSearchOverlayInput();
    });
    overlayClose?.addEventListener("click", () => {
      if (searchOverlayInput) searchOverlayInput.value = "";
      syncOverlayValueToSource();
      closeSearchOverlay();
    });

    document.querySelector(".app-shell")?.appendChild(searchOverlay);
    return searchOverlay;
  };

  const openSearchOverlay = (sourceBar) => {
    const behavior = sourceBar.dataset.searchBehavior || "inline";
    if (behavior === "inline") return false;

    const overlay = createSearchOverlay();
    if (!overlay || !searchOverlayInput) return false;

    const sourceInput = sourceBar.querySelector(".search-input");
    const sourceShell = sourceBar.querySelector(".search-input-shell");
    syncSearchActiveSafeTop();
    activeOverlaySource = sourceBar;
    searchOverlayInput.value = sourceInput?.value || "";
    syncShellValueState(searchOverlayShell, searchOverlayInput);
    syncShellValueState(sourceShell, sourceInput);

    overlay.hidden = false;
    overlay.removeAttribute("aria-hidden");
    overlay.classList.add("is-active");
    syncSearchChrome();

    focusSearchOverlayInput();
    window.requestAnimationFrame(() => {
      if (document.activeElement !== searchOverlayInput) focusSearchOverlayInput();
    });

    return true;
  };

  const closeSearchOverlay = () => {
    if (!searchOverlay || !activeOverlaySource) return;
    const sourceBar = activeOverlaySource;
    const sourceInput = sourceBar.querySelector(".search-input");
    const sourceShell = sourceBar.querySelector(".search-input-shell");
    if (sourceInput && searchOverlayInput) {
      sourceInput.value = searchOverlayInput.value;
      syncShellValueState(sourceShell, sourceInput);
    }

    activeOverlaySource = null;
    searchOverlayInput?.blur();
    searchOverlay.classList.remove("is-active");
    searchOverlay.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (!activeOverlaySource && searchOverlay) searchOverlay.hidden = true;
    }, 180);
    syncSearchChrome();
    syncSearchActiveSafeTop();
  };

  const syncOverlayValueToSource = () => {
    if (!activeOverlaySource || !searchOverlayInput) return;
    const sourceInput = activeOverlaySource.querySelector(".search-input");
    const sourceShell = activeOverlaySource.querySelector(".search-input-shell");
    if (sourceInput) {
      sourceInput.value = searchOverlayInput.value;
      syncShellValueState(sourceShell, sourceInput);
    }
    syncShellValueState(searchOverlayShell, searchOverlayInput);
  };

  searchBars.forEach((bar) => {
    const input = bar.querySelector(".search-input");
    const clearButton = bar.querySelector(".search-clear-btn");
    const inputShell = bar.querySelector(".search-input-shell");
    const fieldClearButton = bar.querySelector(".search-field-clear");
    if (!input) return;
    const behavior = bar.dataset.searchBehavior || "inline";

    const getStickyTop = () => Number.parseFloat(getComputedStyle(bar).top) || 0;
    const syncPromotedSticky = () => {
      if (behavior !== "inline-floating") return;
      const stuck = !bar.classList.contains("is-active") &&
        bar.getBoundingClientRect().top <= getStickyTop() + 1;
      bar.classList.toggle("is-stuck", stuck);
    };
    const measurePromotedSticky = () => {
      if (behavior !== "inline-floating") return;
      syncPromotedSticky();
    };

    const setActive = (isActive) => {
      if (behavior !== "inline") {
        if (isActive) {
          openSearchOverlay(bar);
        } else if (activeOverlaySource === bar) {
          closeSearchOverlay();
        }
        return;
      }

      if (isActive) {
        syncSearchActiveSafeTop();
      }
      bar.classList.toggle("is-active", isActive);
      syncSearchChrome();
      syncPromotedSticky();
      if (!isActive) {
        syncSearchActiveSafeTop();
      }
      if (!isActive && behavior !== "inline") {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    };

    const syncInputValueState = () => {
      inputShell?.classList.toggle("has-value", input.value.length > 0);
    };

    if (inputShell) {
      const releasePressedState = () => {
        inputShell.classList.remove("is-pressed");
      };

      inputShell.addEventListener("pointerdown", (event) => {
        if (event.target.closest(".search-field-clear")) return;
        if (behavior !== "inline") {
          event.preventDefault();
          inputShell.classList.add("is-pressed");
          openSearchOverlay(bar);
          return;
        }
        setActive(true);
        inputShell.classList.add("is-pressed");
        input.focus();
      });
      inputShell.addEventListener("pointerup", releasePressedState);
      inputShell.addEventListener("pointercancel", releasePressedState);
      inputShell.addEventListener("pointerleave", releasePressedState);
    }

    input.addEventListener("focus", () => {
      if (behavior !== "inline") {
        openSearchOverlay(bar);
        input.blur();
        return;
      }
      setActive(true);
    });
    input.addEventListener("input", syncInputValueState);
    input.addEventListener("blur", () => {
      if (behavior !== "inline") return;
      window.setTimeout(() => {
        if (!bar.contains(document.activeElement)) setActive(false);
      }, 0);
    });
    syncInputValueState();

    bar.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        input.value = "";
        syncInputValueState();
        input.blur();
        setActive(false);
      });
    }

    if (fieldClearButton) {
      fieldClearButton.addEventListener("click", () => {
        input.value = "";
        syncInputValueState();
        if (behavior === "inline") {
          input.focus();
        }
      });
    }

    if (behavior === "inline-floating") {
      window.requestAnimationFrame(measurePromotedSticky);
      window.addEventListener("scroll", syncPromotedSticky, { passive: true });
      window.addEventListener("resize", measurePromotedSticky);
      window.addEventListener("orientationchange", measurePromotedSticky);
      window.addEventListener("pageshow", measurePromotedSticky);
    }

  });
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
