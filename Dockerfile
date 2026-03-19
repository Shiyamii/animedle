FROM oven/bun:latest AS builder


WORKDIR /app

COPY package.json ./
COPY bun.lock ./
COPY backend ./backend
COPY frontend ./frontend
COPY data_fetcher ./data_fetcher

RUN bun install
RUN cd frontend && bun run build

FROM oven/bun:latest AS dev

WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000

CMD ["bun", "run", "dev"]

FROM nginx:alpine AS prod-frontend
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80


FROM oven/bun:latest AS prod-backend
WORKDIR /app
COPY --from=builder /app/backend ./backend

WORKDIR /app/backend

RUN bun install --production

EXPOSE 3000
CMD ["bun", "run", "start"]
