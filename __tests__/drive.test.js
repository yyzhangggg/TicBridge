import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { getNewestFileInFolder, parseFolderId, streamFile } from "../lib/drive.js";
import { clearCachedGoogleToken } from "../lib/auth.js";

describe("parseFolderId", () => {
  test("returns a trimmed bare folder ID", () => {
    expect(parseFolderId("  folder_ABC-123  ")).toBe("folder_ABC-123");
  });

  test("extracts a folder ID from a Drive folder URL", () => {
    expect(parseFolderId("https://drive.google.com/drive/folders/folder_ABC-123?usp=sharing")).toBe("folder_ABC-123");
  });

  test("extracts a folder ID from a URL with path segments after it", () => {
    expect(parseFolderId("https://drive.google.com/drive/folders/folder_ABC-123/view")).toBe("folder_ABC-123");
  });
});

describe("getNewestFileInFolder", () => {
  let previousChrome;
  let previousFetch;

  beforeEach(() => {
    previousChrome = global.chrome;
    previousFetch = global.fetch;
    global.chrome = {
      identity: {
        getAuthToken: (_options, callback) => callback("test-token")
      },
      runtime: { lastError: null }
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.chrome = previousChrome;
    global.fetch = previousFetch;
  });

  test("returns Drive's first result, which the request asks Drive to order newest first", async () => {
    const newest = { id: "newest", name: "latest.mp4", modifiedTime: "2026-01-02T00:00:00Z" };
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ files: [newest] }) });

    await expect(getNewestFileInFolder("folder-id")).resolves.toEqual(newest);

    const requestUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(requestUrl.searchParams.get("orderBy")).toBe("modifiedTime desc");
    expect(requestUrl.searchParams.get("pageSize")).toBe("1");
    expect(requestUrl.searchParams.get("q")).toContain("'folder-id' in parents");
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  });

  test("returns null when Drive reports no media files", async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ files: [] }) });

    await expect(getNewestFileInFolder("empty-folder")).resolves.toBeNull();
  });
});
