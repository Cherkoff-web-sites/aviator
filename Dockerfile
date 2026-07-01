# Один контейнер для Timeweb (режим «Dockerfile»). Для Compose — docker-compose.yml
FROM node:20-alpine AS web-build
WORKDIR /app
COPY prod/package.json prod/package-lock.json ./
RUN npm ci
COPY prod/ ./
RUN npm run build

FROM node:20-alpine AS api-build
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

FROM nginx:alpine
RUN apk add --no-cache nodejs

WORKDIR /app/server
COPY --from=api-build /app/package.json /app/package-lock.json ./
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/dist ./dist
COPY --from=web-build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/start.sh /start.sh
RUN chmod +x /start.sh && mkdir -p /app/data

ENV PORT=3001
ENV STORE_PATH=/app/data/store.json
ENV NODE_ENV=production
VOLUME /app/data
EXPOSE 80

CMD ["/start.sh"]
