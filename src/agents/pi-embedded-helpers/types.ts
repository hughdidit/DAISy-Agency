export type EmbeddedContextFile = { path: string; content: string };

<<<<<<< HEAD
export type FailoverReason = "auth" | "format" | "rate_limit" | "billing" | "timeout" | "unknown";
=======
export type FailoverReason =
  | "auth"
  | "auth_permanent"
  | "format"
  | "rate_limit"
  | "billing"
  | "timeout"
  | "model_not_found"
  | "session_expired"
  | "unknown";
>>>>>>> ed86252aa (fix: handle CLI session expired errors gracefully instead of crashing gateway (#31090))
