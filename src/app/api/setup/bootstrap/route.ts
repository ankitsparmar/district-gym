import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, schema } from "@/db";
import { seedDemoData } from "@/db/seed-data";

// One-time production setup endpoint: pushes the Drizzle schema (via the
// generated SQL migration in /drizzle) and optionally seeds demo data.
// This sandbox environment can't reach the production database directly
// (its network egress doesn't allow raw connections to Neon), but a
// deployed Vercel function can — so schema push + seed run here, at
// runtime, protected by CRON_SECRET, instead of from a local machine.
//
// Usage (after deploy, with env vars set):
//   curl -X POST https://<domain>/api/setup/bootstrap \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"seed": true}'

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    results.migrate = "ok";
  } catch (err) {
    results.migrate = { error: err instanceof Error ? err.message : String(err) };
    return NextResponse.json(results, { status: 500 });
  }

  let shouldSeed = false;
  try {
    const body = await req.json();
    shouldSeed = !!body?.seed;
  } catch {
    shouldSeed = false;
  }

  if (shouldSeed) {
    try {
      const [existing] = await db.select().from(schema.plans).limit(1);
      if (existing) {
        results.seed = "skipped (plans already exist)";
      } else {
        await seedDemoData();
        results.seed = "ok";
      }
    } catch (err) {
      results.seed = { error: err instanceof Error ? err.message : String(err) };
      return NextResponse.json(results, { status: 500 });
    }
  }

  return NextResponse.json(results);
}
