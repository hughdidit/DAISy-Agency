import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { LearningElfConfig } from "../../config.js";
import type { MapeKTrace, PromotionCandidate } from "../models/types.js";
import type { LearningStore } from "../storage/store.js";
import { exportPromotionMarkdown } from "./markdown-export.js";

const execFileAsync = promisify(execFile);

export type ProposalPrRequest = {
  promotionId: string;
  draft?: boolean;
  outputDir?: string;
};

export type ProposalPrResult = {
  promotionId: string;
  branch: string;
  draft: boolean;
  labels: string[];
  proposalPath: string;
  prNumber?: number;
  prUrl?: string;
  provider: "fixture" | "github";
};

export interface GitHubProposalProvider {
  createProposal(request: {
    branch: string;
    title: string;
    body: string;
    labels: string[];
    draft: boolean;
    proposalPath: string;
  }): Promise<{ prNumber?: number; prUrl?: string; provider: "fixture" | "github" }>;
  updateProposal(request: {
    prNumber: number;
    body: string;
    proposalPath: string;
  }): Promise<{ prNumber: number; prUrl?: string; provider: "fixture" | "github" }>;
}

export class FixtureGitHubProposalProvider implements GitHubProposalProvider {
  async createProposal(): Promise<{ prNumber: number; prUrl: string; provider: "fixture" }> {
    return {
      prNumber: 1,
      prUrl: "https://github.com/fixture/daisy/pull/1",
      provider: "fixture",
    };
  }

  async updateProposal(request: {
    prNumber: number;
  }): Promise<{ prNumber: number; prUrl: string; provider: "fixture" }> {
    return {
      prNumber: request.prNumber,
      prUrl: `https://github.com/fixture/daisy/pull/${request.prNumber}`,
      provider: "fixture",
    };
  }
}

export class GhCliGitHubProposalProvider implements GitHubProposalProvider {
  async createProposal(request: {
    branch: string;
    title: string;
    body: string;
    labels: string[];
    draft: boolean;
    proposalPath: string;
  }): Promise<{ prNumber?: number; prUrl?: string; provider: "github" }> {
    await execFileAsync("git", ["checkout", "-b", request.branch]);
    await execFileAsync("git", ["add", request.proposalPath]);
    await execFileAsync("git", ["commit", "-m", `docs(learning): propose ${request.title}`]);
    await execFileAsync("git", ["push", "-u", "origin", request.branch]);
    const args = ["pr", "create", "--title", request.title, "--body", request.body];
    if (request.labels.length > 0) {
      args.push("--label", request.labels.join(","));
    }
    if (request.draft) {
      args.push("--draft");
    }
    const { stdout } = await execFileAsync("gh", args);
    return { prUrl: stdout.trim() || undefined, provider: "github" };
  }

  async updateProposal(request: {
    prNumber: number;
    body: string;
    proposalPath: string;
  }): Promise<{ prNumber: number; provider: "github" }> {
    await execFileAsync("git", ["add", request.proposalPath]);
    const { stdout: staged } = await execFileAsync("git", [
      "diff",
      "--cached",
      "--name-only",
      "--",
      request.proposalPath,
    ]);
    if (staged.trim()) {
      await execFileAsync("git", [
        "commit",
        "-m",
        `docs(learning): update proposal ${request.prNumber}`,
      ]);
      await execFileAsync("git", ["push"]);
    }
    await execFileAsync("gh", ["pr", "edit", String(request.prNumber), "--body", request.body]);
    return { prNumber: request.prNumber, provider: "github" };
  }
}

export class ElfProposalService {
  constructor(
    private readonly config: NonNullable<LearningElfConfig["githubProposals"]>,
    private readonly store: LearningStore,
    private readonly provider: GitHubProposalProvider,
  ) {}

