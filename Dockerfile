FROM node:22-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY --chown=node:node . .

RUN chown node:node /app \
    && mkdir -p /app/.next \
    && chown node:node /app/.next

USER node

RUN npm run db:generate

EXPOSE 3000

CMD ["sh", "-c", "npm run db:generate && exec npm run dev -- --hostname 0.0.0.0"]
