import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { candidateList, findFieldCandidates, queryFirst } from "../lib/dom.js";

describe("DOM selector helpers", () => {
  const primary = { id: "primary" };
  const secondary = { id: "secondary" };
  let previousDocument;

  beforeEach(() => {
    previousDocument = global.document;
    global.document = {
      querySelector: jest.fn((selector) => ({ "#primary": primary, ".secondary": secondary }[selector] || null)),
      querySelectorAll: jest.fn((selector) => ({
        ".many": [primary, secondary],
        ".secondary": [secondary]
      }[selector] || []))
    };
  });

  afterEach(() => {
    global.document = previousDocument;
  });

  test("normalizes one selector or a priority list", () => {
    expect(candidateList("#primary")).toEqual(["#primary"]);
    expect(candidateList(["", null, "#primary"])).toEqual(["#primary"]);
  });

  test("chooses the first selector that matches, not the first element in the page", () => {
    expect(queryFirst([".missing", ".secondary", "#primary"])).toBe(secondary);
    expect(global.document.querySelector).toHaveBeenNthCalledWith(1, ".missing");
    expect(global.document.querySelector).toHaveBeenNthCalledWith(2, ".secondary");
  });

  test("returns all matches for the first matching selector so callers can detect ambiguity", () => {
    expect(findFieldCandidates([".missing", ".many", ".secondary"])).toEqual({
      selector: ".many",
      matches: [primary, secondary]
    });
    expect(findFieldCandidates(".missing")).toEqual({ selector: null, matches: [] });
  });
});
