import type { Metadata } from "next";
import "./globals.css";

// The whole app reads from Postgres per-request (session-aware pages, live
// membership/finance data) and there's no production DB reachable at build
// time, so nothing here should be statically prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "District Gym",
  description: "Membership, financial, and member management for District Gym",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
