# Backend image for the E-Sports Arena server
FROM node:20-alpine

WORKDIR /app

# 1. Copy ONLY the dependency manifests first (layer caching!)
COPY package.json package-lock.json ./

# 2. Install exactly what the lockfile pins, skip devDependencies (no nodemon in prod)
RUN npm ci --omit=dev

# 3. NOW copy the application code
COPY src ./src

USER node
# run as non-root from here on

# 4. Document the port the app listens on
EXPOSE 5001

# 5. The command that runs when the container starts
CMD ["node","src/index.js"]
