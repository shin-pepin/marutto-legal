FROM node:18-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

FROM node:18-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/marutto-legal.sqlite"
EXPOSE 3000
COPY --from=build /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
RUN npx prisma generate
CMD ["npm", "run", "docker-start"]
