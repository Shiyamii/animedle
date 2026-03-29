import type { Context, Next } from 'hono';
import { auth } from '@/lib/auth';

export async function adminMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Non authentifié' }, 401);
  }

  if ((session.user as unknown as { role?: string }).role !== 'admin') {
    return c.json({ error: 'Accès interdit' }, 403);
  }
  await next();
}
