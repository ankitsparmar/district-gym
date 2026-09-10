import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-[var(--dg-line)] bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--dg-line)] px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--dg-ink)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--dg-slate)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  href,
  type = "button",
  children,
  ...rest
}: {
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
  href?: string;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
  [key: string]: any;
}) {
  const styles = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
    variant === "primary" && "bg-[var(--dg-accent)] text-white hover:bg-[var(--dg-accent-dark)]",
    variant === "secondary" && "bg-[var(--dg-ink)] text-white hover:bg-black",
    variant === "outline" && "border border-[var(--dg-line)] bg-white text-[var(--dg-ink)] hover:bg-gray-50",
    variant === "ghost" && "text-[var(--dg-slate)] hover:bg-gray-100",
    variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
    className
  );
  if (href) {
    return (
      <Link href={href} className={styles} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={styles} {...rest}>
      {children}
    </button>
  );
}

const badgeColors: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  FROZEN: "bg-sky-50 text-sky-700 ring-sky-600/20",
  SUSPENDED: "bg-red-50 text-red-700 ring-red-600/20",
  CANCELLED: "bg-gray-100 text-gray-600 ring-gray-500/20",
  EXPIRED: "bg-gray-100 text-gray-600 ring-gray-500/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  UNPAID: "bg-amber-50 text-amber-700 ring-amber-600/20",
  OVERDUE: "bg-red-50 text-red-700 ring-red-600/20",
  PARTIAL: "bg-amber-50 text-amber-700 ring-amber-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REFUNDED: "bg-purple-50 text-purple-700 ring-purple-600/20",
  FAILED: "bg-red-50 text-red-700 ring-red-600/20",
  SCHEDULED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  NO_SHOW: "bg-gray-100 text-gray-600 ring-gray-500/20",
  BOOKED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  QUEUED: "bg-gray-100 text-gray-600 ring-gray-500/20",
  SENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  UPCOMING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  DUE_TODAY: "bg-orange-50 text-orange-700 ring-orange-600/20",
  OK: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const key = tone ?? String(children);
  const cls = badgeColors[key] ?? "bg-gray-100 text-gray-600 ring-gray-500/20";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
      {children}
    </span>
  );
}

export function Input({ label, className, hint, ...rest }: { label?: string; className?: string; hint?: string; [key: string]: any }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-[var(--dg-ink)]">{label}</span>}
      <input
        className={cn(
          "w-full rounded-lg border border-[var(--dg-line)] bg-white px-3 py-2 text-sm text-[var(--dg-ink)] placeholder:text-gray-400 focus:border-[var(--dg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--dg-accent)]/20",
          className
        )}
        {...rest}
      />
      {hint && <span className="mt-1 block text-xs text-[var(--dg-slate)]">{hint}</span>}
    </label>
  );
}

export function Textarea({ label, className, ...rest }: { label?: string; className?: string; [key: string]: any }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-[var(--dg-ink)]">{label}</span>}
      <textarea
        className={cn(
          "w-full rounded-lg border border-[var(--dg-line)] bg-white px-3 py-2 text-sm text-[var(--dg-ink)] placeholder:text-gray-400 focus:border-[var(--dg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--dg-accent)]/20",
          className
        )}
        {...rest}
      />
    </label>
  );
}

export function Select({ label, className, children, ...rest }: { label?: string; className?: string; children: ReactNode; [key: string]: any }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-[var(--dg-ink)]">{label}</span>}
      <select
        className={cn(
          "w-full rounded-lg border border-[var(--dg-line)] bg-white px-3 py-2 text-sm text-[var(--dg-ink)] focus:border-[var(--dg-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--dg-accent)]/20",
          className
        )}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

export function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" | "neutral" }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--dg-slate)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--dg-ink)]">{value}</p>
      {sub && (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "up" && "text-emerald-600",
            tone === "down" && "text-red-600",
            (!tone || tone === "neutral") && "text-[var(--dg-slate)]"
          )}
        >
          {sub}
        </p>
      )}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-sm font-medium text-[var(--dg-ink)]">{title}</p>
      {description && <p className="max-w-sm text-xs text-[var(--dg-slate)]">{description}</p>}
      {action}
    </div>
  );
}
