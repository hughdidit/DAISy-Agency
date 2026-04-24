import { Type } from "@sinclair/typebox";
import {
  SANDBOX_RUNTIME_SUPPORT_STATUSES,
  SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS,
} from "../../../shared/sandbox-runtime-profiles.js";
import { NonEmptyString } from "./primitives.js";

export const ModelChoiceSchema = Type.Object(
  {
    id: NonEmptyString,
    name: NonEmptyString,
    provider: NonEmptyString,
    contextWindow: Type.Optional(Type.Integer({ minimum: 1 })),
    reasoning: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentSummarySchema = Type.Object(
  {
    id: NonEmptyString,
    name: Type.Optional(NonEmptyString),
    identity: Type.Optional(
      Type.Object(
        {
          name: Type.Optional(NonEmptyString),
          theme: Type.Optional(NonEmptyString),
          emoji: Type.Optional(NonEmptyString),
          avatar: Type.Optional(NonEmptyString),
          avatarUrl: Type.Optional(NonEmptyString),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const AgentsListParamsSchema = Type.Object({}, { additionalProperties: false });

export const AgentsListResultSchema = Type.Object(
  {
    defaultId: NonEmptyString,
    mainKey: NonEmptyString,
    scope: Type.Union([Type.Literal("per-sender"), Type.Literal("global")]),
    agents: Type.Array(AgentSummarySchema),
  },
  { additionalProperties: false },
);

export const AgentsCreateParamsSchema = Type.Object(
  {
    name: NonEmptyString,
    workspace: NonEmptyString,
    emoji: Type.Optional(Type.String()),
    avatar: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsCreateResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    name: NonEmptyString,
    workspace: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsUpdateParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    name: Type.Optional(NonEmptyString),
    workspace: Type.Optional(NonEmptyString),
    model: Type.Optional(NonEmptyString),
    avatar: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsUpdateResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsDeleteParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    deleteFiles: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentsDeleteResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    removedBindings: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const AgentsFileEntrySchema = Type.Object(
  {
    name: NonEmptyString,
    path: NonEmptyString,
    missing: Type.Boolean(),
    size: Type.Optional(Type.Integer({ minimum: 0 })),
    updatedAtMs: Type.Optional(Type.Integer({ minimum: 0 })),
    content: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsFilesListParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsFilesListResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    files: Type.Array(AgentsFileEntrySchema),
  },
  { additionalProperties: false },
);

export const AgentsFilesGetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    name: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsFilesGetResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    file: AgentsFileEntrySchema,
  },
  { additionalProperties: false },
);

export const AgentsFilesSetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    name: NonEmptyString,
    content: Type.String(),
  },
  { additionalProperties: false },
);

export const AgentsFilesSetResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    file: AgentsFileEntrySchema,
  },
  { additionalProperties: false },
);

export const SupportedTextFileEncodingSchema = Type.Union([
  Type.Literal("utf-8"),
  Type.Literal("utf-16le"),
  Type.Literal("utf-16be"),
]);

export const AgentsWorkspaceFileEntrySchema = Type.Object(
  {
    path: NonEmptyString,
    name: NonEmptyString,
    kind: Type.Union([Type.Literal("file"), Type.Literal("directory")]),
    size: Type.Optional(Type.Integer({ minimum: 0 })),
    updatedAtMs: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesListParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    dir: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesListResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    root: NonEmptyString,
    dir: Type.String(),
    entries: Type.Array(AgentsWorkspaceFileEntrySchema),
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesGetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    path: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFileDocumentSchema = Type.Intersect([
  AgentsWorkspaceFileEntrySchema,
  Type.Object(
    {
      contentBase64: Type.String(),
      textEditable: Type.Boolean(),
      textContent: Type.Optional(Type.String()),
      encoding: Type.Optional(SupportedTextFileEncodingSchema),
      includeBom: Type.Optional(Type.Boolean()),
      textError: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
  ),
]);

export const AgentsWorkspaceFilesGetResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    root: NonEmptyString,
    file: AgentsWorkspaceFileDocumentSchema,
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesSetParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    path: NonEmptyString,
    content: Type.Optional(Type.String()),
    contentBase64: Type.Optional(Type.String()),
    encoding: Type.Optional(SupportedTextFileEncodingSchema),
    includeBom: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesSetResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    root: NonEmptyString,
    file: AgentsWorkspaceFileDocumentSchema,
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesDeleteParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    path: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesDeleteResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    root: NonEmptyString,
    deletedPath: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesMkdirParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    path: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesMkdirResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    root: NonEmptyString,
    entry: AgentsWorkspaceFileEntrySchema,
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesMoveParamsSchema = Type.Object(
  {
    agentId: NonEmptyString,
    fromPath: NonEmptyString,
    toPath: NonEmptyString,
  },
  { additionalProperties: false },
);

export const AgentsWorkspaceFilesMoveResultSchema = Type.Object(
  {
    ok: Type.Literal(true),
    agentId: NonEmptyString,
    workspace: NonEmptyString,
    root: NonEmptyString,
    fromPath: NonEmptyString,
    toPath: NonEmptyString,
    entry: AgentsWorkspaceFileEntrySchema,
  },
  { additionalProperties: false },
);

export const ModelsListParamsSchema = Type.Object({}, { additionalProperties: false });

export const ModelsListResultSchema = Type.Object(
  {
    models: Type.Array(ModelChoiceSchema),
  },
  { additionalProperties: false },
);

export const SkillsStatusParamsSchema = Type.Object(
  {
    agentId: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);

export const ResolvedCapabilityClassSchema = Type.Union(
  [
    Type.Literal("sandbox-local"),
    Type.Literal("gateway-brokered"),
    Type.Literal("remote-node-assisted"),
    Type.Literal("configured-but-blocked"),
    Type.Literal("unsupported-in-current-runtime"),
  ],
  { $id: "ResolvedCapabilityClass" },
);

export const ResolvedCapabilityKindSchema = Type.Union(
  [Type.Literal("tool"), Type.Literal("skill")],
  { $id: "ResolvedCapabilityKind" },
);

export const ResolvedCapabilityDenyReasonSchema = Type.Union(
  [
    Type.Literal("skill-disabled"),
    Type.Literal("bundled-skill-not-allowlisted"),
    Type.Literal("missing-required-env"),
    Type.Literal("missing-required-config"),
    Type.Literal("tool-denied-by-sandbox-policy"),
    Type.Literal("tool-not-in-sandbox-allowlist"),
  ],
  { $id: "ResolvedCapabilityDenyReason" },
);

export const ResolvedCapabilityUnavailableReasonSchema = Type.Union(
  [
    Type.Literal("missing-runtime-binaries"),
    Type.Literal("missing-runtime-any-binaries"),
    Type.Literal("unsupported-os"),
    Type.Literal("missing-runtime-profile"),
    Type.Literal("unsupported-runtime-family"),
    Type.Literal("runtime-profile-image-mismatch"),
    Type.Literal("custom-runtime-image"),
    Type.Literal("browser-runtime-disabled"),
    Type.Literal("missing-projection"),
    Type.Literal("missing-provider"),
  ],
  { $id: "ResolvedCapabilityUnavailableReason" },
);

const SandboxRuntimeProfileIdSchema = Type.String({
  enum: [...SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS],
});

const SandboxRuntimeSupportStatusSchema = Type.String({
  enum: [...SANDBOX_RUNTIME_SUPPORT_STATUSES],
});

export const ResolvedCapabilityRuntimeContextSchema = Type.Object(
  {
    agentId: NonEmptyString,
    sessionKey: Type.Optional(NonEmptyString),
    sandboxMode: Type.Optional(NonEmptyString),
    sandboxScope: Type.Optional(NonEmptyString),
    runtimeProfile: Type.Optional(SandboxRuntimeProfileIdSchema),
    sandboxed: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false, $id: "ResolvedCapabilityRuntimeContext" },
);

export const ResolvedCapabilityPolicySourceSchema = Type.Object(
  {
    kind: Type.Union([
      Type.Literal("skill-config-entry"),
      Type.Literal("bundled-skill-allowlist"),
      Type.Literal("sandbox-tool-policy"),
    ]),
    key: NonEmptyString,
    detail: Type.Optional(Type.String()),
  },
  { additionalProperties: false, $id: "ResolvedCapabilityPolicySource" },
);

export const ResolvedCapabilityPolicySchema = Type.Object(
  {
    source: ResolvedCapabilityPolicySourceSchema,
    denyReason: ResolvedCapabilityDenyReasonSchema,
    detail: Type.Optional(Type.String()),
  },
  { additionalProperties: false, $id: "ResolvedCapabilityPolicy" },
);

export const ResolvedCapabilityRuntimeEvidenceSchema = Type.Object(
  {
    profile: Type.Optional(SandboxRuntimeProfileIdSchema),
    supportStatus: Type.Optional(SandboxRuntimeSupportStatusSchema),
    declaredImage: Type.Optional(NonEmptyString),
    matchedImage: Type.Optional(NonEmptyString),
    customImage: Type.Optional(NonEmptyString),
    missingBins: Type.Array(NonEmptyString),
    missingAnyBins: Type.Array(NonEmptyString),
    missingOs: Type.Array(NonEmptyString),
    reasonCodes: Type.Array(ResolvedCapabilityUnavailableReasonSchema),
    detail: Type.Optional(Type.String()),
  },
  {
    additionalProperties: false,
    $id: "ResolvedCapabilityRuntimeEvidence",
    allOf: [
      {
        if: {
          properties: {
            supportStatus: {
              const: "custom-image",
            },
          },
          required: ["supportStatus"],
        },
        then: {
          required: ["customImage"],
        },
      },
    ],
  },
);

export const ResolvedCapabilityProjectionEvidenceSchema = Type.Object(
  {
    missingPaths: Type.Array(NonEmptyString),
    reasonCodes: Type.Array(ResolvedCapabilityUnavailableReasonSchema),
    detail: Type.Optional(Type.String()),
  },
  { additionalProperties: false, $id: "ResolvedCapabilityProjectionEvidence" },
);

export const ResolvedCapabilityProviderEvidenceSchema = Type.Object(
  {
    providerId: Type.Optional(NonEmptyString),
    providerKind: Type.Optional(NonEmptyString),
    transport: Type.Optional(NonEmptyString),
    reasonCodes: Type.Array(ResolvedCapabilityUnavailableReasonSchema),
    detail: Type.Optional(Type.String()),
  },
  { additionalProperties: false, $id: "ResolvedCapabilityProviderEvidence" },
);

export const ResolvedCapabilityRemoteEvidenceSchema = Type.Object(
  {
    satisfiedBins: Type.Array(NonEmptyString),
    satisfiedAnyBins: Type.Array(NonEmptyString),
    satisfiedOs: Type.Array(NonEmptyString),
    note: Type.Optional(Type.String()),
  },
  { additionalProperties: false, $id: "ResolvedCapabilityRemoteEvidence" },
);

export const ResolvedCapabilityEvidenceSchema = Type.Object(
  {
    runtime: Type.Optional(ResolvedCapabilityRuntimeEvidenceSchema),
    projection: Type.Optional(ResolvedCapabilityProjectionEvidenceSchema),
    provider: Type.Optional(ResolvedCapabilityProviderEvidenceSchema),
    remote: Type.Optional(ResolvedCapabilityRemoteEvidenceSchema),
  },
  { additionalProperties: false, $id: "ResolvedCapabilityEvidence" },
);

export const SkillStatusRequirementsSchema = Type.Object(
  {
    bins: Type.Array(NonEmptyString),
    anyBins: Type.Array(NonEmptyString),
    env: Type.Array(NonEmptyString),
    config: Type.Array(NonEmptyString),
    os: Type.Array(NonEmptyString),
  },
  { additionalProperties: false, $id: "SkillStatusRequirements" },
);

export const SkillStatusConfigCheckSchema = Type.Object(
  {
    path: NonEmptyString,
    satisfied: Type.Boolean(),
  },
  { additionalProperties: false, $id: "SkillStatusConfigCheck" },
);

export const SkillInstallOptionSchema = Type.Object(
  {
    id: NonEmptyString,
    kind: Type.Union([
      Type.Literal("brew"),
      Type.Literal("node"),
      Type.Literal("go"),
      Type.Literal("uv"),
      Type.Literal("download"),
    ]),
    label: NonEmptyString,
    bins: Type.Array(NonEmptyString),
  },
  { additionalProperties: false, $id: "SkillInstallOption" },
);

export const SkillRemoteSatisfiedSchema = Type.Object(
  {
    bins: Type.Array(NonEmptyString),
    anyBins: Type.Array(NonEmptyString),
    os: Type.Array(NonEmptyString),
    note: Type.Optional(Type.String()),
  },
  { additionalProperties: false, $id: "SkillRemoteSatisfied" },
);

const ResolvedSkillCapabilitySharedSchema = {
  id: NonEmptyString,
  label: NonEmptyString,
  description: Type.String(),
  kind: Type.Literal("skill"),
  runtimeContext: ResolvedCapabilityRuntimeContextSchema,
  skillKey: NonEmptyString,
  source: NonEmptyString,
  bundled: Type.Optional(Type.Boolean()),
  filePath: NonEmptyString,
  primaryEnv: Type.Optional(NonEmptyString),
  requirements: SkillStatusRequirementsSchema,
  missing: SkillStatusRequirementsSchema,
  configChecks: Type.Array(SkillStatusConfigCheckSchema),
};

export const ResolvedSkillLocalCapabilitySchema = Type.Object(
  {
    ...ResolvedSkillCapabilitySharedSchema,
    capabilityClass: Type.Literal("sandbox-local"),
    evidence: Type.Optional(ResolvedCapabilityEvidenceSchema),
  },
  { additionalProperties: false, $id: "ResolvedSkillLocalCapability" },
);

export const ResolvedSkillRemoteCapabilitySchema = Type.Object(
  {
    ...ResolvedSkillCapabilitySharedSchema,
    capabilityClass: Type.Literal("remote-node-assisted"),
    evidence: Type.Object(
      {
        remote: ResolvedCapabilityRemoteEvidenceSchema,
        runtime: Type.Optional(ResolvedCapabilityRuntimeEvidenceSchema),
        projection: Type.Optional(ResolvedCapabilityProjectionEvidenceSchema),
        provider: Type.Optional(ResolvedCapabilityProviderEvidenceSchema),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false, $id: "ResolvedSkillRemoteCapability" },
);

export const ResolvedSkillBlockedCapabilitySchema = Type.Object(
  {
    ...ResolvedSkillCapabilitySharedSchema,
    capabilityClass: Type.Literal("configured-but-blocked"),
    policy: ResolvedCapabilityPolicySchema,
    evidence: Type.Optional(ResolvedCapabilityEvidenceSchema),
  },
  { additionalProperties: false, $id: "ResolvedSkillBlockedCapability" },
);

export const ResolvedSkillUnsupportedCapabilitySchema = Type.Object(
  {
    ...ResolvedSkillCapabilitySharedSchema,
    capabilityClass: Type.Literal("unsupported-in-current-runtime"),
    evidence: Type.Object(
      {
        runtime: ResolvedCapabilityRuntimeEvidenceSchema,
        projection: Type.Optional(ResolvedCapabilityProjectionEvidenceSchema),
        provider: Type.Optional(ResolvedCapabilityProviderEvidenceSchema),
        remote: Type.Optional(ResolvedCapabilityRemoteEvidenceSchema),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false, $id: "ResolvedSkillUnsupportedCapability" },
);

export const ResolvedSkillCapabilitySchema = Type.Union(
  [
    ResolvedSkillLocalCapabilitySchema,
    ResolvedSkillRemoteCapabilitySchema,
    ResolvedSkillBlockedCapabilitySchema,
    ResolvedSkillUnsupportedCapabilitySchema,
  ],
  { $id: "ResolvedSkillCapability" },
);

const ResolvedToolCapabilitySharedSchema = {
  id: NonEmptyString,
  label: NonEmptyString,
  description: Type.String(),
  kind: Type.Literal("tool"),
  runtimeContext: ResolvedCapabilityRuntimeContextSchema,
  source: Type.Union([Type.Literal("core"), Type.Literal("plugin")]),
  pluginId: Type.Optional(NonEmptyString),
  optional: Type.Optional(Type.Boolean()),
  defaultProfiles: Type.Optional(
    Type.Array(
      Type.Union([
        Type.Literal("minimal"),
        Type.Literal("coding"),
        Type.Literal("messaging"),
        Type.Literal("full"),
      ]),
    ),
  ),
};

export const ResolvedToolLocalCapabilitySchema = Type.Object(
  {
    ...ResolvedToolCapabilitySharedSchema,
    capabilityClass: Type.Literal("sandbox-local"),
    evidence: Type.Optional(ResolvedCapabilityEvidenceSchema),
  },
  { additionalProperties: false, $id: "ResolvedToolLocalCapability" },
);

export const ResolvedToolBrokeredCapabilitySchema = Type.Object(
  {
    ...ResolvedToolCapabilitySharedSchema,
    capabilityClass: Type.Literal("gateway-brokered"),
    evidence: Type.Object(
      {
        provider: ResolvedCapabilityProviderEvidenceSchema,
        runtime: Type.Optional(ResolvedCapabilityRuntimeEvidenceSchema),
        projection: Type.Optional(ResolvedCapabilityProjectionEvidenceSchema),
        remote: Type.Optional(ResolvedCapabilityRemoteEvidenceSchema),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false, $id: "ResolvedToolBrokeredCapability" },
);

export const ResolvedToolRemoteCapabilitySchema = Type.Object(
  {
    ...ResolvedToolCapabilitySharedSchema,
    capabilityClass: Type.Literal("remote-node-assisted"),
    evidence: Type.Object(
      {
        remote: ResolvedCapabilityRemoteEvidenceSchema,
        runtime: Type.Optional(ResolvedCapabilityRuntimeEvidenceSchema),
        projection: Type.Optional(ResolvedCapabilityProjectionEvidenceSchema),
        provider: Type.Optional(ResolvedCapabilityProviderEvidenceSchema),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false, $id: "ResolvedToolRemoteCapability" },
);

export const ResolvedToolBlockedCapabilitySchema = Type.Object(
  {
    ...ResolvedToolCapabilitySharedSchema,
    capabilityClass: Type.Literal("configured-but-blocked"),
    policy: ResolvedCapabilityPolicySchema,
    evidence: Type.Optional(ResolvedCapabilityEvidenceSchema),
  },
  { additionalProperties: false, $id: "ResolvedToolBlockedCapability" },
);

export const ResolvedToolUnsupportedCapabilitySchema = Type.Object(
  {
    ...ResolvedToolCapabilitySharedSchema,
    capabilityClass: Type.Literal("unsupported-in-current-runtime"),
    evidence: Type.Object(
      {
        runtime: Type.Optional(ResolvedCapabilityRuntimeEvidenceSchema),
        projection: Type.Optional(ResolvedCapabilityProjectionEvidenceSchema),
        provider: Type.Optional(ResolvedCapabilityProviderEvidenceSchema),
        remote: Type.Optional(ResolvedCapabilityRemoteEvidenceSchema),
      },
      {
        additionalProperties: false,
        anyOf: [
          { required: ["runtime"] },
          { required: ["projection"] },
          { required: ["provider"] },
        ],
      },
    ),
  },
  { additionalProperties: false, $id: "ResolvedToolUnsupportedCapability" },
);

export const ResolvedToolCapabilitySchema = Type.Union(
  [
    ResolvedToolLocalCapabilitySchema,
    ResolvedToolBrokeredCapabilitySchema,
    ResolvedToolRemoteCapabilitySchema,
    ResolvedToolBlockedCapabilitySchema,
    ResolvedToolUnsupportedCapabilitySchema,
  ],
  { $id: "ResolvedToolCapability" },
);

export const ResolvedCapabilityManifestSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),
    runtimeContext: ResolvedCapabilityRuntimeContextSchema,
    capabilities: Type.Array(
      Type.Union([ResolvedSkillCapabilitySchema, ResolvedToolCapabilitySchema]),
    ),
  },
  { additionalProperties: false, $id: "ResolvedCapabilityManifest" },
);

export const SkillStatusEntrySchema = Type.Object(
  {
    name: NonEmptyString,
    description: Type.String(),
    source: NonEmptyString,
    bundled: Type.Boolean(),
    filePath: NonEmptyString,
    baseDir: NonEmptyString,
    skillKey: NonEmptyString,
    primaryEnv: Type.Optional(NonEmptyString),
    emoji: Type.Optional(Type.String()),
    homepage: Type.Optional(Type.String()),
    always: Type.Boolean(),
    disabled: Type.Boolean(),
    blockedByAllowlist: Type.Boolean(),
    eligible: Type.Boolean(),
    capabilityClass: ResolvedCapabilityClassSchema,
    capability: ResolvedSkillCapabilitySchema,
    requirements: SkillStatusRequirementsSchema,
    missing: SkillStatusRequirementsSchema,
    configChecks: Type.Array(SkillStatusConfigCheckSchema),
    remoteSatisfied: Type.Union([SkillRemoteSatisfiedSchema, Type.Null()]),
    install: Type.Array(SkillInstallOptionSchema),
  },
  { additionalProperties: false, $id: "SkillStatusEntry" },
);

export const SkillsStatusResultSchema = Type.Object(
  {
    workspaceDir: NonEmptyString,
    managedSkillsDir: NonEmptyString,
    skills: Type.Array(SkillStatusEntrySchema),
  },
  { additionalProperties: false, $id: "SkillsStatusResult" },
);

export const SkillsBinsParamsSchema = Type.Object({}, { additionalProperties: false });

export const SkillsBinsResultSchema = Type.Object(
  {
    bins: Type.Array(NonEmptyString),
  },
  { additionalProperties: false },
);

export const SkillsInstallParamsSchema = Type.Object(
  {
    name: NonEmptyString,
    installId: NonEmptyString,
    timeoutMs: Type.Optional(Type.Integer({ minimum: 1000 })),
  },
  { additionalProperties: false },
);

export const SkillsUpdateParamsSchema = Type.Object(
  {
    skillKey: NonEmptyString,
    enabled: Type.Optional(Type.Boolean()),
    apiKey: Type.Optional(Type.String()),
    env: Type.Optional(Type.Record(NonEmptyString, Type.String())),
  },
  { additionalProperties: false },
);

export const ToolsCatalogParamsSchema = Type.Object(
  {
    agentId: Type.Optional(NonEmptyString),
    includePlugins: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const ToolCatalogProfileSchema = Type.Object(
  {
    id: Type.Union([
      Type.Literal("minimal"),
      Type.Literal("coding"),
      Type.Literal("messaging"),
      Type.Literal("full"),
    ]),
    label: NonEmptyString,
  },
  { additionalProperties: false },
);

export const ToolCatalogEntrySchema = Type.Object(
  {
    id: NonEmptyString,
    label: NonEmptyString,
    description: Type.String(),
    source: Type.Union([Type.Literal("core"), Type.Literal("plugin")]),
    pluginId: Type.Optional(NonEmptyString),
    optional: Type.Optional(Type.Boolean()),
    defaultProfiles: Type.Array(
      Type.Union([
        Type.Literal("minimal"),
        Type.Literal("coding"),
        Type.Literal("messaging"),
        Type.Literal("full"),
      ]),
    ),
    capabilityClass: ResolvedCapabilityClassSchema,
    capability: ResolvedToolCapabilitySchema,
  },
  { additionalProperties: false },
);

export const ToolCatalogGroupSchema = Type.Object(
  {
    id: NonEmptyString,
    label: NonEmptyString,
    source: Type.Union([Type.Literal("core"), Type.Literal("plugin")]),
    pluginId: Type.Optional(NonEmptyString),
    tools: Type.Array(ToolCatalogEntrySchema),
  },
  { additionalProperties: false },
);

export const ToolsCatalogResultSchema = Type.Object(
  {
    agentId: NonEmptyString,
    profiles: Type.Array(ToolCatalogProfileSchema),
    groups: Type.Array(ToolCatalogGroupSchema),
  },
  { additionalProperties: false },
);
