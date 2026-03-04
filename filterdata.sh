#!/bin/bash

# Récupérer les données JSON depuis l'API Jikan
curl "https://api.jikan.moe/v4/anime?order_by=scored_by&limit=1&sort=desc" -H "accept: application/json" > data.json

# Filtrer les champs 
jq '{
  images_webp: .data[0].images.webp,
  genres: [.data[0].genres[].name],
  titles: .data[0].titles,
  demographic: (.data[0].demographics[0].name // null),
  episodes: .data[0].episodes,
  season_start: (.data[0].aired.from // null),
  studio: (.data[0].studios[0].name // null),
  source: .data[0].source,
  score: .data[0].score
}' data.json > filtered_data.json

echo "Filtrage terminé. Résultat dans filtered_data.json."
