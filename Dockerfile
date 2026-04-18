
FROM oven/bun:latest AS builder
RUN apt-get update && apt-get install -y procps


WORKDIR /app

COPY package.json ./
COPY bun.lock ./
COPY backend ./backend
COPY frontend ./frontend
COPY data_fetcher ./data_fetcher

RUN bun install


FROM oven/bun:latest AS dev
RUN apt-get update && apt-get install -y procps

WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000

CMD ["bun", "run", "dev"]


FROM oven/bun:latest AS build-frontend
RUN apt-get update && apt-get install -y procps

WORKDIR /app

COPY --from=builder /app/frontend  /app/frontend

ARG VITE_API_URL
ARG VITE_BACKEND_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_WS_URL=$VITE_BACKEND_WS_URL

WORKDIR  /app/frontend
RUN bun install


RUN bun run build


FROM nginx:alpine AS prod-frontend

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-frontend /app/frontend/dist /usr/share/nginx/html

EXPOSE 80



FROM oven/bun:latest AS prod-backend
RUN apt-get update && apt-get install -y procps
WORKDIR /app
COPY --from=builder /app/backend ./backend

WORKDIR /app/backend

RUN bun install --production

EXPOSE 3000
CMD ["bun", "run", "start"]
