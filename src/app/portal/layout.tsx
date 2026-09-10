import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/payments", label: "Payments" },
  { href: "/portal/classes", label: "Classes" },
  { href: "/portal/profile", label: "Profile" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || role !== "MEMBER") redirect("/member-login");

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/member-login" });
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--dg-line)] bg-[var(--dg-ink)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <p className="text-base font-bold tracking-tight text-white">
            DISTRICT <span className="text-[var(--dg-accent)]">GYM</span>
          </p>
          <nav className="flex items-center gap-4">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-white/70 hover:text-white">
                {item.label}
              </Link>
            ))}
            <form action={logout}>
              <button className="text-sm text-white/50 hover:text-white" type="submit">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
