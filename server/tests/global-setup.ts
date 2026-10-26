import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Start every run from a brand-new, empty SQLite file. */
export default function setup() {
  const db = fileURLToPath(new URL('../prisma/test.db', import.meta.url));
  rmSync(db, { force: true });
  rmSync(`${db}-journal`, { force: true });
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
