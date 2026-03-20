import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AuthType } from "@/lib/auth"
import authRoutes from '@/routes/auth';
import animeRoutes from '@/routes/anime';
import loadDotenv from "@/lib/dotenv-loader";
import { AnimeService } from "@/services/AnimeService";
import cron from "node-cron";

// Start WebSocket server for multiplayer
import "./ws";

loadDotenv();

const app = new Hono<{ Variables: AuthType }>({
  strict: false,
});

const animeService = AnimeService.getInstance();
cron.schedule('0 0 * * *', async () => {
  console.log('Exécution de updateGoalAnime à 00:00 UTC')
  await animeService.updateGoalAnime()
}, {
  timezone: "UTC"
})

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";


app.basePath("/api");
app.use("/api/*", cors({
  origin: frontendUrl,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

const routes = [authRoutes, animeRoutes] as Hono[];

routes.forEach((route: Hono) => {
  app.route("/api/", route);
});

console.log(`Server is running on port 3000`);

export default app;