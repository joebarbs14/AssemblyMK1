import { redirect } from "next/navigation";

import { api, type S68ActivityClass, type S68Prefill } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

import { Section68NewForm } from "./Section68NewForm";

export const metadata = { title: "Start a Section 68 application — Assembly" };

export default async function NewSection68Page({
  searchParams,
}: {
  searchParams: Promise<{ part?: string; subtype?: string; new_build?: string }>;
}) {
  const token = await readSessionToken();
  if (!token) redirect("/login");

  const { part, subtype, new_build } = await searchParams;

  const [classes, prefill] = await Promise.all([
    api<S68ActivityClass[]>("/api/section-68/activity-classes", { token }),
    api<S68Prefill>("/api/section-68/prefill", { token }).catch(
      () => ({
        applicant_name: "",
        contact_email: "",
        contact_phone: null,
        postal_address: null,
        properties: [],
      } as S68Prefill),
    ),
  ]);

  return (
    <Section68NewForm
      token={token}
      classes={classes}
      prefill={prefill}
      initialPart={part?.toUpperCase() ?? null}
      initialSubtype={subtype ?? null}
      initialNewBuild={new_build === "1"}
    />
  );
}
