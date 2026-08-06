// TikTok Studio upload page (tiktok.com/tiktokstudio/upload).
// TikTok has ONE caption box (no separate title field, no separate tag field —
// hashtags are typed inline into the caption). Best-effort default selectors;
// if TikTok's markup has moved on, re-point them with 映射字段 in the popup.
import { registerAutofill } from "../lib/autofill-runner.js";

const DEFAULT_SELECTORS = {
  fileInput: ['input[type="file"]', 'input[accept*="video"]', 'input[accept*="image"]'],
  description: [
    'div[contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"]',
    '[aria-label*="caption" i][contenteditable="true"]',
    'textarea'
  ]
};

registerAutofill("tiktok", DEFAULT_SELECTORS, {
  buildDescription(entry) {
    const tags = (entry.tags || []).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    return [entry.title, entry.description, tags].filter(Boolean).join("\n\n");
  }
});
