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

export default router;
