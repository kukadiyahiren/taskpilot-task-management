import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import faviconUrl from "./assets/favicon.png";
import "./index.css";
import { ThemeProvider } from "./theme/ThemeContext.jsx";

const faviconLink =
  document.querySelector("link[rel='icon']") ??
  (() => {
    const el = document.createElement("link");
    el.rel = "icon";
    document.head.appendChild(el);
    return el;
  })();
faviconLink.type = "image/png";
faviconLink.href = faviconUrl;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
