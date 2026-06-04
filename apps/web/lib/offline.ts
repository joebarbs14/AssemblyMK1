"use client";

import Dexie, { type Table } from "dexie";

import { API_BASE, DEFAULT_COUNCIL_SLUG } from "./env";

export interface PendingReportDraft {
  id?: number;
  createdAt: number;
  body: {
    category_id: number;
    title: string;
    description: string;
    lat: number | null;
    lng: number | null;
    address_text: string | null;
    attachment_keys: string[];
  };
  status: "pending" | "sending" | "failed";
  lastError?: string;
}

class AssemblyDB extends Dexie {
  pendingReports!: Table<PendingReportDraft, number>;
  constructor() {
    super("assembly");
    this.version(1).stores({
      pendingReports: "++id, createdAt, status",
    });
  }
}

let _db: AssemblyDB | null = null;
function db(): AssemblyDB {
  if (!_db) _db = new AssemblyDB();
  return _db;
}

export async function enqueueReportDraft(body: PendingReportDraft["body"]): Promise<number> {
  const id = await db().pendingReports.add({
    createdAt: Date.now(),
    body,
    status: "pending",
  });
  // Best-effort: ask the SW to drain when network returns. Safe to ignore failures.
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && "sync" in reg) {
      await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register(
        "drain-pending-reports",
      );
    }
  } catch {
    // no background sync support; we'll flush on next page load instead
  }
  return id as number;
}

export async function listPendingDrafts(): Promise<PendingReportDraft[]> {
  return await db().pendingReports.orderBy("createdAt").toArray();
}

export async function drainPendingReports(): Promise<{ sent: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) return { sent: 0, failed: 0 };

  const pending = await db().pendingReports.where("status").anyOf("pending", "failed").toArray();
  let sent = 0;
  let failed = 0;

  for (const draft of pending) {
    if (draft.id == null) continue;
    await db().pendingReports.update(draft.id, { status: "sending" });
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Council-Slug": DEFAULT_COUNCIL_SLUG,
        },
        body: JSON.stringify(draft.body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await db().pendingReports.delete(draft.id);
      sent++;
    } catch (err) {
      failed++;
      await db().pendingReports.update(draft.id, {
        status: "failed",
        lastError: err instanceof Error ? err.message : "unknown",
      });
    }
  }
  return { sent, failed };
}
