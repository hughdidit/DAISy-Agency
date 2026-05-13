import type { CandidateGenome } from "../models/types.js";
import { detectForbiddenMutations } from "../security/forbidden-mutations.js";

export function evaluateSecurityGate(genome: CandidateGenome): {
  securityCompliance: number;
  disqualificationReasons: string[];
} {
  const disqualificationReasons = detectForbiddenMutations(genome);
  return {
    securityCompliance: disqualificationReasons.length === 0 ? 1 : 0,
    disqualificationReasons,
  };
}
