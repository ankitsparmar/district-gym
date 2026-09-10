import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { initials } from "@/lib/utils";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !role || role === "MEMBER") {
    redirect("/login");
  }

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar role={role!} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--dg-line)] bg-white px-6 py-3">
          <p className="text-sm font-medium text-[var(--dg-ink)] md:hidden">District Gym</p>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--dg-ink)]">{session.user?.name}</p>
              <p className="text-xs text-[var(--dg-slate)]">{role?.replace("_", " ")}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dg-accent)] text-xs font-semibold text-white">
              {initials(session.user?.name ?? "?")}
            </div>
            <form action={logout}>
              <button className="text-xs font-medium text-[var(--dg-slate)] hover:text-[var(--dg-ink)]" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
