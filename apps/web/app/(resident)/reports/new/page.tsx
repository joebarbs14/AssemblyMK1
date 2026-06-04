import { redirect } from "next/navigation";

import { api, type Category } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { NewReportForm } from "./NewReportForm";

export default async function NewReportPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  let categories: Category[] = [];
  try {
    categories = await api<Category[]>("/api/reports/categories", { token });
  } catch {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Report an issue</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "1.5rem" }}>
        Tell council what's happening. We'll let you know when someone picks it up.
      </p>
      <NewReportForm categories={categories} token={token} />
    </main>
  );
}
