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

# Install Litestream v0.3.13 (multi-arch with checksum verification)
# Checksums from official release: https://github.com/benbjohnson/litestream/releases/tag/v0.3.13
# Do not override in production builds.
ARG TARGETARCH
ARG LITESTREAM_SHA256_AMD64="eb75a3de5cab03875cdae9f5f539e6aedadd66607003d9b1e7a9077948818ba0"
ARG LITESTREAM_SHA256_ARM64="9585f5a508516bd66af2b2376bab4de256a5ef8e2b73ec760559e679628f2d59"
RUN ARCH="${TARGETARCH}"; \
    if [ "$ARCH" = "arm64" ]; then ARCH="arm64"; EXPECTED_SHA="$LITESTREAM_SHA256_ARM64"; \
    else ARCH="amd64"; EXPECTED_SHA="$LITESTREAM_SHA256_AMD64"; fi && \
    wget -q "https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-${ARCH}.tar.gz" -O /tmp/litestream.tar.gz && \
    echo "${EXPECTED_SHA}  /tmp/litestream.tar.gz" | sha256sum -c - && \
    tar -C /usr/local/bin -xzf /tmp/litestream.tar.gz && rm /tmp/litestream.tar.gz

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
