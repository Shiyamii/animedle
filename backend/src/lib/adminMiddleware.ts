import { auth } from '@/lib/auth';
import { Context, Next } from 'hono';

export async function adminMiddleware(c: Context, next: Next) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: 'Non authentifié' }, 401);

    const role = (session.user as unknown as { role?: string }).role;
    if (role !== 'admin') return c.json({ error: 'Accès interdit' }, 403);

    await next();
}
