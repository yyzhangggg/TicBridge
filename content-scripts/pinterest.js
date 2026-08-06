// Pinterest serves both Phase ② wallpaper Pins and Phase ④ photography Pins.
import { registerAutofill } from "../lib/autofill-runner.js";

const DEFAULT_SELECTORS = {
  fileInput: 'input[type="file"]',
  title: 'textarea[id*="title"], input[placeholder*="title" i]',
  description: 'textarea[id*="description"], textarea[placeholder*="description" i], div[contenteditable="true"]'
};

registerAutofill(["scripturePinterest", "pinterestDaily"], DEFAULT_SELECTORS, {
  buildDescription(entry) {
    return [entry.description, (entry.tags || []).join(", ")].filter(Boolean).join("\n\n");
  }
});
