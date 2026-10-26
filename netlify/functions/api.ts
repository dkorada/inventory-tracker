/**
 * Netlify Function that serves the whole Express API.
 *
 * Netlify Functions are stateless and their filesystem is read-only except for
 * /tmp. On a cold start we copy the pre-seeded demo database (built during the
 * Netlify build) into /tmp and point Prisma at it. Writes work, but they live
 * only as long as that function instance, so the public demo resets itself.
 * For a persistent production deployment see "Deployment" in the README.
 */
import fs from 'node:fs';
import path from 'node:path';
import serverless from 'serverless-http';

const TMP_DB = '/tmp/stockpilot-demo.db';

function prepareDatabase() {
  if (!fs.existsSync(TMP_DB)) {
    const candidates = [
      path.join(process.cwd(), 'server/prisma/demo.db'),
      path.join(__dirname, 'server/prisma/demo.db'),
      path.join(__dirname, '../../server/prisma/demo.db'),
    ];
    const source = candidates.find((p) => fs.existsSync(p));
    if (!source) throw new Error(`Demo database not found (looked in ${candidates.join(', ')})`);
    fs.copyFileSync(source, TMP_DB);
  }
  process.env.DATABASE_URL = `file:${TMP_DB}`;
  process.env.DEMO_MODE = 'true';
}

let handlerPromise: Promise<serverless.Handler> | undefined;

async function getHandler() {
  prepareDatabase();
  // Import after DATABASE_URL is set so Prisma connects to the /tmp copy.
  const { createApp } = await import('../../server/src/app');
  const app = createApp();
  return serverless(app, {
    // Requests arrive either as /api/* (via the redirect) or as the raw function path.
    request: (req: { url?: string; body?: unknown; headers: Record<string, string | undefined> }) => {
      if (req.url?.startsWith('/.netlify/functions/api')) {
        req.url = '/api' + req.url.slice('/.netlify/functions/api'.length);
      }
      // serverless-http pre-fills req.body with the raw Buffer, which makes
      // express.json() skip parsing, so decode JSON bodies here instead.
      if (Buffer.isBuffer(req.body) && req.headers['content-type']?.includes('application/json')) {
        try {
          req.body = JSON.parse(req.body.toString('utf8') || '{}');
        } catch {
          req.body = undefined;
        }
      }
    },
  });
}

export const handler: serverless.Handler = async (event, context) => {
  handlerPromise ??= getHandler();
  const h = await handlerPromise;
  return h(event, context);
};
