type BatchOutputErrorLike = {
  error?: { message?: string };
  response?: {
    body?: {
      error?: { message?: string };
    };
  };
};

<<<<<<< HEAD
=======
function getResponseErrorMessage(line: BatchOutputErrorLike | undefined): string | undefined {
  const body = line?.response?.body;
  if (typeof body === "string") {
    return body || undefined;
  }
  if (!body || typeof body !== "object") {
    return undefined;
  }
  return typeof body.error?.message === "string" ? body.error.message : undefined;
}

>>>>>>> d92ba4f8a (feat: Provider/Mistral full support for Mistral on OpenClaw 🇫🇷 (#23845))
export function extractBatchErrorMessage(lines: BatchOutputErrorLike[]): string | undefined {
  const first = lines.find((line) => line.error?.message || line.response?.body?.error);
  return (
    first?.error?.message ??
    (typeof first?.response?.body?.error?.message === "string"
      ? first?.response?.body?.error?.message
      : undefined)
  );
}

export function formatUnavailableBatchError(err: unknown): string | undefined {
  const message = err instanceof Error ? err.message : String(err);
  return message ? `error file unavailable: ${message}` : undefined;
}
