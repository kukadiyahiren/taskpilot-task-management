/** @param {string | undefined | null} name */
export function initialsFromName(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** @param {string | undefined | null} name */
export function firstNameFromName(name) {
  if (!name || typeof name !== "string") return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}
