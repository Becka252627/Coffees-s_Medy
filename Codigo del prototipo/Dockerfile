
FROM node:22-alpine

WORKDIR /app

# Herramientas necesarias para compilar dependencias nativas
RUN apk add --no-cache python3 make g++ unixodbc-dev

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
