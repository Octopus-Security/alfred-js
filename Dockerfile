FROM node:22-alpine

RUN apk upgrade --no-cache && apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm install --build-from-source=sqlite3

COPY discord-bot/. .

CMD [ "node", "index.js" ]
