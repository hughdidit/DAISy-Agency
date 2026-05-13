# ELF Security Boundaries

ELF follows DAISy Zero Trust and Least Privilege rules.

ELF may:

- Observe fixture learning events.
- Analyze risk and classify events.
- Generate and evaluate candidate genomes.
- Queue promotion candidates.
- Export Markdown review proposals.

ELF may not:

- Approve or canonize its own candidates.
- Modify production config.
- Modify deployment workflows.
- Grant tool permissions.
- Override security policy.
- Mutate system prompts.
- Write canonical documentation directly.
- Store secrets, tokens, service-account JSON, OAuth credentials, cookies, private keys, or connection strings.
- Perform unscoped memory writes.

The security gate is hard. Any disqualification reason or `securityCompliance < 1` makes the candidate ineligible for promotion regardless of weighted score.

Secret-like content is rejected before persistence. The scanner catches patterns including private keys, API key assignments, OpenAI/Anthropic/GitHub token names, Google credential references, OAuth tokens, client secrets, passwords, MongoDB Atlas connection strings, and bearer tokens.
