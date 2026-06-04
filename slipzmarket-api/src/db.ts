import { PrismaClient } from './generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

// Initialize the Prisma Client using the Prisma Postgres adapter.
// This matches Prisma 7+ client options and reads the database URL
// from your .env file in the project root.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export default prisma;