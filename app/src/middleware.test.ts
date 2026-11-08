import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

const req = (url: string, host: string, cookie?: string) =>
  new NextRequest(url, { headers: { host, ...(cookie ? { cookie } : {}) } });

describe("middleware", () => {
  it("sends the old mugcake address to the new one, keeping the link's tags", () => {
    const res = middleware(req("https://mugcake.vercel.app/survey?utm_source=instagram&ref=ab12cd34", "mugcake.vercel.app"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ministryofcravings.vercel.app/survey?utm_source=instagram&ref=ab12cd34");
  });

  it("serves the new address and hands out a respondent id once", () => {
    const first = middleware(req("https://ministryofcravings.vercel.app/survey", "ministryofcravings.vercel.app"));
    expect(first.status).toBe(200);
    expect(first.headers.get("set-cookie")).toMatch(/^rid=[0-9a-f-]{36};/);
    const again = middleware(req("https://ministryofcravings.vercel.app/survey", "ministryofcravings.vercel.app", "rid=11111111-2222-3333-4444-555555555555"));
    expect(again.headers.get("set-cookie")).toBeNull();
  });
});
