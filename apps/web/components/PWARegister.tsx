"use client";

import * as React from "react";

import { drainPendingReports } from "@/lib/offline";

export function PWARegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return; // skip in dev

    navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    // SW asks us to flush queued drafts when online.
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "drain-pending-reports") {
        void drainPendingReports();
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage);

    // Also try once on every load (e.g. PC came back online and SW didn't fire).
    if (navigator.onLine) void drainPendingReports();
    window.addEventListener("online", () => void drainPendingReports());

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
