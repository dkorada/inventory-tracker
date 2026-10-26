import { createApp } from './app.js';

// Load server/.env when present (Node >= 20.12). Prisma reads DATABASE_URL itself.
try {
  process.loadEnvFile();
} catch {
  // No .env file: fall back to the real environment.
}

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, () => {
  console.log(`StockPilot API listening on http://localhost:${port}`);
});
