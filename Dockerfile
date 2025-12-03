FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "server/index.js"]