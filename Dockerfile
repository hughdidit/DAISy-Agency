FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app
RUN chown node:node /app

ARG CLAWDBOT_DOCKER_APT_PACKAGES=""
RUN if [ -n "$CLAWDBOT_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $CLAWDBOT_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

<<<<<<< HEAD
<<<<<<< HEAD
# Optionally install Chromium and Xvfb for browser automation.
# Build with: docker build --build-arg OPENCLAW_INSTALL_BROWSER=1 ...
# Adds ~300MB but eliminates the 60-90s Playwright install on every container start.
=======
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts
=======
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --chown=node:node ui/package.json ./ui/package.json
COPY --chown=node:node patches ./patches
COPY --chown=node:node scripts ./scripts
>>>>>>> 6a2778720 (Docker: restore pre-change ownership steps)

USER node
RUN pnpm install --frozen-lockfile

# Optionally install Chromium and Xvfb for browser automation.
# Build with: docker build --build-arg OPENCLAW_INSTALL_BROWSER=1 ...
# Adds ~300MB but eliminates the 60-90s Playwright install on every container start.
# Must run after pnpm install so playwright-core is available in node_modules.
<<<<<<< HEAD
>>>>>>> f555835b0 (Channels: add thread-aware model overrides)
=======
USER root
>>>>>>> 6a2778720 (Docker: restore pre-change ownership steps)
ARG OPENCLAW_INSTALL_BROWSER=""
RUN if [ -n "$OPENCLAW_INSTALL_BROWSER" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends xvfb && \
      npx playwright install --with-deps chromium && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

<<<<<<< HEAD
<<<<<<< HEAD
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
<<<<<<< HEAD
RUN CLAWDBOT_A2UI_SKIP_MISSING=1 pnpm build
=======
=======
COPY . .
>>>>>>> f555835b0 (Channels: add thread-aware model overrides)
=======
USER node
COPY --chown=node:node . .
>>>>>>> 6a2778720 (Docker: restore pre-change ownership steps)
RUN pnpm build
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 72f89b1f5 (Docker: include A2UI sources for bundle (#13114))
=======

# Ensure memory-lancedb extension dependencies are installed.
# LanceDB has native bindings that may not be hoisted by pnpm in all configurations.
RUN pnpm install --filter @openclaw/memory-lancedb --prod --no-frozen-lockfile 2>/dev/null || true
<<<<<<< HEAD
>>>>>>> 2ab6313d9 (fix(docker): ensure memory-lancedb deps installed in Docker image)
=======
>>>>>>> 63aa5c5a4 (Revert "fix: remove stderr suppression so install failures are visible in build logs")
=======
>>>>>>> 22b2a77b3 (Revert "fix(docker): ensure memory-lancedb deps installed in Docker image")
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
<<<<<<< HEAD
ENV CLAWDBOT_PREFER_PNPM=1
RUN pnpm ui:install
=======
ENV OPENCLAW_PREFER_PNPM=1
>>>>>>> 1168f5989 (perf: skip redundant ui install in Dockerfile)
RUN pnpm ui:build

ENV NODE_ENV=production

# Security hardening: Run as non-root user
# The node:22-bookworm image includes a 'node' user (uid 1000)
# This reduces the attack surface by preventing container escape via root privileges
USER node

# Start gateway server with default config.
# Binds to loopback (127.0.0.1) by default for security.
#
# For container platforms requiring external health checks:
#   1. Set OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD env var
#   2. Override CMD: ["node","openclaw.mjs","gateway","--allow-unconfigured","--bind","lan"]
CMD ["node", "openclaw.mjs", "gateway", "--allow-unconfigured"]
