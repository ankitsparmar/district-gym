import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Button, Card, Input } from "@/components/ui/primitives";
import Link from "next/link";

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const callbackUrl = String(formData.get("callbackUrl") ?? "/portal");
    try {
      await signIn("credentials", {
        email,
        password,
        portal: "member",
        redirectTo: callbackUrl,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/member-login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
      throw err;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--dg-ink)] px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <p className="text-lg font-bold tracking-tight text-[var(--dg-ink)]">
            DISTRICT <span className="text-[var(--dg-accent)]">GYM</span>
          </p>
          <p className="mt-1 text-xs text-[var(--dg-slate)]">Member portal sign in</p>
        </div>
        {sp.error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-inset ring-red-600/20">
            Invalid email or password.
          </p>
        )}
        <form action={login} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={sp.callbackUrl ?? "/portal"} />
          <Input label="Email" name="email" type="email" required placeholder="you@example.com" />
          <Input label="Password" name="password" type="password" required placeholder="••••••••" />
          <Button type="submit" className="w-full justify-center">
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-[var(--dg-slate)]">
          Not registered yet?{" "}
          <Link href="/register" className="font-medium text-[var(--dg-accent)]">
            Join District Gym
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-[var(--dg-slate)]">
          Staff member?{" "}
          <Link href="/login" className="font-medium text-[var(--dg-accent)]">
            Staff sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
