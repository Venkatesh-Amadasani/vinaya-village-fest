import postgres from "postgres";

const connectionString =
  process.env["DATABASE_URL"] ||
  "postgresql://postgres.wlremrcuvexorkcajgnu:Venkey%4011441u@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";

declare global {
  var __db: postgres.Sql | undefined;
}

export const sql = global.__db || (global.__db = postgres(connectionString, { ssl: "require", max: 5 }));
