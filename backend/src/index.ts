import { Hono } from 'hono';
import { cors } from 'hono/cors';
import cron from 'node-cron';
import type { AuthType } from '@/lib/auth';
import loadDotenv from '@/lib/dotenv-loader';
import adminRoutes from '@/routes/admin';
import animeRoutes from '@/routes/anime';
import authRoutes from '@/routes/auth';
import { AnimeService } from '@/services/AnimeService';
import { CharacterService } from './services/CharacterService';

// Start WebSocket server for multiplayer

import challengeWsRouter from './routes/challenge-ws';

loadDotenv();

const app = new Hono<{ Variables: AuthType }>({
  strict: false,
});

const animeService = AnimeService.getInstance();
const characterService = CharacterService.getInstance();
cron.schedule(
  '0 0 * * *',
  async () => {
    await animeService.updateGoalAnime();
    await characterService.updateGoalCharacter();
  },
  {
    timezone: 'UTC',
  },
);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.basePath('/api');
app.use(
  '/api/*',
  cors({
    origin: frontendUrl,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);

const routes = [authRoutes, animeRoutes, adminRoutes] as Hono[];

routes.forEach((route: Hono) => {
  app.route('/api/', route);
});




// Route WebSocket challenge
app.route('/', challengeWsRouter);

export default app;

// Démarre le serveur HTTP si ce fichier est le point d'entrée principal
if (import.meta.main) {
  Bun.serve({ fetch: app.fetch, port: 3000 });
  console.log("Backend listening on http://localhost:3000");
}
