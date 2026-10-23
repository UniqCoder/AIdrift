FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY scripts/build-api.cjs ./scripts/build-api.cjs
RUN node scripts/build-api.cjs

FROM node:24-alpine AS runtime
LABEL org.opencontainers.image.title="DRIFTVEIL API"
WORKDIR /app
ENV NODE_ENV=production PORT=10000
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --chown=node:node server/app.mjs server/index.mjs ./server/
USER node
EXPOSE 10000
CMD ["node", "server/index.mjs"]
