FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build
RUN mkdir -p data
VOLUME /app/data
ENV STORE_PATH=/app/data/store.json
EXPOSE 3001
CMD ["node", "dist/index.js"]
