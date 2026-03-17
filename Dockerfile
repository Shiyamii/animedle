FROM oven/bun:1.0.25

WORKDIR /app

COPY package.json ./
COPY bun.lock ./
COPY backend ./backend
COPY frontend ./frontend
COPY data_fetcher ./data_fetcher

RUN bun install

EXPOSE 3000

CMD ["bun", "run", "dev"]