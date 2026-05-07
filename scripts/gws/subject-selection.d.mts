export interface GwsBindingSubjectSelection {
  agentSubjects: string[];
  subagentSubjects: string[];
  baselineSubject: string | null;
  delegateSubjects: string[];
}

export declare const GWS_BINDING_SUBJECT_PATTERN: RegExp;

export declare function isValidGwsBindingSubject(subject: unknown): subject is string;

export declare function selectGwsBindingSubjects(
  agentCredentialBindings: unknown,
): GwsBindingSubjectSelection;
