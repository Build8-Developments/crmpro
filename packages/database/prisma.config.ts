// Prisma configuration for the @crmpro/database package.
// DATABASE_URL is injected by the package scripts via dotenv-cli, pointing at
// the single source of truth: apps/api/.env (see package.json scripts).
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
