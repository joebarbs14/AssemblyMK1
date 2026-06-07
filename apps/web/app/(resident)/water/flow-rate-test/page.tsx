import { redirect } from "next/navigation";

import { api, type S68Application } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { FlowRateForm, type Prefill, type LinkedSection68 } from "./FlowRateForm";

export const metadata = { title: "Apply for a flow rate test — Assembly" };

export default async function FlowRateTestPage({
  searchParams,
}: {
  searchParams: Promise<{ s68?: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const { s68 } = await searchParams;
  const parentId = s68 ? Number(s68) : NaN;

  const [prefill, linked] = await Promise.all([
    api<Prefill>("/api/water/flow-rate-test/prefill", { token }).catch(
      () => ({
        applicant_name: "",
        contact_email: "",
        contact_phone: null,
        postal_address: null,
        properties: [],
      } as Prefill),
    ),
    Number.isFinite(parentId)
      ? api<S68Application>(`/api/section-68/${parentId}`, { token })
          .then<LinkedSection68 | null>((p) => ({
            id: p.id,
            reference: p.reference,
            street_address: p.street_address,
            activity_class: p.activity_class,
          }))
          .catch(() => null)
      : Promise.resolve(null as LinkedSection68 | null),
  ]);

  return <FlowRateForm token={token} prefill={prefill} linkedSection68={linked} />;
}
