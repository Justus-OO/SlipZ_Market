// prisma.config.ts
import 'dotenv/config'; // Loads your .env file automatically
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'), // Reads from .env
  },
});