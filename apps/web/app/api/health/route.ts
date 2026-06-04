export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "web",
    commit: process.env.RENDER_GIT_COMMIT ?? "dev",
    time: new Date().toISOString(),
  });
}
