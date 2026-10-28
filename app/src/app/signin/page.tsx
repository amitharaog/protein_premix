import type { Metadata } from "next";
import { googleConfigured, signIn } from "@/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-bold">Research app</h1>
      <p className="mt-2 text-muted">Owner only.</p>
      {error && <p className="mt-4 rounded-xl bg-accent-soft p-3 text-sm">That account is not on the admin list.</p>}
      {googleConfigured ? (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/admin" });
          }}
        >
          <button className="mt-6 h-12 w-full rounded-full bg-accent font-semibold text-accent-fg">Sign in with Google</button>
        </form>
      ) : (
        <p className="mt-6 rounded-xl border border-line bg-panel p-4 text-sm">
          Google sign-in is not set up yet. Add <code>AUTH_GOOGLE_ID</code> and <code>AUTH_GOOGLE_SECRET</code> (START_HERE.md step 3).
        </p>
      )}
    </main>
  );
}
