import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'prisma/config';

// Load .env file manually since Prisma 7 config runs before env loading
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, '.env');
  const envLocalPath = path.join(__dirname, '.env.local');
  const vars: Record<string, string> = {};

  for (const filePath of [envPath, envLocalPath]) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        vars[key] = value;
      }
    }
  }
  return vars;
}

const envVars = loadEnv();

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: envVars['DIRECT_URL'] || process.env.DIRECT_URL!,
  },
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
});
