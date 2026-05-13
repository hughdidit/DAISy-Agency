# ELF MAPE-K Loop

ELF uses a bounded MAPE-K loop:

- Monitor: ingest fixture learning events and candidate genomes.
- Analyze: validate schemas, classify task classes, scan for secrets, and report risk findings.
- Plan: generate deterministic candidate genomes, mutate them with a seeded RNG, reject forbidden mutations, evaluate weighted fitness, and select promotion-eligible candidates.
- Execute: queue promotion candidates and export Markdown proposals only.
- Knowledge: persist events, candidates, runs, scores, negative tests, promotions, and trace records to JSONL.

Every fixture evolution run persists a `MapeKTrace` record. The trace maps each MAPE-K stage and includes `execute.directCanonicalWrites: false`. That invariant is part of the schema and must remain literal false.

Execute is deliberately narrow. In ELF, Execute means queue/export. It does not mean production mutation, workflow mutation, deployment, policy change, canonical documentation write, prompt update, permission grant, approval, or canonization.
