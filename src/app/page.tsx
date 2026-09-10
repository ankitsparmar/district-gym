import Link from "next/link";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/business";

export default async function LandingPage() {
  const plans = await db.select().from(schema.plans).where(eq(schema.plans.active, true));

  return (
    <main className="flex-1 bg-[var(--dg-ink)] text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <p className="text-lg font-bold tracking-tight">
          DISTRICT <span className="text-[var(--dg-accent)]">GYM</span>
        </p>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/70 hover:text-white">
            Staff login
          </Link>
          <Link href="/member-login" className="text-sm text-white/70 hover:text-white">
            Member login
          </Link>
          <Button href="/register" size="sm">
            Join now
          </Button>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-20">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
          Train hard. <span className="text-[var(--dg-accent)]">Belong here.</span>
        </h1>
        <p className="mt-5 max-w-xl text-white/70">
          District Gym is your neighbourhood strength &amp; conditioning club. Flexible
          memberships, expert trainers, and a front desk that actually knows your name.
        </p>
        <div className="mt-8 flex gap-3">
          <Button href="/register" size="md">
            Become a member
          </Button>
          <Button href="#plans" variant="outline" size="md" className="border-white/30 bg-transparent text-white hover:bg-white/10">
            View plans
          </Button>
        </div>
      </section>

      <section id="plans" className="border-t border-white/10 bg-white py-16 text-[var(--dg-ink)]">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold">Membership plans</h2>
          <p className="mt-1 text-sm text-[var(--dg-slate)]">
            Choose the plan that fits your training schedule.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.length === 0 && (
              <p className="text-sm text-[var(--dg-slate)]">
                Plans will appear here once the admin team sets them up.
              </p>
            )}
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-[var(--dg-line)] p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--dg-accent)]">
                  {plan.type.replace("_", " ")}
                </p>
                <p className="mt-2 text-lg font-semibold">{plan.name}</p>
                <p className="mt-3 text-2xl font-bold">
                  {formatMoney(plan.price)}
                  <span className="text-sm font-normal text-[var(--dg-slate)]">
                    {plan.type === "PAY_PER_VISIT" ? " / visit" : ` / ${plan.billingIntervalMonths}mo`}
                  </span>
                </p>
                {plan.description && (
                  <p className="mt-3 text-sm text-[var(--dg-slate)]">{plan.description}</p>
                )}
                <Button href="/register" size="sm" className="mt-5 w-full justify-center">
                  Choose plan
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/40">
        © {new Date().getFullYear()} District Gym. All rights reserved.
      </footer>
    </main>
  );
}
