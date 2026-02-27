/**
 * ForegroundNotificationHandler
 * ─────────────────────────────
 * Listens for FCM messages that arrive while the app is in the foreground
 * and displays them as Toast notifications. Mount this once inside the
 * ToastProvider boundary (e.g. in AppShell).
 */

import { useEffect } from "react";
import { onForegroundMessage } from "../lib/messaging";
import { useToast } from "./Toast";

export default function ForegroundNotificationHandler() {
  const toast = useToast();

  useEffect(() => {
    let unsub = () => {};

    onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      const severity = payload.data?.severity || "low";

      const variant =
        severity === "high" ? "error" :
        severity === "medium" ? "warning" :
        "info";

      const text = title
        ? `${title}${body ? " — " + body : ""}`
        : body || "A new incident has been reported.";

      toast(text, variant, 6000);
    }).then((unsubFn) => {
      unsub = unsubFn;
    });

    return () => unsub();
  }, [toast]);

  return null;
}
