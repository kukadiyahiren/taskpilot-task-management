import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE ?? "/api";

export const http = axios.create({
  baseURL,
  headers: { Accept: "application/json" },
  timeout: 30_000,
});

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const d = err.response?.data;
    let msg = err.message ?? "Request failed";
    if (typeof d === "string") msg = d;
    else if (d?.detail != null) {
      const det = d.detail;
      if (typeof det === "string") msg = det;
      else if (Array.isArray(det)) msg = det.map((x) => x.msg ?? JSON.stringify(x)).join(", ");
      else msg = String(det);
    }
    return Promise.reject(new Error(msg));
  }
);
