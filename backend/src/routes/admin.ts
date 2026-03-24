import { Hono } from "hono";
import { AnimeService } from "@/services/AnimeService";
import { adminMiddleware } from "@/lib/adminMiddleware";

const router = new Hono({ strict: false });
const animeService = AnimeService.getInstance();

router.use('/admin/*', adminMiddleware);

router.get("/admin/animes", async (c) => {
    const animes = await animeService.getAdminAnimeList();
    return c.json(animes);
});

router.get("/admin/animes/current", async (c) => {
    const current = await animeService.getCurrentAnimeAdmin();
    return c.json(current);
});

router.post("/admin/animes/current/random", async (c) => {
    const anime = await animeService.setCurrentAnimeRandom();
    return c.json(anime);
});

router.post("/admin/animes/current/:id", async (c) => {
    const id = c.req.param("id");
    const anime = await animeService.setCurrentAnimeById(id);
    if (!anime) return c.json({ error: "Anime non trouvé" }, 404);
    return c.json(anime);
});

router.post("/admin/animes", async (c) => {
    const body = await c.req.json();
    try {
        const anime = await animeService.createAnime(body);
        return c.json(anime, 201);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        return c.json({ error: message }, 400);
    }
});

router.put("/admin/animes/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    try {
        const anime = await animeService.updateAnime(id, body);
        if (!anime) return c.json({ error: "Anime non trouvé" }, 404);
        return c.json(anime);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        return c.json({ error: message }, 400);
    }
});

router.get("/admin/stats", async (c) => {
    const stats = await animeService.getAdminStats();
    return c.json(stats);
});

router.patch("/admin/animes/:id/enabled", async (c) => {
    const id = c.req.param("id");
    const { enabled } = await c.req.json<{ enabled: boolean }>();
    if (typeof enabled !== "boolean") return c.json({ error: "Paramètre 'enabled' requis (booléen)" }, 400);
    const anime = await animeService.toggleAnimeEnabled(id, enabled);
    if (!anime) return c.json({ error: "Anime non trouvé" }, 404);
    return c.json(anime);
});

router.delete("/admin/animes/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await animeService.deleteAnime(id);
    if (!deleted) return c.json({ error: "Anime non trouvé" }, 404);
    return c.json({ success: true });
});

export default router;
