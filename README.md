# Animedle

## Table des matières

- [URL de l'application](#url-de-lapplication)
- [Équipe](#équipe)
- [Description](#description)
  - [Daily Guessing](#daily-guessing)
  - [Endless](#endless)
  - [Personnage](#personnage)
  - [Personnage (endless)](#personnage-endless)
  - [Challenge](#challenge)
- [Technologies utilisées](#technologies-utilisées)
  - [Autres bibliothèques et outils](#autres-bibliothèques-et-outils)
- [Prérequis](#prérequis)
  - [Bun](#bun)
- [Comment démarrer le projet](#comment-démarrer-le-projet)
  - [Base de données avec le Docker Compose classique](#base-de-données-avec-le-docker-compose-classique)
  - [Stack de développement avec Docker Compose (dev)](#stack-de-développement-avec-docker-compose-dev)
- [Backend](#backend)
- [Frontend](#frontend)
- [Récupérateur de données](#récupérateur-de-données)
  - [Configuration](#configuration)
  - [Récupération et filtrage des données](#récupération-et-filtrage-des-données)
  - [Intégration MongoDB](#intégration-mongodb)
-[Notre utilisation de l'IA](#notre-utilisation-de-lai)

## URL de l'application

Déployé sur le serveur de Tamas [Animedle](https://animedle.apps.shiyamii.com/).
Pour les utilisateurs normals, créez une compte.

### Utilisateur admin

| Email | Mot de passe |
| --- | --- |
| admin@admin.com | 12345Admin! |

## Équipe

Répartition des tâches, pour plus de détails voir [TASKS.md](./TASKS.md).

| Prénom | Nom | Utilisateur GitHub | Tâches réalisées                                                                                                                                                                                                                                                                                                      |
| --- | --- | --- |-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Samy | Ben Dhiab | [samsoucoupe](https://github.com/samsoucoupe) | Système de scraping (fetch des données) ; mise en place du WebSocket et intégration frontend ; mise en place du Challenge et intégration frontend                                                                                                                                                                     |
| Tamas | Palotas | [Shiyamii](https://github.com/Shiyamii) | Vérification et nettoyage des données ; complétion des données ; adaptation du format des données pour l’insertion ; Anime Guessing (système, cron de l’anime du jour, mode endless) ; Character Guessing (système, cron du personnage du jour, mode endless) ; déploiement (dockerisation, configuration du serveur) |
| Titouan | Lacombe--Fabre | [Tit0u4N](https://github.com/Tit0u4N) | Mise en place de l'architecture générale (backend et frontend) ; authentification ; espace administrateur (CRUD animes et personnages, gestion anime du jour, visualisation des stats) ; statistiques (mode daily, visualisation admin) ; refonte visuelle (charte graphique, i18n, responsive) ; tests unitairesa    |

---

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

---

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

---

## Prérequis

- Node.js (version 18 ou supérieure recommandée)
- Bun (vous pouvez l'installer depuis [https://bun.sh/](https://bun.sh/))
- Docker et Docker Compose (pour MongoDB avec `docker-compose.yml` ou la stack de dev avec `docker-compose.dev.yml`)

### Bun

Bun est un gestionnaire de paquets et un exécuteur de scripts rapide et moderne pour JavaScript et TypeScript. Il offre des performances améliorées par rapport à d'autres gestionnaires de paquets, ce qui en fait un excellent choix pour ce projet. Assurez-vous d'avoir Bun installé sur votre machine pour pouvoir exécuter les scripts et gérer les dépendances du projet.

Attention : Bun est nécessaire pour exécuter ce projet, il gère nottament les websockets dans le backend. Le projet ne fonctionnera pas correctement avec d'autres gestionnaires de paquets comme npm ou yarn.

## Comment démarrer le projet

Deux approches courantes : ne lancer que la base avec le **Docker Compose classique** (`docker-compose.yml`), puis l’application en local avec Bun ; ou lancer toute la stack de développement avec **`docker-compose.dev.yml`**.

### Base de données avec le Docker Compose classique

Le fichier [`docker-compose.yml`](./docker-compose.yml) démarre **MongoDB** (port `27017`, utilisateur `admin` / mot de passe `adminpassword`, base `animedle`) et le service **`db-seeder`**, qui exécute une insertion initiale dans la base après le démarrage de Mongo.

À la racine du dépôt :

```bash
docker compose up -d
```

Pour ne démarrer **que** MongoDB (sans relancer le seeder), vous pouvez cibler le service :

```bash
docker compose up -d mongo
```

Ensuite, sur la machine hôte : installer les dépendances et lancer le front et le back :

```bash
bun install
```

Configurez les variables d'environnement dans le fichier `.env` local dans le dossier `backend` et `frontend` en prennant exemple sur le fichier `.env.example`. Adaptez les URL si vous changez les ports ou utilisez un hôte différent.

Et pour finir lancer le projet :

```bash
bun run dev
```

### Stack de développement avec Docker Compose (dev)

Le fichier [`docker-compose.dev.yml`](./docker-compose.dev.yml) **inclut** le `docker-compose.yml` (MongoDB + seeder) et ajoute un conteneur **`app-dev`** qui exécute `bun run dev` (front Vite, back Hono et WebSocket). Les variables d’environnement nécessaires sont déjà renseignées dans ce fichier pour parler à Mongo et entre services.

À la racine du dépôt :

```bash
docker compose -f docker-compose.dev.yml up --build
```

Les ports exposés côté hôte sont notamment **5173** (Vite), **3000** (API) et **3001** (WebSocket), en plus de **27017** pour MongoDB.

Pour arrêter les conteneurs, selon le fichier utilisé :

```bash
docker compose down
```

ou :

```bash
docker compose -f docker-compose.dev.yml down
```

---

## Backend

L’API et la logique métier sont dans [`backend/`](./backend/), exécutées avec **Bun** et **TypeScript**. Le cœur HTTP est une application **Hono** exportée depuis [`backend/src/index.ts`](./backend/src/index.ts), servie par Bun ; les routes REST sont préfixées par **`/api`** et incluent notamment **l’authentification** ([`routes/auth.ts`](./backend/src/routes/auth.ts)), **les animes et personnages** (devinettes, endless, indices, stats — [`routes/anime.ts`](./backend/src/routes/anime.ts)), **l’administration** ([`routes/admin.ts`](./backend/src/routes/admin.ts)) et **les salles multijoueur** ([`routes/room.ts`](./backend/src/routes/room.ts), [`routes/room-guess.ts`](./backend/src/routes/room-guess.ts)).

Les données sont lues et écrites dans **MongoDB** via le client officiel et **Mongoose** ([`lib/db.ts`](./backend/src/lib/db.ts)). **Better Auth** avec l’adaptateur Mongo assure les sessions et comptes. Des **services** ([`AnimeService`](./backend/src/services/AnimeService.ts), [`CharacterService`](./backend/src/services/CharacterService.ts), [`RoomService`](./backend/src/services/RoomService.ts)) encapsulent la logique et s’appuient sur des dépôts / modèles dédiés.

Un **cron** (`node-cron`), planifié à minuit **UTC**, met à jour l’**anime du jour** et le **personnage du jour**. En parallèle du HTTP, un second **`Bun.serve`** dans [`wsHandlers.ts`](./backend/src/wsHandlers.ts) expose le **WebSocket** du Challenge sur le port **3001**. Le CORS est configuré pour accepter l’origine définie par **`FRONTEND_URL`**. Les tests backend utilisent **Vitest**.

## Frontend

L’application cliente vit dans le dossier [`frontend/`](./frontend/). Elle est construite avec **React** et **Vite**, routée avec **React Router** (`main.tsx` : pages d’accueil, daily / endless, personnage, personnage endless, authentification, compte, challenge, administration).

L’interface repose sur **Tailwind CSS** et des composants **shadcn/ui** (Radix). L’état global passe surtout par **Zustand** (`stores/`, par ex. liste d’animes, partie en cours, utilisateur, challenge). La logique d’écran est regroupée dans des hooks « view model » (`pages/**/use*ViewModel.ts`) et des utilitaires partagés (`viewmodels/guessingViewModel.ts`). La recherche de titres côté client utilise **Fuse.js** (autocomplétion).

**react-i18next** gère les traductions (`i18n/`, fichiers JSON par langue). **Better Auth** côté client (`lib/auth-client.ts`) s’aligne sur les routes d’auth du backend. Le mode **Challenge** ouvre une connexion **WebSocket** vers le serveur temps réel (`lib/ws-client.ts`, port habituel **3001**). Les tests unitaires passent par **Vitest**.

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


---


## Notre utilisation de l'ai

Nous avons utilisé different IAs
- Copilot: pour l'autocomplete intiligient
- Gemini/chatGPT: pour se renseigner, créer de petits bouts de code
- Code Claude: pour generer les tests unitaires