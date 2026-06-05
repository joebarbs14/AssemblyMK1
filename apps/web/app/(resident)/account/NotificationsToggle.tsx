"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { API_BASE, DEFAULT_COUNCIL_SLUG } from "@/lib/env";

type State = "loading" | "unsupported" | "denied" | "pending" | "enabled" | "disabled";

function urlBase64ToArrayBuffer(b64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const safe = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(safe);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function NotificationsToggle({ token }: { token: string }) {
  const [state, setState] = React.useState<State>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [publicKey, setPublicKey] = React.useState<string | null>(null);

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
    };
  }

  React.useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const r = await fetch(`${API_BASE}/api/push/public-key`, { headers: headers() });
      const data = (await r.json()) as { public_key: string | null };
      if (!data.public_key) {
        setState("pending");
        return;
      }
      setPublicKey(data.public_key);
      // Check existing subscription
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "enabled" : "disabled");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enable() {
    if (!publicKey) return;
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(publicKey),
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const r = await fetch(`${API_BASE}/api/devices/web-push`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(json),
      });
      if (!r.ok) throw new Error("Couldn't register with council");
      setState("enabled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't enable");
    }
  }

  async function disable() {
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(
          `${API_BASE}/api/devices/web-push?endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE", headers: headers() },
        );
        await sub.unsubscribe();
      }
      setState("disabled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't disable");
    }
  }

  if (state === "loading") return <p style={{ color: "var(--text-secondary)" }}>Checking…</p>;

  if (state === "unsupported") {
    return (
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
        Push notifications aren't supported on this device or browser.
      </p>
    );
  }

  if (state === "pending") {
    return (
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
        Council hasn't set up push notifications yet. Until then we'll email you.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p style={{ color: "var(--danger)", fontSize: "0.875rem", margin: 0 }}>
        You've blocked notifications for this site. Enable them in your browser settings, then reload.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {state === "enabled" ? (
        <Button variant="secondary" onClick={disable}>
          Turn off notifications
        </Button>
      ) : (
        <Button onClick={enable}>Enable notifications</Button>
      )}
      {error && (
        <p role="alert" style={{ color: "var(--danger)", fontSize: "0.875rem", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
