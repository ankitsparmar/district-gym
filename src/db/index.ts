import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dbSchema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __dgPool: Pool | undefined;
}

const pool =
  global.__dgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.__dgPool = pool;
}

export const db = drizzle(pool, { schema: dbSchema });
export const schema = dbSchema;
