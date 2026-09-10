import { Card, Button } from "@/components/ui/primitives";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--dg-ink)] px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <p className="text-lg font-bold tracking-tight text-[var(--dg-ink)]">
          DISTRICT <span className="text-[var(--dg-accent)]">GYM</span>
        </p>
        <h1 className="mt-4 text-xl font-semibold text-[var(--dg-ink)]">Application received</h1>
        {code && (
          <p className="mt-2 text-sm text-[var(--dg-slate)]">
            Your member code is <span className="font-semibold text-[var(--dg-ink)]">{code}</span>
          </p>
        )}
        <p className="mt-3 text-sm text-[var(--dg-slate)]">
          Our team will review your application and confirm your membership by email/SMS shortly.
        </p>
        <Button href="/" variant="outline" className="mt-6">
          Back to home
        </Button>
      </Card>
    </main>
  );
}
