const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function request(path, options = {}) {
  const { body, ...init } = options;
  const headers = { ...init.headers };
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body: body !== undefined && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  patch: (p, body) => request(p, { method: "PATCH", body }),
  delete: (p) => request(p, { method: "DELETE" }),
};
