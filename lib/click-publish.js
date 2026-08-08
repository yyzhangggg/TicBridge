// Shared helper for creator "home" pages that don't have the publish form
// themselves — they just link out to it. Clicking the nav button here saves a
// manual click before the real per-platform autofill content script (e.g.
// rednote.js on /publish/publish) ever gets a chance to run.
function isVisible(el) {
  if (!el || !el.isConnected) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findButtonByText(texts) {
  const candidates = document.querySelectorAll("button, a, div[role='button'], span");
  for (const el of candidates) {
    const label = (el.textContent || "").trim();
    if (texts.includes(label) && isVisible(el)) return el;
  }
  return null;
}

function click(el) {
  const opts = { bubbles: true, cancelable: true };
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.click();
}

/** Waits (home pages render their nav async) for a button/link whose text
 *  exactly matches one of `texts`, then clicks it. Resolves with the clicked
 *  element, or rejects if nothing matched within timeoutMs. */
export function clickPublishButton(texts, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const existing = findButtonByText(texts);
    if (existing) {
      click(existing);
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const found = findButtonByText(texts);
      if (found) {
        observer.disconnect();
        click(found);
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`None of [${texts.join(", ")}] found within ${timeoutMs}ms`));
    }, timeoutMs);
  });
}
