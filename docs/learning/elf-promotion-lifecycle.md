# ELF Promotion Lifecycle

Promotion candidates move through explicit lifecycle states:

- `draft`
- `candidate`
- `evaluated`
- `disqualified`
- `promotion_queued`
- `approved`
- `rejected`
- `canonized`

ELF may create and queue candidates. ELF may not self-approve or canonize. Approval and canonization require human/governance action outside the evolution run.

The initial implementation queues safe candidates as reviewable artifacts. A queued candidate includes its candidate genome, fitness result, risk findings, and MAPE-K trace reference. Unsafe candidates become negative-test candidates and remain useful as regression fixtures.

CI/CD and PR review remain mandatory. ELF promotion artifacts are proposals, not authority.
