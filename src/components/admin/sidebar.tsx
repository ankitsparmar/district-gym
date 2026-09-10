"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", roles: ["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER"] },
  { href: "/admin/registrations", label: "Registrations", roles: ["ADMIN", "MANAGER", "FRONT_DESK"] },
  { href: "/admin/members", label: "Members", roles: ["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER"] },
  { href: "/admin/attendance", label: "Attendance", roles: ["ADMIN", "MANAGER", "FRONT_DESK"] },
  { href: "/admin/classes", label: "Classes & PT", roles: ["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER"] },
  { href: "/admin/trainers", label: "Trainers", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/plans", label: "Plans", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/finance", label: "Finance", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/expenses", label: "Expenses", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/staff", label: "Staff", roles: ["ADMIN"] },
  { href: "/admin/audit-log", label: "Audit log", roles: ["ADMIN", "MANAGER"] },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--dg-line)] bg-[var(--dg-ink)] px-4 py-6 md:flex">
      <p className="px-2 text-base font-bold tracking-tight text-white">
        DISTRICT <span className="text-[var(--dg-accent)]">GYM</span>
      </p>
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white",
                active && "bg-[var(--dg-accent)]/15 text-[var(--dg-accent)]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
