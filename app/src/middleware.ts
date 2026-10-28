import { NextResponse, type NextRequest } from "next/server";

// First visit to /survey gets an httpOnly respondent id, so a resubmit edits the same response (SPEC §1.2).
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("rid")) {
    res.cookies.set("rid", crypto.randomUUID(), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/",
    });
  }
  return res;
}

export const config = { matcher: ["/survey"] };
