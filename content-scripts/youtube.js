// YouTube Studio upload flow. Text selectors intentionally use stable ids/labels.
import { registerAutofill } from "../lib/autofill-runner.js";

registerAutofill("youtube", {
  fileInput: 'input[type="file"]',
  title: '#title-textarea #textbox, textarea[aria-label*="title" i]',
  description: '#description-textarea #textbox, textarea[aria-label*="description" i]'
}, {
  buildDescription(entry) {
    return [entry.description, (entry.tags || []).join(", ")].filter(Boolean).join("\n\n");
  }
});
