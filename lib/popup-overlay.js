// Replaces the old native chrome.action popup: instead of Chrome opening a
// separate window, clicking the toolbar icon sends a TOGGLE_POPUP message
// (see background.js's chrome.action.onClicked) to whichever platform content
// script is running on the current tab, which shows/hides a floating div of
// its own, injected into the page. Only ever wired up on the three platform
// pages that already load a content script — see manifest.json's content_scripts.
import { mountPopupPanel } from "./popup-panel.js";
import { POPUP_PANEL_CSS } from "./popup-panel-styles.js";

const HOST_ID = "__ext_popup_root";

function buildPanelMarkup() {
  return (
    '<div class="app-bg" id="appBg">' +
    '<header class="hd"><div class="hd-top">' +
    '<div class="hd-title">TicBridge <span class="hd-sub" id="hdSub"></span></div>' +
    '<div class="hd-actions">' +
    '<select class="lang-select" id="langSelect" aria-label="Language / 语言 / Langue">' +
    '<option value="zh">中文</option><option value="en">EN</option><option value="fr">FR</option>' +
    "</select>" +
    '<button class="panel-close" id="panelClose" type="button" aria-label="Close">×</button>' +
    "</div>" +
    "</div></header>" +
    '<nav class="tabs" id="pageTabs">' +
    '<button class="tab" data-page="tiktok"></button>' +
    '<button class="tab" data-page="rednote"></button>' +
    '<button class="tab" data-page="bilibili"></button>' +
    '<button class="tab" data-page="profile"></button>' +
    "</nav>" +
    '<main id="pageContent"></main>' +
    "</div>"
  );
}

let activeCleanup = null;

function closePanel() {
  const existing = document.getElementById(HOST_ID);
  if (existing) existing.remove();
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
}

function openPanel(platformId, autofillApi) {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = POPUP_PANEL_CSS;
  shadow.appendChild(style);

  const container = document.createElement("div");
  container.innerHTML = buildPanelMarkup();
  shadow.appendChild(container.firstElementChild);

  document.documentElement.appendChild(host);

  // Clicking anywhere outside the panel (event target gets retargeted to the
  // shadow host for listeners outside the shadow tree) or pressing Esc closes it,
  // mirroring how a native popup dismisses on outside click.
  const onDocClick = (e) => {
    if (host.contains(e.target)) return;
    closePanel();
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") closePanel();
  };
  function attachOutsideDismiss() {
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }
  function detachOutsideDismiss() {
    document.removeEventListener("click", onDocClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  const setHidden = (hidden) => {
    host.style.visibility = hidden ? "hidden" : "visible";
    host.style.pointerEvents = hidden ? "none" : "auto";
    // While hidden (e.g. during field-mapping) the user is expected to click
    // real fields on the page — those clicks must not be mistaken for a
    // dismiss-the-panel click, so the outside-click/Esc listeners come off
    // entirely instead of just becoming no-ops.
    if (hidden) detachOutsideDismiss();
    else attachOutsideDismiss();
  };

  mountPopupPanel(shadow, {
    platformId,
    autofillApi,
    onClose: closePanel,
    onRequestHide: () => setHidden(true),
    onRequestShow: () => setHidden(false)
  });

  attachOutsideDismiss();
  activeCleanup = detachOutsideDismiss;
}

export function initPopupOverlay(platformId, autofillApi) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "TOGGLE_POPUP") return false;
    if (document.getElementById(HOST_ID)) {
      closePanel();
    } else {
      openPanel(platformId, autofillApi);
    }
    sendResponse({ ok: true });
    return false;
  });
}
