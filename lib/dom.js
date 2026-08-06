// DOM helpers shared by every platform content script.
// Kept selector-agnostic on purpose: each content script owns its own
// DEFAULT_SELECTORS, and callers can override them via the stored field map
// (see field-map.js) without touching this file.
//
// Filling is deliberately typed out character-by-character with jitter and real
// pointer/focus events, rather than set in one instant call — an instant value-set
// with zero prior pointer interaction is exactly the kind of pattern platform
// bot-detection looks for. This doesn't make the tool "compliant" with any
// platform's automation policy, just less obviously scripted.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs, maxMs) {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}

/** Fires the event sequence a real click-to-focus produces, before any typing. */
function dispatchPointerSequence(el) {
  const opts = { bubbles: true, cancelable: true };
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.focus();
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.dispatchEvent(new MouseEvent("click", opts));
}

function nativeValueSetter(el) {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  return Object.getOwnPropertyDescriptor(proto, "value")?.set;
}

/** Sets a value on a React/Vue-controlled input by going through the native
 *  setter, so the framework's change-tracking doesn't just overwrite it back.
 *  Types one character at a time with randomized inter-key delay instead of
 *  setting the whole string in one call. */
export async function typeNativeValue(el, value) {
  const setter = nativeValueSetter(el);

  dispatchPointerSequence(el);

  let typed = "";
  for (const char of value) {
    typed += char;
    el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
    if (setter) {
      setter.call(el, typed);
    } else {
      el.value = typed;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
    await randomDelay(25, 80);
  }
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** One-shot repair path for native inputs, used when the typed-out fill in
 *  typeNativeValue doesn't stick (e.g. a framework swallowed the keystrokes). */
export function setNativeValue(el, value) {
  const setter = nativeValueSetter(el);
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Selects all of a contenteditable's content, ready to be replaced by the
 *  next inserted character — Range/Selection based, no execCommand. */
function clearEditableText(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Replaces whatever's selected (or, with nothing selected, inserts at the
 *  end) with a single character, via Range — the DOM-native equivalent of
 *  execCommand("insertText", ...), which is deprecated and unevenly
 *  implemented by rich-text frameworks (Draft.js/Quill/Slate) in the wild. */
function insertCharAtCaret(el, char) {
  const sel = window.getSelection();
  let range;
  if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
    range = sel.getRangeAt(0);
  } else {
    range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
  }
  range.deleteContents();
  const textNode = document.createTextNode(char);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** contenteditable-based rich text boxes (common for description fields).
 *  Same character-at-a-time + jitter treatment as typeNativeValue, but fires
 *  the beforeinput/input/compositionend sequence a real IME-driven keystroke
 *  produces instead of relying on execCommand. */
export async function typeEditableText(el, value) {
  dispatchPointerSequence(el);
  clearEditableText(el);

  for (const char of value) {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
    el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: char }));
    insertCharAtCaret(el, char);
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: char }));
    el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
    await randomDelay(25, 80);
  }
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: value }));
}

/** One-shot repair path for contenteditable fields, used when the typed-out
 *  fill in typeEditableText doesn't stick. */
export function setEditableValue(el, value) {
  el.textContent = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Fills the field by simulating real typing first; if the framework ignored
 *  or reverted that (common with tightly-controlled React/Vue inputs), falls
 *  back once to a direct value-set + input/change dispatch. The caller still
 *  does its own post-fill verification — this just avoids failing outright
 *  when a single retry would have fixed it. */
export async function fillTextField(el, value) {
  if (el.isContentEditable) {
    await typeEditableText(el, value);
    if (!fieldLooksFilled(el, value)) setEditableValue(el, value);
  } else {
    await typeNativeValue(el, value);
    if (!fieldLooksFilled(el, value)) setNativeValue(el, value);
  }
}

/** Reads back whatever fillTextField would have written, for post-fill verification. */
export function readFieldValue(el) {
  if (!el) return "";
  return el.isContentEditable ? el.textContent || "" : el.value ?? "";
}

/** Loose containment check: did the field end up holding (roughly) what we tried to write?
 *  Some editors reformat whitespace/punctuation, so this isn't an exact-match compare. */
export function fieldLooksFilled(el, expectedText) {
  const expected = (expectedText || "").trim().slice(0, 12);
  if (!expected) return true;
  return readFieldValue(el).trim().includes(expected);
}

/** Types each tag into a tag-input then presses Enter, one at a time. */
export async function fillTagInput(el, tags) {
  for (const tag of tags) {
    await fillTextField(el, tag);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
    // Give the framework a tick to render the committed tag chip before the next one —
    // randomized so consecutive tags don't land at a suspiciously identical cadence.
    await randomDelay(250, 700);
  }
}

export function buildFile(blob, name, mimeType) {
  return new File([blob], name, { type: mimeType });
}

/** Programmatically assigns a File to a <input type="file"> and fires the
 *  events the page's JS is listening for (works for plain <input> handlers;
 *  drag-drop-only upload zones may need dropTarget as a second attempt). */
export function setFileInputFiles(inputEl, file, dropTarget) {
  dispatchPointerSequence(inputEl);
  const dt = new DataTransfer();
  dt.items.add(file);
  inputEl.files = dt.files;
  inputEl.dispatchEvent(new Event("change", { bubbles: true }));
  inputEl.dispatchEvent(new Event("input", { bubbles: true }));

  if (dropTarget) {
    const dropEvent = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt });
    dropTarget.dispatchEvent(dropEvent);
  }
}

/** Builds a reasonably stable CSS selector for an element, preferring ids/
 *  test-ids over brittle nth-child chains. Used by the field-mapping tool. */
export function getUniqueSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;

  const testId = el.getAttribute("data-testid") || el.getAttribute("data-e2e");
  if (testId) return `[data-testid="${CSS.escape(testId)}"], [data-e2e="${CSS.escape(testId)}"]`;

  const tag = el.tagName.toLowerCase();
  const name = el.getAttribute("name");
  if (name) return `${tag}[name="${CSS.escape(name)}"]`;

  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return `${tag}[aria-label="${CSS.escape(ariaLabel)}"]`;

  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return `${tag}[placeholder="${CSS.escape(placeholder)}"]`;

  const path = [];
  let node = el;
  while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body) {
    let selector = node.tagName.toLowerCase();
    if (node.parentElement) {
      const siblings = Array.from(node.parentElement.children).filter((c) => c.tagName === node.tagName);
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
    }
    path.unshift(selector);
    node = node.parentElement;
  }
  return path.join(" > ");
}

/** Selectors can be a single CSS string or a priority-ordered array of
 *  candidates ("try #1, then #2, then #3…"). Always normalized to an array. */
function candidateList(selectors) {
  return (Array.isArray(selectors) ? selectors : [selectors]).filter(Boolean);
}

/** Tries each candidate selector in order, returns the first element that
 *  currently matches (or null). Order = priority, not DOM position. */
export function queryFirst(selectors) {
  for (const sel of candidateList(selectors)) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export function waitForElement(selectors, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const existing = queryFirst(selectors);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const found = queryFirst(selectors);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timed out waiting for any of: ${candidateList(selectors).join(" | ")}`));
    }, timeoutMs);
  });
}
