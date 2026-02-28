import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./hooks/useTheme";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

/* ── Register App Shell Service Worker ── */
/* Service workers only work reliably in regular browser contexts.
   Capacitor (Android) uses its own native webview with file:// or capacitor:// scheme,
   and Tauri uses tauri:// — neither supports SW registration for caching.
   Firestore offline persistence handles data caching on those platforms. */
const isNativeApp =
  (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) ||
  (typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined);

if ("serviceWorker" in navigator && !isNativeApp) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (import.meta.env.DEV) {
          console.info("[SW] registered:", reg.scope);
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn("[SW] registration failed:", err);
        }
      });
  });
}
