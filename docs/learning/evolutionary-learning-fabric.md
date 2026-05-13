# DAISy Evolutionary Learning Fabric

DAISy ELF is a governed candidate optimizer. It may observe learning events, evaluate candidate strategies, queue promotion proposals, and export review artifacts. It may not approve itself, canonize behavior, deploy, grant permissions, weaken policy, mutate system prompts, or write canonical documentation/configuration directly.

Phase 1 runs in deterministic fixture mode. It uses TypeScript extension code, the OpenClaw plugin CLI path, local JSONL state, TypeBox validation, and Vitest coverage. Phase 2 adds explicit live LLM-assisted evolution and MCP-backed storage seams, but LLM output remains untrusted candidate material and MongoDB access remains MCP-only.

ELF focuses first on `github_pr_review_strategy` genomes. A genome is structured JSON that captures tool order, memory retrieval recipes, review focus, max findings, approval mode, output format, and immutable safety constraints. Unsafe genomes are disqualified even when their weighted fitness score is high.

Runtime state is append-only under the OpenClaw state directory:

- `elf_learning_events`
- `elf_candidate_genomes`
- `elf_evolution_runs`
- `elf_fitness_results`
- `elf_promotion_candidates`
- `elf_negative_test_candidates`
- `elf_mapek_traces`

Phase 2 keeps the same authority boundary: ELF can search for better behavior, evaluate candidates, queue promotions, export Markdown, and create draft proposal PRs. It cannot self-approve, merge, deploy, grant permissions, bypass CI, mutate system prompts, or write canonical authority directly.
