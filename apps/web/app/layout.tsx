import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Assembly",
  description: "Connecting residents and council staff.",
  applicationName: "Assembly",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0b3d2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
