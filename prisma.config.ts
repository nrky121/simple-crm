import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * datasource.url is optional for `prisma generate` but required for
 * `prisma migrate` commands. When DIRECT_URL is not set (local dev without
 * .env.local), migration commands will fail with a clear error.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(process.env.DIRECT_URL || process.env.DATABASE_URL
    ? {
        datasource: {
          url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
        },
      }
    : {}),
});
