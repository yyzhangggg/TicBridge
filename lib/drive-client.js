// Content-script-side counterpart to the "drive-download" port opened in background.js.
// Downloads arrive as a stream of chunk messages rather than one giant sendMessage
// payload, so large videos don't have to be fully buffered before anything can move.
//
// Each chunk is wrapped in its own Blob as soon as it arrives and kept as a segment
// rather than copied into one growing Uint8Array. The final `new Blob(segments)` join
// is structural (the browser references the existing segments, backing large ones to
// disk instead of holding everything in JS heap) — it does not re-copy every byte the
// way a manual concat loop does, which is what made big video downloads CPU-heavy.
export function downloadNewestDriveFile(platformId) {
  return new Promise((resolve) => {
    const port = chrome.runtime.connect({ name: "drive-download" });
    const segments = [];
    let settled = false;

    function finish(result) {
      if (settled) return;
      settled = true;
      resolve(result);
    }

    port.onMessage.addListener((msg) => {
      if (msg.type === "chunk") {
        segments.push(new Blob([msg.data]));
      } else if (msg.type === "done") {
        port.disconnect();
        finish({ file: msg.file, blob: new Blob(segments, { type: msg.file.mimeType }) });
      } else if (msg.type === "error") {
        port.disconnect();
        finish({ error: true, code: msg.code, message: msg.message });
      }
    });

    port.onDisconnect.addListener(() => {
      // Service worker died mid-transfer (idle timeout, crash) before a done/error
      // arrived — surface it as a normal failure instead of hanging forever.
      finish({ error: true, code: "file-fetch-failed", message: "Drive connection closed unexpectedly" });
    });

    port.postMessage({ type: "START", platformId });
  });
}
