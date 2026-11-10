# Development image: Node, pnpm and Playwright's Chromium, so nothing has to be
# installed on the host. The source is bind-mounted by docker-compose.yml, not
# copied in. This is not a production image.
FROM node:22-bookworm-slim

# Keep in sync with "packageManager" in package.json.
ARG PNPM_VERSION=10.30.3
# Keep in sync with @playwright/test in pnpm-lock.yaml.
ARG PLAYWRIGHT_VERSION=1.62.0

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    npm_config_store_dir=/app/node_modules/.pnpm-store \
    NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@${PNPM_VERSION} \
 && npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps --only-shell chromium \
 && npm cache clean --force \
 && rm -rf /root/.npm /var/lib/apt/lists/*

WORKDIR /app
EXPOSE 3000
