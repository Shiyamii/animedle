import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AuthType } from "@/lib/auth"
import authRoutes from '@/routes/auth';

const app = new Hono<{ Variables: AuthType }>({
  strict: false,
});

app.use("/api/*", cors({
  origin: "http://localhost:5173",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

const routes = [authRoutes] as const;

routes.forEach((route) => {
  app.basePath("/api").route("/", route);
});

console.log(`Server is running on port 3000`);

export default app;