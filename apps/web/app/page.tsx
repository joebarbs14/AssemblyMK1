import { redirect } from "next/navigation";

import { api, type Me } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export default async function Home() {
  const token = await readSessionToken();
  if (!token) redirect("/login");
  try {
    const me = await api<Me>("/api/auth/me", { token });
    redirect(me.role === "staff" || me.role === "admin" ? "/staff" : "/account");
  } catch {
    redirect("/login");
  }
}
