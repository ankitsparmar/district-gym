import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { RegistrationForm } from "./registration-form";

export default async function RegisterPage() {
  const plans = await db.select().from(schema.plans).where(eq(schema.plans.active, true));

  return (
    <main className="min-h-screen bg-[var(--background)] py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <p className="text-lg font-bold tracking-tight text-[var(--dg-ink)]">
            DISTRICT <span className="text-[var(--dg-accent)]">GYM</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dg-ink)]">Join District Gym</h1>
          <p className="mt-1 text-sm text-[var(--dg-slate)]">
            Fill in your details below. Our team will review and confirm your membership.
          </p>
        </div>
        <RegistrationForm plans={plans} />
      </div>
    </main>
  );
}
