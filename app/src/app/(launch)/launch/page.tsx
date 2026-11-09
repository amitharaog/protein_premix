import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { product } from "@/config/product";
import { launch } from "@/content/launch";
import { keyMatches } from "@/lib/secret";
import { LaunchStory } from "./story";

// The customer launch page (founder request, 9 Nov 2026): tear, pour, microwave, voilà, then the waitlist.
// It shows the product, so it is the waitlist-page exception in the root CLAUDE.md disclosure rules: until the founder
// approves it line by line it opens only with the board key (/launch?key=…), with the waitlist form switched off.
// FEATURE_LAUNCH_PAGE=true makes it public and switches the form on. Note: once public, the survey is no longer blind
// for anyone who sees this page (CLAUDE.md rule 5).

export const dynamic = "force-dynamic";

const isLive = () => process.env.FEATURE_LAUNCH_PAGE === "true";

type Props = { searchParams: Promise<{ key?: string | string[] }> };
const allowed = async ({ searchParams }: Props) => {
  const { key } = await searchParams;
  return isLive() || keyMatches(typeof key === "string" ? key : undefined, process.env.BOARD_KEY);
};

// Without the key the page is a plain 404, and its title and description stay generic too, so nothing about the
// product shows up in the 404 either.
export async function generateMetadata(props: Props): Promise<Metadata> {
  if (!(await allowed(props))) return { robots: { index: false, follow: false } };
  return {
    title: { absolute: `${product.name} · Tear, pour, ding` },
    description: "A protein-based dessert you make in your own mug. Join the waitlist.",
    robots: isLive() ? undefined : { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function LaunchPage(props: Props) {
  if (!(await allowed(props))) notFound();
  return <LaunchStory copy={launch} brand={product.name} live={isLive()} year={new Date().getFullYear()} />;
}
