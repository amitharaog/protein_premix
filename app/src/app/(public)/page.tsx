import Link from "next/link";
import { MugProgress } from "./survey/mug-progress";

// Holding page. The full landing page (SPEC §1.1) describes the product, so it waits until the founder
// approves launch copy line by line (repo CLAUDE.md, "Disclosure rules"). Until then: send people to the survey.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <MugProgress fraction={0.6} done />
      <h1 className="mt-6 font-display text-4xl leading-tight font-bold">Something warm is baking.</h1>
      <p className="mt-3 text-muted">Before we decide what goes in the mug, we need your very serious opinions on dessert.</p>
      <Link href="/survey" className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-fg shadow-md">
        Take the 2-minute survey 🥄
      </Link>
      <p className="mt-3 text-xs text-muted">No login. No spam. Just a nosy mug.</p>
    </main>
  );
}
