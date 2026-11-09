import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
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

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tear, pour, ding",
    description: "A protein-based dessert you make in your own mug. Join the waitlist.",
    robots: isLive() ? undefined : { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ key?: string | string[] }> }) {
  const { key } = await searchParams;
  const live = isLive();
  if (!live && !keyMatches(typeof key === "string" ? key : undefined, process.env.BOARD_KEY)) notFound();
  return <LaunchStory copy={launch} brandName={brand.name} brandShort={brand.short} live={live} year={new Date().getFullYear()} />;
}
