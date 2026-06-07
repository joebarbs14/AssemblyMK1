import { redirect } from "next/navigation";

import { api } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { FlowRateForm, type Prefill } from "./FlowRateForm";

export const metadata = { title: "Apply for a flow rate test — Assembly" };

export default async function FlowRateTestPage() {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const prefill = await api<Prefill>("/api/water/flow-rate-test/prefill", { token }).catch(
    () => ({
      applicant_name: "",
      contact_email: "",
      contact_phone: null,
      postal_address: null,
      properties: [],
    } as Prefill),
  );

  return <FlowRateForm token={token} prefill={prefill} />;
}
