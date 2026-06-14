import type { AuditEvent } from "./types.js";

type LoggerLike = {
  info: (message: string) => void;
};

export function createAuditLogger(logger: LoggerLike) {
  return {
    record(event: AuditEvent) {
      logger.info(`trello-toolkit audit event ${JSON.stringify(event)}`);
    },
  };
}
