// Every brand string lives here, so a rename is a one-line change (SPEC header).
// The survey runs under a made-up, playful name: no product name on public pages (founder request, 8 Nov 2026).
// The founder's working product name stays off the site until it is picked and trademark-searched.
export const brand = {
  name: "Ministry of Cravings",
  short: "Cravings", // the big word of the wordmark, for small spaces
  siteTitle: "Ministry of Cravings",
  // The public address (founder's pick, 8 Nov 2026). The old mugcake.vercel.app gave the product away: its public pages
  // now send people here (src/middleware.ts), while its /api and /board keep working for the sheet and the workflow.
  siteUrl: "https://ministryofcravings.vercel.app",
  oldHosts: ["mugcake.vercel.app"],
  description: "The official dessert census. A slightly unserious 3-minute survey about cravings, desserts and protein. No login.",
  instagram: null as string | null,
};
