import { Hono } from "hono";
import { AnimeService } from "@/services/AnimeService";

const router = new Hono({ strict: false });
const animeService = AnimeService.getInstance();

router.get("/animes", async (c) => {
    const animes = await animeService.getAnimeList();
    return c.json(animes);
});



router.post("/animes/guess/:id", async (c) => {
    const id = c.req.param("id");
    const guessNumber = parseInt(c.req.query("guessNumber") || "1", 10);
     if (isNaN(guessNumber) || guessNumber < 1) {
        return c.json({ error: "Invalid guess number" }, 400);
    }
    const anime = await animeService.guessAnime(id, guessNumber);
    if (!anime) {
        return c.json({ error: "Anime non trouvé" }, 404);
    }
    return c.json(anime);
});

router.get("/animes/stats", async (c) => {
    const idsParam = c.req.query("ids");
    if (!idsParam) {
        return c.json({ error: "Paramètre 'ids' requis" }, 400);
    }
    const ids = idsParam.split(",").map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) {
        return c.json({ error: "Aucun identifiant fourni" }, 400);
    }
    const stats = await animeService.getAnimeStats(ids);
    return c.json(stats);
});

export default router;
