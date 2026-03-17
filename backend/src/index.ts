import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AuthType } from "@/lib/auth"
import authRoutes from '@/routes/auth';
import animeRoutes from '@/routes/anime';
import loadDotenv from "@/lib/dotenv-loader";

loadDotenv();

const app = new Hono<{ Variables: AuthType }>({
  strict: false,
});
app.basePath("/api");
app.use("/api/*", cors({
  origin: "http://localhost:5173",
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