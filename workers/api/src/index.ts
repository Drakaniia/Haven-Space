import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from './env';
import { HttpError, jsonResponse, responseFromError } from './lib/http';
import accountRoutes from './routes/account';
import adminRoutes from './routes/admin';
import aiRoutes from './routes/ai';
import announcementRoutes from './routes/announcements';
import applicationRoutes from './routes/applications';
import authRoutes from './routes/auth';
import boarderRoutes from './routes/boarder';
import landlordRoutes from './routes/landlord';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import paymentsRoutes from './routes/payments';
import propertiesRoutes from './routes/properties';
import roomsRoutes from './routes/rooms';
import systemRoutes from './routes/system';
import { runBillingJob } from './repositories/payments';
import tenancyRoutes from './routes/tenancy';

const app = new Hono<{ Bindings: Env }>();

function configuredCorsOrigins(env: Env, requestOrigin: string): string[] {
  return (env.APP_ORIGIN || env.ALLOWED_ORIGINS || env.APP_BASE_URL || requestOrigin || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

// SECURITY: the trusted-origin families for credentialed CORS. Widening either
// regex widens who may call this API with cookies — do not loosen without review.
const PAGES_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*haven-space\.pages\.dev$/;
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function resolveOrigin(requestOrigin: string, env: Env): string {
  const origins = configuredCorsOrigins(env, requestOrigin);

  if (origins.includes('*')) {
    return requestOrigin || '*';
  }

  if (origins.includes(requestOrigin)) {
    return requestOrigin;
  }

  if (
    requestOrigin &&
    PAGES_ORIGIN.test(requestOrigin) &&
    origins.some(origin => PAGES_ORIGIN.test(origin))
  ) {
    return requestOrigin;
  }

  if (
    env.APP_ENV !== 'production' &&
    requestOrigin &&
    LOCALHOST_ORIGIN.test(requestOrigin) &&
    origins.some(origin => LOCALHOST_ORIGIN.test(origin))
  ) {
    return requestOrigin;
  }

  return origins[0] || requestOrigin;
}

app.use(
  '*',
  cors({
    origin: (origin, c) => resolveOrigin(origin, c.env),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'X-User-ID', 'X-USER-ID'],
    credentials: true,
  })
);

// The `X-User-ID` header and `?user_id=` query parameter let a caller skip the
// bearer token entirely and act as any account (used by the test suite). That is
// only acceptable while developing locally, so they are refused outright in
// every other environment — including the deployed `staging`/`production` workers.
const SIMULATION_ENVS = new Set(['local', 'test', 'development', 'dev']);

app.use('*', async (c, next) => {
  if (!SIMULATION_ENVS.has(c.env.APP_ENV ?? '')) {
    const simulatesUser =
      Boolean(c.req.header('X-User-ID')) || new URL(c.req.url).searchParams.has('user_id');

    if (simulatesUser) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401);
    }
  }

  return next();
});

app.route('/', systemRoutes);
app.route('/', authRoutes);
app.route('/', accountRoutes);
app.route('/', roomsRoutes);
app.route('/', propertiesRoutes);
app.route('/', boarderRoutes);
app.route('/', applicationRoutes);
app.route('/', landlordRoutes);
app.route('/', adminRoutes);
app.route('/', notificationRoutes);
app.route('/', messageRoutes);
app.route('/', tenancyRoutes);
app.route('/', paymentsRoutes);
app.route('/', announcementRoutes);
app.route('/', aiRoutes);

app.notFound(c => {
  return jsonResponse({ error: 'Route not found' }, 404);
});

app.onError((error, c) => {
  if (!(error instanceof HttpError)) {
    console.error(error);
  }

  return responseFromError(error);
});

/**
 * Nightly billing run (spec `payments-feature` §8.2): extends schedules, sends
 * the due-soon and overdue reminders, marks charges overdue, and applies late
 * fees. Every step is idempotent, so a cron retry cannot double-charge.
 *
 * The trigger is declared in `wrangler.jsonc` (`triggers.crons`).
 */
async function handleScheduled(env: Env): Promise<void> {
  if (!env.DB) {
    return;
  }

  const result = await runBillingJob(env.DB);

  console.log('payments billing run', JSON.stringify(result));
}

/**
 * The default export stays the Hono app itself — the test suite drives it with
 * `app.request(...)` — with `scheduled` attached so the same object satisfies
 * the Workers module contract for both `fetch` and `scheduled`.
 */
export default Object.assign(app, {
  scheduled: async (_controller: unknown, env: Env): Promise<void> => {
    await handleScheduled(env);
  },
});
