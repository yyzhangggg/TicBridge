// Instagram post composer has a caption-only flow; merge the editable fields.
import { registerAutofill } from "../lib/autofill-runner.js";

registerAutofill("instagram", {
  fileInput: 'input[type="file"]',
  description: 'div[contenteditable="true"], textarea[aria-label*="caption" i]'
}, {
  buildDescription(entry) {
    const tags = (entry.tags || []).map((tag) => tag.startsWith("#") ? tag : `#${tag}`).join(" ");
    return [entry.title, entry.description, tags].filter(Boolean).join("\n\n");
  }
});
