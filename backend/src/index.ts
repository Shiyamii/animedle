import { Hono } from 'hono';
import { cors } from 'hono/cors';
import cron from 'node-cron';
import type { AuthType } from '@/lib/auth';
import loadDotenv from '@/lib/dotenv-loader';
import adminRoutes from '@/routes/admin';
import animeRoutes from '@/routes/anime';
import authRoutes from '@/routes/auth';
import roomRoutes from '@/routes/room';
import roomGuessRoutes from '@/routes/room-guess';
import { AnimeService } from '@/services/AnimeService';
import { CharacterService } from './services/CharacterService';

import './wsHandlers';

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

const frontendUrl = process.env.FRONTEND_URL || '*';

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

const routes = [authRoutes, animeRoutes, adminRoutes, roomRoutes, roomGuessRoutes] as Hono[];
routes.forEach((route: Hono) => {
  app.route('/api/', route);
});

export default app;
