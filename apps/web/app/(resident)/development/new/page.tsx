import Link from "next/link";
import { redirect } from "next/navigation";

import { api, type PropertyListItem } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { DAForm } from "./DAForm";

export default async function NewDAPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const properties = await api<PropertyListItem[]>("/api/rates/properties", { token });

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/development" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        ← Development applications
      </Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.5rem" }}>
        Submit a development application
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem" }}>
        Council will review and decide. You'll see status updates here as it progresses.
      </p>
      <DAForm token={token} properties={properties} />
    </main>
  );
}
