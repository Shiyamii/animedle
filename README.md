# Animedle

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

### Autres bibliothèques et outils
- **Fuse.js** : Bibliothèque de recherche floue pour JavaScript.
- **framer-motion** : Bibliothèque d'animations pour React.
- **lucide-react** : Collection d'icônes pour React.
- **canvas-confetti** : Bibliothèque pour créer des confettis animés dans le navigateur.

## Data fetcher

This is a separate package responsible for fetching and filtering data from the Jikan API and storing it in a MongoDB database. It is designed to run independently of the main application, allowing for efficient data management and updates.

### Configuration
Base yourself on the provided `.env.example` file to create a `.env.local` file in the `data_fetcher` directory. This file should contain the necessary environment variables for connecting to the MongoDB database, such as `MONGO_URI`.

### Data fetching and filtering

The data fetcher retrieves anime data from the Jikan API, which provides comprehensive information about anime series. The fetched data is then filtered to include only relevant information such as titles, genres, ratings, and other metadata that are essential for the application's functionality.

To fetch the data, use :
```bash
npm run start
```
or
```bash
bun run start
```

### MongoDB integration
The filtered data is stored in a MongoDB database, which allows for efficient querying and management of the anime data. The data fetcher includes functionality to connect to the MongoDB database, insert the filtered data, and manage the database connection.

```bash
npm run start:insert
```
or
```bash
bun run start:insert
```
