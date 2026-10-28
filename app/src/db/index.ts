import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

/** Local Postgres (tests, CI) uses node-postgres; Neon uses its HTTP driver. Same query API. */
export const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

export const db = isLocalDb
  ? (drizzlePg(new Pool({ connectionString: url }), { schema }) as unknown as ReturnType<typeof drizzleNeon<typeof schema>>)
  : drizzleNeon(neon(url), { schema });
