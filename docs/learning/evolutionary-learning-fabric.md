# DAISy Evolutionary Learning Fabric

DAISy ELF is a governed candidate optimizer. It may observe learning events, evaluate candidate strategies, queue promotion proposals, and export review artifacts. It may not approve itself, canonize behavior, deploy, grant permissions, weaken policy, mutate system prompts, or write canonical documentation/configuration directly.

The initial implementation runs in deterministic fixture mode. It uses TypeScript extension code, the OpenClaw plugin CLI path, local JSONL state, TypeBox validation, and Vitest coverage. It does not fine-tune models, call live LLMs, call external APIs, or write directly to MongoDB.

ELF focuses first on `github_pr_review_strategy` genomes. A genome is structured JSON that captures tool order, memory retrieval recipes, review focus, max findings, approval mode, output format, and immutable safety constraints. Unsafe genomes are disqualified even when their weighted fitness score is high.

Runtime state is append-only under the OpenClaw state directory:

- `elf_learning_events`
- `elf_candidate_genomes`
- `elf_evolution_runs`
- `elf_fitness_results`
- `elf_promotion_candidates`
- `elf_negative_test_candidates`
- `elf_mapek_traces`

MongoDB MCP-backed storage is intentionally an interface-only follow-up. The initial implementation keeps durable learning local and fixture-driven until governance approves a live MCP-backed persistence path.
