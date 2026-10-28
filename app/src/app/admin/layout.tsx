import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, signOut } from "@/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  if (!session) redirect("/signin");
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-line bg-panel px-4 py-3">
        <Link href="/admin" className="font-display text-lg font-semibold">Research</Link>
        <nav className="flex gap-3 text-sm text-muted">
          <Link href="/admin">Survey</Link>
        </nav>
        <div className="flex-1" />
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
          <button className="text-sm text-muted">Sign out</button>
        </form>
      </header>
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </div>
  );
}
