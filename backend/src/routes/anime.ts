import { Hono } from "hono";
import { AnimeService } from "@/services/AnimeService";

const router = new Hono({ strict: false });
const animeService = AnimeService.getInstance();

router.get("/animes", async (c) => {
    const animes = await animeService.getAnimeList();
    return c.json(animes);
});



router.get("/animes/guess/:id", async (c) => {
    const id = c.req.param("id");
    const anime = await animeService.guessAnime(id);
    if (!anime) {
        return c.json({ error: "Anime non trouvé" }, 404);
    }
    return c.json(anime);
});

export default router;
