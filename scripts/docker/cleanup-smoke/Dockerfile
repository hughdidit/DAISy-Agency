FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
<<<<<<< HEAD
<<<<<<< HEAD
COPY scripts/postinstall.js ./scripts/postinstall.js
=======
COPY scripts/setup-git-hooks.js ./scripts/setup-git-hooks.js
>>>>>>> 6fb2d3d7d (feat: remove slop.)
=======
>>>>>>> 6b83d82e8 (chore: clean up git hooks and actually install them again.)
RUN corepack enable \
  && pnpm install --frozen-lockfile

COPY . .
COPY scripts/docker/cleanup-smoke/run.sh /usr/local/bin/moltbot-cleanup-smoke
RUN chmod +x /usr/local/bin/moltbot-cleanup-smoke

ENTRYPOINT ["/usr/local/bin/moltbot-cleanup-smoke"]
