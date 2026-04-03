import { Type } from "@sinclair/typebox";

export const CronGuardPluginConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
    approvers: Type.Optional(Type.Array(Type.String())),
    approvalTtlMs: Type.Optional(Type.Integer({ minimum: 1 })),
    read: Type.Optional(
      Type.Object(
        {
          redactWebhookTargets: Type.Optional(Type.Boolean()),
        },
        { additionalProperties: false },
      ),
    ),
    discord: Type.Optional(
      Type.Object(
        {
          enabled: Type.Optional(Type.Boolean()),
          target: Type.Optional(
            Type.Union([Type.Literal("dm"), Type.Literal("channel"), Type.Literal("both")]),
          ),
          cleanupAfterResolve: Type.Optional(Type.Boolean()),
          agentFilter: Type.Optional(Type.Array(Type.String())),
          sessionFilter: Type.Optional(Type.Array(Type.String())),
        },
        { additionalProperties: false },
      ),
    ),
    audit: Type.Optional(
      Type.Object(
        {
          retention: Type.Optional(
            Type.Object(
              {
                maxAgeMs: Type.Optional(Type.Integer({ minimum: 1 })),
                maxResolved: Type.Optional(Type.Integer({ minimum: 1 })),
              },
              { additionalProperties: false },
            ),
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
