FROM node:20.19-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

FROM node:20.19-alpine
RUN apk add --no-cache openssl bash
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/marutto-legal.sqlite"
EXPOSE 3000

# Install Litestream v0.3.13
ADD https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64-static.tar.gz /tmp/litestream.tar.gz
RUN tar -C /usr/local/bin -xzf /tmp/litestream.tar.gz && rm /tmp/litestream.tar.gz

COPY --from=build /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
RUN npx prisma generate

COPY litestream.yml /app/litestream.yml
COPY scripts/run.sh /app/scripts/run.sh
RUN chmod +x /app/scripts/run.sh

CMD ["/app/scripts/run.sh"]
