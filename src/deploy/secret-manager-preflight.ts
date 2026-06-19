#!/usr/bin/env node
import { loadConfig } from "../config/config.js";
import type { SecretRef } from "../config/types.secrets.js";
import { secretRefKey } from "../secrets/ref-contract.js";
import { resolveSecretRefValues } from "../secrets/resolve.js";
import { collectSecretsRuntimeAssignments } from "../secrets/runtime.js";

async function main() {
  const config = loadConfig();
  const collection = collectSecretsRuntimeAssignments({
    config,
    env: process.env,
  });

  const refsByKey = new Map<string, SecretRef>();
  for (const assignment of collection.context.assignments) {
    if (assignment.ref.source !== "gcpSecretManager") {
      continue;
    }
    refsByKey.set(secretRefKey(assignment.ref), assignment.ref);
  }

  const refs = [...refsByKey.values()];
  if (refs.length === 0) {
    process.stdout.write("No active Google Secret Manager SecretRefs found.\n");
    return;
  }

  await resolveSecretRefValues(refs, {
    config,
    env: process.env,
    cache: collection.context.cache,
  });

  const providerCounts = new Map<string, number>();
  for (const ref of refs) {
    providerCounts.set(ref.provider, (providerCounts.get(ref.provider) ?? 0) + 1);
  }
  const summary = [...providerCounts.entries()]
    .map(([provider, count]) => `${provider}:${count}`)
    .join(", ");
  process.stdout.write(
    `Validated Google Secret Manager SecretRefs (${refs.length} refs; ${summary}).\n`,
  );
}

try {
  await main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Google Secret Manager preflight failed: ${message}\n`);
  process.exit(1);
}
