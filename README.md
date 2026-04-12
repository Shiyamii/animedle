# Animedle

## URL de l'application
Déployé sur le serveur de Tamas [Animedle](https://animedle.apps.shiyamii.com/).

## Description

**Animedle** est un jeu web dans l’esprit des *daily games* (type Wordle) : vous devez identifier des animes à partir d’indices et de comparaisons avec vos propositions. Les titres proviennent d’une base de données alimentée via l’API [Jikan](https://jikan.moe/) (MyAnimeList). L’accueil propose un menu pour choisir le mode ; certains modes nécessitent un compte (Challenge).

### Daily Guessing

Un **anime mystère par jour**, commun à tous les joueurs. Vous proposez des titres ; chaque essai est comparé à la cible (studio, genres, saison, etc.) pour vous rapprocher de la bonne réponse. La partie est liée au calendrier : un nouvel anime est disponible chaque jour.

### Endless

**Enchaînement sans limite** : à chaque fois, un anime est tiré au hasard dans la base. Une fois trouvé, vous enchaînez avec un nouvel anime. Le mode suit une **série** (streak actuelle et meilleure série) pour mesurer votre régularité.

### Personnage

Vous devez deviner **de quel anime provient le personnage du jour**. Une image du personnage (souvent floutée au départ) et des **indices** se débloquent au fil des essais (palier par palier). Vous proposez des animes comme dans les autres modes ; le but est d’identifier la série source du personnage.

### Personnage (endless)

Même principe que **Personnage**, mais avec un **nouveau personnage** à chaque manche, sans contrainte journalière : idéal pour s’entraîner en continu ou enchaîner les parties.

### Challenge

Mode **multijoueur en temps réel** : création ou rejoindre une salle (code ou lien), plusieurs joueurs, **plusieurs animes à deviner** dans la partie. Les tentatives et les trouvailles des adversaires sont visibles en direct (WebSocket). **Connexion obligatoire** pour accéder à ce mode.

## Technologies utilisées

| Technologie | Rôle | URL |
| --- | --- | --- |
| Bun | Gestionnaire de paquets et exécuteur de scripts | [https://bun.sh/](https://bun.sh/) |
| React (avec react-drouter et react-i18next) | Bibliothèque front-end | [https://react.dev/](https://react.dev/) |
| Vite | Outil de build pour le front-end | [https://vitejs.dev/](https://vitejs.dev/) |
| ShadeCN | UI library pour React (avec Tailwindcss et RadixUI) | [https://shadcn.com/](https://shadcn.com/) |
| TweakCN | Theme builder pour ShadeCN | [https://tweakcn.com/](https://tweakcn.com/) |
| Zustand | State management pour React | [https://zustand-demo.pmnd.rs/](https://zustand-demo.pmnd.rs/) |
| Hono | Framework back-end | [https://hono.dev/](https://hono.dev/) |
| BetterAuth | Système d'authentification | [https://betterauth.dev/](https://betterauth.dev/) |
| Mongoose | ODM pour MongoDB | [https://mongoosejs.com/](https://mongoosejs.com/) |
| node-cron | Planification de tâches pour Node.js | [https://www.npmjs.com/package/node-cron](https://www.npmjs.com/package/node-cron) |
| biome | Outil de formatage et de linting pour JavaScript et TypeScript | [https://biomejs.dev/](https://biomejs.dev/) |
| Husky | Outil de gestion de hooks Git pour automatiser les tâches de développement (lint avec biome) | [https://typicode.github.io/husky/](https://typicode.github.io/husky/) |

### Autres bibliothèques et outils
- **Fuse.js** : Bibliothèque de recherche floue pour JavaScript.
- **framer-motion** : Bibliothèque d'animations pour React.
- **lucide-react** : Collection d'icônes pour React.
- **canvas-confetti** : Bibliothèque pour créer des confettis animés dans le navigateur.
- **concurrently** : Outil pour exécuter plusieurs commandes en parallèle dans le terminal.



## Prérequis 
- Node.js (version 18 ou supérieure recommandée)
- Bun (vous pouvez l'installer depuis [https://bun.sh/](https://bun.sh/))

### Bun
Bun est un gestionnaire de paquets et un exécuteur de scripts rapide et moderne pour JavaScript et TypeScript. Il offre des performances améliorées par rapport à d'autres gestionnaires de paquets, ce qui en fait un excellent choix pour ce projet. Assurez-vous d'avoir Bun installé sur votre machine pour pouvoir exécuter les scripts et gérer les dépendances du projet.

Attention : Bun est nécessaire pour exécuter ce projet, il gère nottament les websockets dans le backend. Le projet ne fonctionnera pas correctement avec d'autres gestionnaires de paquets comme npm ou yarn.




## Récupérateur de données

Il s'agit d'un package distinct chargé de récupérer et de filtrer les données depuis l'API Jikan, puis de les stocker dans une base de données MongoDB. Il est conçu pour s'exécuter indépendamment de l'application principale, ce qui permet une gestion efficace des données et des mises à jour.

### Configuration
Appuyez-vous sur le fichier `.env.example` fourni pour créer un fichier `.env` local dans le dossier `data_fetcher`. Ce fichier doit contenir les variables d'environnement nécessaires pour se connecter à la base de données MongoDB, comme `MONGO_URI`.

### Récupération et filtrage des données

Le récupérateur de données extrait les informations d'anime depuis l'API Jikan, qui fournit des données complètes sur les séries d'animation. Les données récupérées sont ensuite filtrées afin de ne conserver que les informations pertinentes, comme les titres, les genres, les notes et d'autres métadonnées essentielles au fonctionnement de l'application.

Pour récupérer les données, utilisez :
```bash
bun run start
```

### Intégration MongoDB
Les données filtrées sont stockées dans une base de données MongoDB, ce qui permet une interrogation et une gestion efficaces des données d'anime. Le récupérateur de données inclut les fonctionnalités nécessaires pour se connecter à MongoDB, insérer les données filtrées et gérer la connexion à la base.

```bash
bun run start:insert
```
