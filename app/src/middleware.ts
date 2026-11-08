import { NextResponse, type NextRequest } from "next/server";
import { brand } from "@/config/brand";

// 1. The old public address (mugcake.vercel.app) gave the product away, so its survey pages send people to the new one,
//    keeping the link's utm tags. Only the public pages move: /api (the Google Sheet feed, the workflow) and /board stay.
// 2. First visit to /survey gets an httpOnly respondent id, so a resubmit edits the same response (SPEC §1.2).
export function middleware(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  if (brand.oldHosts.includes(host)) {
    return NextResponse.redirect(new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, brand.siteUrl), 307);
  }
  const res = NextResponse.next();
  if (!req.cookies.get("rid")) {
    res.cookies.set("rid", crypto.randomUUID(), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/",
    });
  }
  return res;
}

export const config = { matcher: ["/", "/survey"] };
