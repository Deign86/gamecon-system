/**
 * networkStatus.js — Cross-platform connectivity detection for PlayVerse Ops.
 *
 * Platforms:
 *   • Web     — navigator.onLine + online/offline events (reliable in browsers)
 *   • Android — @capacitor/network plugin (navigator.onLine is unreliable in WebView)
 *   • Desktop — Tauri: periodic fetch probe (no native network API in Tauri v2 webview)
 *
 * Exports a unified `NetworkMonitor` that fires callbacks regardless of platform.
 */

import { isCapacitor, isTauri } from "./messaging";

/* ── Tiny probe: hit a small known endpoint to verify real connectivity ── */
const PROBE_URL = "https://www.gstatic.com/generate_204";
const PROBE_TIMEOUT = 4000; // ms

async function probeConnectivity() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT);
    const res = await fetch(PROBE_URL, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    // no-cors returns opaque response (status 0) — that's fine, it means the request left the device
    return true;
  } catch {
    return false;
  }
}

/* ── Capacitor Network Plugin ── */

async function createCapacitorMonitor(onChange) {
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    let currentlyOnline = status.connected;
    onChange(currentlyOnline);

    const handle = await Network.addListener("networkStatusChange", (s) => {
      currentlyOnline = s.connected;
      onChange(currentlyOnline);
    });

    return () => {
      handle?.remove?.();
    };
  } catch (err) {
    console.warn("[networkStatus] Capacitor Network plugin unavailable, falling back to navigator.onLine:", err.message);
    return createBrowserMonitor(onChange);
  }
}

/* ── Browser (Web) Monitor ── */

function createBrowserMonitor(onChange) {
  let current = navigator.onLine;
  onChange(current);

  const goOnline = () => { current = true; onChange(true); };
  const goOffline = () => { current = false; onChange(false); };

  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);

  return () => {
    window.removeEventListener("online", goOnline);
    window.removeEventListener("offline", goOffline);
  };
}

/* ── Tauri / Desktop Monitor — probe-based ── */

function createTauriMonitor(onChange) {
  let current = navigator.onLine;
  let running = true;
  onChange(current);

  // Also listen to browser events as a quick signal
  const goOnline = () => { current = true; onChange(true); };
  const goOffline = () => { current = false; onChange(false); };
  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);

  // Periodic probe every 10s to catch cases where navigator.onLine lies
  async function poll() {
    while (running) {
      await new Promise((r) => setTimeout(r, 10_000));
      if (!running) break;
      const ok = await probeConnectivity();
      if (ok !== current) {
        current = ok;
        onChange(ok);
      }
    }
  }
  poll();

  return () => {
    running = false;
    window.removeEventListener("online", goOnline);
    window.removeEventListener("offline", goOffline);
  };
}

/* ── Unified Factory ── */

/**
 * Start monitoring network connectivity. Calls `onChange(boolean)` immediately
 * with the current state and again on every change.
 *
 * @param {(online: boolean) => void} onChange
 * @returns {Promise<() => void>} cleanup / unsubscribe function
 */
export async function startNetworkMonitor(onChange) {
  if (isCapacitor()) {
    return createCapacitorMonitor(onChange);
  }
  if (isTauri()) {
    return createTauriMonitor(onChange);
  }
  return createBrowserMonitor(onChange);
}

/**
 * One-shot connectivity check. Returns true if the device can reach the internet.
 * On web/Tauri falls back to a probe; Capacitor uses the Network plugin.
 */
export async function checkConnectivity() {
  if (isCapacitor()) {
    try {
      const { Network } = await import("@capacitor/network");
      const s = await Network.getStatus();
      return s.connected;
    } catch {
      return navigator.onLine;
    }
  }
  // For Tauri and Web, do a real probe
  return probeConnectivity();
}
