FROM oven/bun:latest AS builder


WORKDIR /app

COPY package.json ./
COPY bun.lock ./
COPY backend ./backend
COPY frontend ./frontend
COPY data_fetcher ./data_fetcher

RUN bun install

FROM oven/bun:latest AS dev

WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000

CMD ["bun", "run", "dev"]

FROM oven/bun:latest AS build-frontend

WORKDIR /app

COPY --from=builder /app/frontend  /app/frontend

ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

WORKDIR  /app/frontend
RUN bun install
RUN bun run build


FROM nginx:alpine AS prod-frontend

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-frontend /app/frontend/dist /usr/share/nginx/html

EXPOSE 80


FROM oven/bun:latest AS prod-backend
WORKDIR /app
COPY --from=builder /app/backend ./backend

WORKDIR /app/backend

RUN bun install --production

EXPOSE 3000
CMD ["bun", "run", "start"]
