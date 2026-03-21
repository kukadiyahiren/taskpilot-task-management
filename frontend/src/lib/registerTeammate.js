const BASE = import.meta.env.VITE_API_BASE ?? "/api";

function parseDetail(text) {
  try {
    const j = JSON.parse(text);
    if (typeof j.detail === "string") return j.detail;
  } catch {
    /* ignore */
  }
  return text || "Request failed";
}

/** Register a new user without using the current session token (does not log you out). */
export async function registerTeammate({ name, email, password }) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(parseDetail(text));
  return JSON.parse(text);
}
