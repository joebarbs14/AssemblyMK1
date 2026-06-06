import Link from "next/link";
import { redirect } from "next/navigation";

import { readSessionToken } from "@/lib/session";

import { Chat } from "./Chat";

export default async function AskPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.25rem 6rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>← Home</Link>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>
        Ask council
      </h1>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
        AI assistant trained on council policies, waste rules, rates and permits.
        Cites its sources — never guesses.
      </p>

      <Chat token={token} />
    </main>
  );
}
