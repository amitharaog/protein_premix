import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const isAdminEmail = (email: string | null | undefined) => Boolean(email && adminEmails().includes(email.toLowerCase()));

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }),
  providers: googleConfigured ? [Google] : [],
  session: { strategy: "database" },
  trustHost: true, // Vercel sets the host header; also needed for `pnpm start` locally and in CI
  pages: { signIn: "/signin" },
  callbacks: {
    // Only allowlisted emails may create a session at all.
    signIn: ({ user }) => isAdminEmail(user.email),
  },
});

/** Server-side gate for every admin page and server action (CLAUDE.md rule 10). */
export async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return null;
  return session;
}
