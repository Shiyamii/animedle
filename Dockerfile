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

CMD ["bun", "run", "dev:with-insert"]