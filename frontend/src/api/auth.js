import { request } from "./client.js";

/** @param {{ email: string, password: string }} body */
export function login(body) {
  return request("/auth/login", { method: "POST", body });
}

/** @param {{ name: string, email: string, password: string }} body */
export function register(body) {
  return request("/auth/register", { method: "POST", body });
}

export function me() {
  return request("/auth/me");
}
