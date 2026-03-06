const header = document.querySelector(".appbar");
const blurLayer = document.createElement("div");
blurLayer.className = "appbar-blur-layer";
blurLayer.innerHTML = Array.from({ length: 20 }, (_, i) => `<span style="--step: ${i}"></span>`).join("");
header.appendChild(blurLayer);

const syncScrollState = () => {
  document.body.classList.toggle("scrolled", window.scrollY > 0);
};
syncScrollState();
window.addEventListener("scroll", syncScrollState, { passive: true });

const cards = document.querySelector("#cards");
const cardIcon =
  '<span class="card-leading"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12.7803 1.79476C12.4702 1.13515 11.5398 1.13515 11.2197 1.79476L8.65867 8.28094L1.76593 8.50082C1.02563 8.58077 0.735518 9.50023 1.28574 9.99993L6.58785 14.2574L4.86716 20.7636C4.7171 21.4832 5.4774 22.0429 6.12766 21.6931L12 17.9553L17.8723 21.6931C18.5126 22.0429 19.2729 21.4832 19.1328 20.7636L17.4122 14.2574L22.7143 9.99993C23.2645 9.50023 22.9744 8.59076 22.2341 8.50082L15.3413 8.28094L12.7803 1.79476Z" fill="white"/></svg></span>';
cards.innerHTML = Array.from({ length: 20 }, () => `<section class="card"><p>${cardIcon}<span>Card title</span></p></section>`).join("");

const triggerAppbarBtnBounce = (button) => {
  button.classList.remove("press-bounce");
  // Force reflow so animation restarts on rapid repeated taps.
  void button.offsetWidth;
  button.classList.add("press-bounce");
};

const appbarButtons = document.querySelectorAll(".appbar-btn");
appbarButtons.forEach((button) => {
  if (window.PointerEvent) {
    button.addEventListener("pointerdown", () => triggerAppbarBtnBounce(button));
  } else {
    button.addEventListener("touchstart", () => triggerAppbarBtnBounce(button), { passive: true });
  }
  button.addEventListener("animationend", () => {
    button.classList.remove("press-bounce");
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
reloadBtn.addEventListener("click", () => {
  hardRefresh().catch(() => window.location.reload());
});

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
