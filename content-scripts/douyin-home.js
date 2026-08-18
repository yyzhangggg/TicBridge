// 抖音创作者服务平台. This deliberately uses the same rounded, closable
// in-page panel as the other creator centers, rather than Chrome's native
// action popup. Douyin-specific field autofill has not been implemented yet,
// so the panel is available for schedule, Drive, account, and theme management
// while fill/map actions remain disabled on this site.
import { initPopupOverlay } from "../lib/popup-overlay.js";

if (!globalThis.__ticBridgeDouyinPanelLoaded) {
  globalThis.__ticBridgeDouyinPanelLoaded = true;
  initPopupOverlay("dashboard", {}, { openOnLoad: true });
}
