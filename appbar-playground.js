const adaptiveAppbar = document.querySelector("[data-adaptive-appbar]");

if (adaptiveAppbar) {
  const titleInput = document.querySelector('[data-control="title"]');
  const subtitleInput = document.querySelector('[data-control="subtitle"]');
  const rightToggle = document.querySelector('[data-control="show-right"]');
  const doubleToggle = document.querySelector('[data-control="show-double"]');
  const titleText = document.querySelector("[data-appbar-title-text]");
  const subtitleText = document.querySelector("[data-appbar-subtitle-text]");
  const titleStack = document.querySelector("[data-appbar-stack]");
  const leading = document.querySelector("[data-appbar-leading]");
  const trailing = document.querySelector("[data-appbar-trailing]");
  const singleButton = document.querySelector("[data-right-single]");
  const doubleButton = document.querySelector("[data-right-double]");

  const px = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const syncAdaptiveLayout = () => {
    const styles = getComputedStyle(adaptiveAppbar);
    const inlinePad = px(styles.getPropertyValue("--appbar-inline-pad"));
    const sideGap = px(styles.getPropertyValue("--appbar-side-gap"));
    const leadingWidth = leading.hidden ? 0 : leading.offsetWidth;
    const trailingWidth = trailing.hidden ? 0 : trailing.offsetWidth;
    const leadingSpace = inlinePad + leadingWidth + (leadingWidth > 0 ? sideGap : 0);
    const trailingSpace = trailing.hidden ? inlinePad : inlinePad + trailingWidth + sideGap;
    const symmetricSpace = Math.max(leadingSpace, trailingSpace);
    const centeredWidth = Math.max(0, adaptiveAppbar.clientWidth - symmetricSpace * 2);
    const contentWidth = Math.max(titleText.scrollWidth, subtitleText.hidden ? 0 : subtitleText.scrollWidth);
    const isOverflowing = contentWidth > centeredWidth + 1;

    adaptiveAppbar.style.setProperty("--appbar-leading-space", `${leadingSpace}px`);
    adaptiveAppbar.style.setProperty("--appbar-trailing-space", `${trailingSpace}px`);
    adaptiveAppbar.style.setProperty("--appbar-symmetric-space", `${symmetricSpace}px`);
    adaptiveAppbar.dataset.overflow = isOverflowing ? "on" : "off";
  };

  const syncControls = () => {
    const nextTitle = titleInput.value.trim();
    const nextSubtitle = subtitleInput.value.trim();
    const showRight = rightToggle.checked;
    const showDouble = showRight && doubleToggle.checked;

    titleText.textContent = nextTitle || " ";
    subtitleText.textContent = nextSubtitle;
    subtitleText.hidden = nextSubtitle.length === 0;
    titleStack.classList.toggle("has-subtitle", nextSubtitle.length > 0);
    adaptiveAppbar.dataset.right = showDouble ? "double" : showRight ? "single" : "none";
    adaptiveAppbar.dataset.subtitle = nextSubtitle.length > 0 ? "on" : "off";

    trailing.hidden = !showRight;
    singleButton.hidden = !showRight || showDouble;
    doubleButton.hidden = !showRight || !showDouble;

    syncAdaptiveLayout();
  };

  [titleInput, subtitleInput, rightToggle, doubleToggle].forEach((control) => {
    control.addEventListener("input", syncControls);
    control.addEventListener("change", syncControls);
  });

  window.addEventListener("resize", syncAdaptiveLayout, { passive: true });
  window.addEventListener("orientationchange", syncAdaptiveLayout);

  syncControls();
}
