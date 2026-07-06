# Image so directories (e.g. Glama) can start the server and run MCP
# introspection (initialize + tools/list). The WhatsApp connection is lazy, so
# introspection responds immediately without a scanned session.

FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package.json ./
# zaileys is a peerDependency but is required at import time — install it too.
RUN npm install --omit=dev --no-audit --no-fund && npm install --no-save zaileys
COPY --from=build /app/dist ./dist

# stdio MCP server. Auth (QR/pairing) prints to stderr; stdout stays the
# JSON-RPC channel. Configure via ZAILEYS_* env vars.
ENTRYPOINT ["node", "dist/bin.js"]
