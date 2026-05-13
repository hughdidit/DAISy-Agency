import fs from "node:fs/promises";
import path from "node:path";
import { CandidateGenomeSchema, LearningEventSchema } from "../models/schemas.js";
import type { CandidateGenome, LearningEvent } from "../models/types.js";
import { validateWithSchema } from "../models/validation.js";
import type { CandidateProvider, FixturePayload } from "./provider.js";

async function readJsonOrJsonl(filePath: string): Promise<unknown[]> {
  const text = await fs.readFile(filePath, "utf8");
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to parse JSONL at line ${index + 1}: ${message}`);
        }
      });
  }
}

async function readCandidateDirectory(dir: string): Promise<unknown[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read ELF candidate fixture directory ${dir}: ${message}`);
  }
  const values: unknown[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".json")) {
      continue;
    }
    values.push(...(await readJsonOrJsonl(path.join(dir, entry))));
  }
  return values;
}

export class FixtureProvider implements CandidateProvider {
  async loadFixture(fixturePath: string): Promise<FixturePayload> {
    const resolved = path.resolve(fixturePath);
    const payloads = await readJsonOrJsonl(resolved);
    if (path.basename(path.dirname(resolved)) === "learning-events") {
      const candidateDir = path.resolve(path.dirname(resolved), "..", "candidates");
      payloads.push(...(await readCandidateDirectory(candidateDir)));
    }

    const learningEvents: LearningEvent[] = [];
    const candidates: CandidateGenome[] = [];
    const validationFailures: Array<{ file: string; errors: string[] }> = [];

    for (const payload of payloads) {
      const event = validateWithSchema<LearningEvent>(LearningEventSchema, payload);
      if (event.ok) {
        learningEvents.push(event.value);
        continue;
      }
      const candidate = validateWithSchema<CandidateGenome>(CandidateGenomeSchema, payload);
      if (candidate.ok) {
        candidates.push(candidate.value);
        continue;
      }
      validationFailures.push({
        file: resolved,
        errors: [...event.errors, ...candidate.errors],
      });
    }

    return { learningEvents, candidates, validationFailures };
  }
}
