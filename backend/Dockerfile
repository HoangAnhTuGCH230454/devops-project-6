FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .


FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./


RUN npm install --only=production


COPY --from=builder /app/server.js ./


EXPOSE 8080

CMD ["node", "server.js"]