  async createPr(request: ProposalPrRequest): Promise<ProposalPrResult> {
    this.assertEnabled();
    const records = await this.resolveRecords(request.promotionId);
    const proposalPath = path.resolve(
      request.outputDir ?? ".openclaw/elf/proposals",
      `${request.promotionId}.md`,
    );
    this.assertAllowedPath(proposalPath);
    await fs.mkdir(path.dirname(proposalPath), { recursive: true });
    await exportPromotionMarkdown({ ...records, outPath: proposalPath });
    const branch = `${this.config.branchPrefix}${request.promotionId}`;
    const body = buildProposalBody(records.promotion, records.trace, proposalPath);
    const result = await this.provider.createProposal({
      branch,
      title: records.promotion.title,
      body,
      labels: this.config.labels,
      draft: request.draft ?? this.config.draftDefault,
      proposalPath,
    });
    return {
      promotionId: request.promotionId,
      branch,
      draft: request.draft ?? this.config.draftDefault,
      labels: this.config.labels,
      proposalPath,
      ...result,
    };
  }

  async updatePr(request: {
    promotionId: string;
    prNumber: number;
    outputDir?: string;
  }): Promise<ProposalPrResult> {
    this.assertEnabled();
    const records = await this.resolveRecords(request.promotionId);
    const proposalPath = path.resolve(
      request.outputDir ?? ".openclaw/elf/proposals",
      `${request.promotionId}.md`,
    );
    this.assertAllowedPath(proposalPath);
    await fs.mkdir(path.dirname(proposalPath), { recursive: true });
    await exportPromotionMarkdown({ ...records, outPath: proposalPath });
    const body = buildProposalBody(records.promotion, records.trace, proposalPath);
    const result = await this.provider.updateProposal({
      prNumber: request.prNumber,
      body,
      proposalPath,
    });
    return {
      promotionId: request.promotionId,
      branch: `${this.config.branchPrefix}${request.promotionId}`,
      draft: this.config.draftDefault,
      labels: this.config.labels,
      proposalPath,
      ...result,
    };
  }

  private async resolveRecords(promotionId: string) {
    const promotion = await this.store.getRecordById("elf_promotion_candidates", promotionId);
    if (!promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }
    const candidate = await this.store.getRecordById(
      "elf_candidate_genomes",
      promotion.candidateId,
    );
    const fitness = await this.store.getRecordById(
      "elf_fitness_results",
      promotion.fitnessResultId,
    );
    const traces = await this.store.listRecords("elf_mapek_traces");
    const trace = traces.find((entry) => entry.runId === promotion.runId) ?? null;
    if (!candidate || !fitness) {
      throw new Error(`Promotion ${promotion.id} is missing candidate or fitness records`);
    }
    return { promotion, candidate, fitness, trace };
  }

  private assertEnabled(): void {
    if (!this.config.enabled) {
      throw new Error("ELF GitHub proposal creation is disabled by configuration");
    }
  }

  private assertAllowedPath(filePath: string): void {
    const normalized = normalizePath(filePath);
    if (this.config.forbiddenPathGlobs.some((glob) => matchesGlob(normalized, glob))) {
      throw new Error(`ELF proposal path is forbidden: ${filePath}`);
    }
    const allowed = this.config.allowedProposalPaths.some((allowedPath) => {
      const allowedRoot = normalizePath(allowedPath);
      const relative = path.relative(allowedRoot, normalized);
      return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    });
    if (!allowed) {
      throw new Error(`ELF proposal path is not in an allowed proposal directory: ${filePath}`);
    }
  }
}

function normalizePath(filePath: string): string {
  return path.resolve(filePath).replace(/\\/g, "/");
}

function matchesGlob(filePath: string, pattern: string): boolean {
  const normalizedPattern = normalizePath(pattern);
  let source = "";
  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const char = normalizedPattern[index];
    const next = normalizedPattern[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      source += "[^/]*";
      continue;
    }
    source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`).test(filePath);
}

function buildProposalBody(
  promotion: PromotionCandidate,
  trace: MapeKTrace | null,
  proposalPath: string,
): string {
  return [
    "DAISy ELF generated this draft proposal for human review.",
    "",
    `Promotion: ${promotion.id}`,
    `State: ${promotion.state}`,
    `Trace: ${trace?.id ?? "not found"}`,
    `Proposal path: ${proposalPath}`,
    "",
    "No canonical writes, approvals, merges, deployments, permission grants, or CI bypasses were performed.",
  ].join("\n");
}
