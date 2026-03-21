import { getAccessToken } from "./authStorage.js";

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

function parseFilename(contentDisposition) {
  if (!contentDisposition) return null;
  const m = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;\s]+)/i
  );
  if (m) {
    if (m[1]) {
      try {
        return decodeURIComponent(m[1].trim());
      } catch {
        return m[1].trim();
      }
    }
    if (m[2]) return m[2];
    if (m[3]) return m[3].replace(/^"+|"+$/g, "");
  }
  return null;
}

/**
 * @param {number} boardId
 * @param {"csv"|"xlsx"} fileFormat
 */
export async function downloadBoardExport(boardId, fileFormat = "csv") {
  const token = getAccessToken();
  const qs = new URLSearchParams({ file_format: fileFormat });
  const res = await fetch(`${BASE}/boards/${boardId}/export?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  const blob = await res.blob();
  const fn =
    parseFilename(res.headers.get("Content-Disposition")) ||
    `board-${boardId}-tasks.${fileFormat === "xlsx" ? "xlsx" : "csv"}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fn;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
