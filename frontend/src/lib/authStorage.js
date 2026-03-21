const KEY = "taskpilot_access_token";

export function getAccessToken() {
  return localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
}

/** @param {string} token */
export function setAccessToken(token, remember) {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  if (remember) localStorage.setItem(KEY, token);
  else sessionStorage.setItem(KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
