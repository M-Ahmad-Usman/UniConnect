# Stage 1: Build the React frontend
FROM node:24-alpine AS client-builder

WORKDIR /build/client

# Install dependencies first (layer-cached until package-lock changes)
COPY client/package.json client/package-lock.json ./
RUN npm ci

# Copy source and build
COPY client/ ./
RUN npx vite build
# Output: /build/client/dist


# Stage 2: Build the Express backend
FROM node:24-alpine AS server-builder

WORKDIR /build/server

# Install ALL dependencies (dev included — needed for tsc and prisma generate)
COPY server/package.json server/package-lock.json ./
RUN npm ci

# Copy source files needed for compilation
COPY server/tsconfig.json ./
COPY server/src/ ./src/
COPY server/prisma/ ./prisma/

# Generate Prisma client natively into node_modules/.prisma/client
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# Prune to production dependencies only (Prisma client engine remains safe inside node_modules)
RUN npm prune --omit=dev


# Stage 3: Production image
FROM node:24-alpine AS production

# Install dumb-init for proper signal handling and process reaping
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# Create a non-root user to run the app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from builder (contains optimized Prisma Client)
COPY --from=server-builder /build/server/node_modules ./node_modules

# Copy compiled backend
COPY --from=server-builder /build/server/dist ./dist

# Copy Prisma schema and migrations (needed for prisma migrate deploy at startup)
COPY --from=server-builder /build/server/prisma ./prisma

# Copy the React build into the location Express serves static files from
COPY --from=client-builder /build/client/dist ./public

# Copy package.json (required by some Node.js module resolution paths)
COPY server/package.json ./

# Own everything as the non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Azure App Service injects PORT at runtime; default to 4000 for local runs
EXPOSE 4000

# dumb-init ensures SIGTERM is forwarded correctly to the Node process
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]