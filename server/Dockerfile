FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY ./src ./src
COPY .env .env

EXPOSE 5000
CMD ["node", "src/index.js"]
