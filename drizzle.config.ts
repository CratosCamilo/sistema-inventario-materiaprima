import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

const isTurso = !!process.env.TURSO_DATABASE_URL

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: isTurso
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
        url: 'file:local.db',
      },
})
