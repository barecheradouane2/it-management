
FROM node:24-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Used for Prisma generation/build only, not for production connections.
ENV DATABASE_URL="postgresql://app:build-only@localhost:5432/it_management"

RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
