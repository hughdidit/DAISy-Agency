import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateCronListParams,
  validateCronStatusParams,
} from "../../../src/gateway/protocol/index.js";
import type { GatewayRequestHandlers } from "../../../src/gateway/server-methods/types.js";
import { redactCronGuardListPage } from "./redaction.js";
import { getCronGuardRuntime } from "./service.js";

export const cronGuardGatewayHandlers: GatewayRequestHandlers = {
  "cron.guard.status": async ({ params, respond, context }) => {
    if (!validateCronStatusParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid cron.guard.status params: ${formatValidationErrors(validateCronStatusParams.errors)}`,
        ),
      );
      return;
    }
    respond(true, await context.cron.status());
  },
  "cron.guard.list": async ({ params, respond, context }) => {
    if (!validateCronListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid cron.guard.list params: ${formatValidationErrors(validateCronListParams.errors)}`,
        ),
      );
      return;
    }
    const runtime = getCronGuardRuntime();
    const page = await context.cron.listPage(params as never);
    respond(true, redactCronGuardListPage(page, runtime.getConfig().read));
  },
  "cron.guard.request.add": async ({ params, respond }) => {
    const runtime = getCronGuardRuntime();
    try {
      const payload = (params as { payload?: Record<string, unknown> }).payload ?? {};
      const requester = ((params as { requester?: Record<string, unknown> }).requester ??
        {}) as never;
      respond(true, await runtime.createAddRequest({ payload, requester }));
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
  "cron.guard.request.update": async ({ params, respond, context }) => {
    const runtime = getCronGuardRuntime();
    try {
      const jobId =
        (params as { jobId?: string; id?: string }).jobId ?? (params as { id?: string }).id ?? "";
      const patch = (params as { patch?: Record<string, unknown> }).patch ?? {};
      const requester = ((params as { requester?: Record<string, unknown> }).requester ??
        {}) as never;
      respond(
        true,
        await runtime.createUpdateRequest({ jobId, patch, requester, cron: context.cron }),
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
  "cron.guard.request.remove": async ({ params, respond, context }) => {
    const runtime = getCronGuardRuntime();
    try {
      const jobId =
        (params as { jobId?: string; id?: string }).jobId ?? (params as { id?: string }).id ?? "";
      const requester = ((params as { requester?: Record<string, unknown> }).requester ??
        {}) as never;
      respond(true, await runtime.createRemoveRequest({ jobId, requester, cron: context.cron }));
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
  "cron.guard.requests.list": ({ respond }) => {
    const runtime = getCronGuardRuntime();
    respond(true, { requests: runtime.listRequests() });
  },
  "cron.guard.requests.get": ({ params, respond }) => {
    const runtime = getCronGuardRuntime();
    const requestId =
      typeof (params as { requestId?: string }).requestId === "string"
        ? (params as { requestId: string }).requestId
        : "";
    const request = runtime.getRequest(requestId);
    if (!request) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `Unknown requestId: ${requestId}`),
      );
      return;
    }
    respond(true, request);
  },
  "cron.guard.modify": async ({ params, respond }) => {
    const runtime = getCronGuardRuntime();
    try {
      const requestId =
        typeof (params as { requestId?: string }).requestId === "string"
          ? (params as { requestId: string }).requestId
          : "";
      const payload = ((params as { payload?: Record<string, unknown> }).payload ?? {}) as Record<
        string,
        unknown
      >;
      const approver = ((params as { approver?: Record<string, unknown> }).approver ?? {}) as never;
      respond(true, await runtime.modifyRequest({ requestId, payload, approver }));
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
  "cron.guard.resolve": async ({ params, respond, context }) => {
    const runtime = getCronGuardRuntime();
    try {
      const requestId =
        typeof (params as { requestId?: string }).requestId === "string"
          ? (params as { requestId: string }).requestId
          : "";
      const disposition =
        (params as { disposition?: "approve" | "deny" }).disposition === "deny"
          ? "deny"
          : "approve";
      const approver = ((params as { approver?: Record<string, unknown> }).approver ?? {}) as never;
      respond(
        true,
        await runtime.resolveRequest({
          requestId,
          disposition,
          approver,
          cron: context.cron,
        }),
      );
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
  "cron.guard.prune": async ({ respond }) => {
    const runtime = getCronGuardRuntime();
    await runtime.prune();
    respond(true, { ok: true });
  },
};
