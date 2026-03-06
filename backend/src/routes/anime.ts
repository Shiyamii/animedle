import { Hono } from "hono";
import { AnimeService } from "@/services/AnimeService";

const router = new Hono({ strict: false });
const animeService = new AnimeService();

router.get("/animes", async (c) => {
    const animes = await animeService.getAnimeList();
    return c.json(animes);
});

router.get("/animes/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
        return c.json({ error: "ID invalide" }, 400);
    }
    const anime = await animeService.getAnimeById(id);
    if (!anime) {
        return c.json({ error: "Anime non trouvé" }, 404);
    }
    return c.json(anime);
});

export default router;
