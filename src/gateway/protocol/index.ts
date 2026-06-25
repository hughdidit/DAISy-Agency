import AjvPkg, { type ErrorObject } from "ajv";
import type { SessionsPatchResult } from "../session-utils.types.js";
import {
  type AgentEvent,
  AgentEventSchema,
  type AgentIdentityParams,
  AgentIdentityParamsSchema,
  type AgentIdentityResult,
  AgentIdentityResultSchema,
  AgentParamsSchema,
  type AgentSummary,
  AgentSummarySchema,
  type AgentsFileEntry,
  AgentsFileEntrySchema,
  type AgentsCreateParams,
  AgentsCreateParamsSchema,
  type AgentsCreateResult,
  AgentsCreateResultSchema,
  type AgentsUpdateParams,
  AgentsUpdateParamsSchema,
  type AgentsUpdateResult,
  AgentsUpdateResultSchema,
  type AgentsDeleteParams,
  AgentsDeleteParamsSchema,
  type AgentsDeleteResult,
  AgentsDeleteResultSchema,
  type AgentsFilesGetParams,
  AgentsFilesGetParamsSchema,
  type AgentsFilesGetResult,
  AgentsFilesGetResultSchema,
  type AgentsFilesListParams,
  AgentsFilesListParamsSchema,
  type AgentsFilesListResult,
  AgentsFilesListResultSchema,
  type AgentsFilesSetParams,
  AgentsFilesSetParamsSchema,
  type AgentsFilesSetResult,
  AgentsFilesSetResultSchema,
  type AgentsWorkspaceFileDocument,
  AgentsWorkspaceFileDocumentSchema,
  type AgentsWorkspaceFileEntry,
  AgentsWorkspaceFileEntrySchema,
  type AgentsWorkspaceFilesDeleteParams,
  AgentsWorkspaceFilesDeleteParamsSchema,
  type AgentsWorkspaceFilesDeleteResult,
  AgentsWorkspaceFilesDeleteResultSchema,
  type AgentsWorkspaceFilesGetParams,
  AgentsWorkspaceFilesGetParamsSchema,
  type AgentsWorkspaceFilesGetResult,
  AgentsWorkspaceFilesGetResultSchema,
  type AgentsWorkspaceFilesListParams,
  AgentsWorkspaceFilesListParamsSchema,
  type AgentsWorkspaceFilesListResult,
  AgentsWorkspaceFilesListResultSchema,
  type AgentsWorkspaceFilesMkdirParams,
  AgentsWorkspaceFilesMkdirParamsSchema,
  type AgentsWorkspaceFilesMkdirResult,
  AgentsWorkspaceFilesMkdirResultSchema,
  type AgentsWorkspaceFilesMoveParams,
  AgentsWorkspaceFilesMoveParamsSchema,
  type AgentsWorkspaceFilesMoveResult,
  AgentsWorkspaceFilesMoveResultSchema,
  type AgentsWorkspaceFilesSetParams,
  AgentsWorkspaceFilesSetParamsSchema,
  type AgentsWorkspaceFilesSetResult,
  AgentsWorkspaceFilesSetResultSchema,
  type AgentsListParams,
  AgentsListParamsSchema,
  type AgentsListResult,
  AgentsListResultSchema,
  type AgentWaitParams,
  AgentWaitParamsSchema,
  type ChannelsLogoutParams,
  ChannelsLogoutParamsSchema,
  type TalkConfigParams,
  TalkConfigParamsSchema,
  type TalkConfigResult,
  TalkConfigResultSchema,
  type ChannelsStatusParams,
  ChannelsStatusParamsSchema,
  type ChannelsStatusResult,
  ChannelsStatusResultSchema,
  type ChatAbortParams,
  ChatAbortParamsSchema,
  type ChatEvent,
  ChatEventSchema,
  ChatHistoryParamsSchema,
  type ChatInjectParams,
  ChatInjectParamsSchema,
  ChatSendParamsSchema,
  type ConfigApplyParams,
  ConfigApplyParamsSchema,
  type DoctorRunParams,
  DoctorRunParamsSchema,
  type ConfigGetParams,
  ConfigGetParamsSchema,
  type ConfigPatchParams,
  ConfigPatchParamsSchema,
  type ConfigSchemaParams,
  ConfigSchemaParamsSchema,
  type ConfigSchemaResponse,
  ConfigSchemaResponseSchema,
  type ConfigSetParams,
  ConfigSetParamsSchema,
  type ConnectParams,
  ConnectParamsSchema,
  type CronAddParams,
  CronAddParamsSchema,
  type CronJob,
  CronJobSchema,
  type CronListParams,
  CronListParamsSchema,
  type CronRemoveParams,
  CronRemoveParamsSchema,
  type CronRunLogEntry,
  type CronRunParams,
  CronRunParamsSchema,
  type CronRunsParams,
  CronRunsParamsSchema,
  type CronStatusParams,
  CronStatusParamsSchema,
  type CronUpdateParams,
  CronUpdateParamsSchema,
  type DevicePairApproveParams,
  DevicePairApproveParamsSchema,
  type DevicePairListParams,
  DevicePairListParamsSchema,
  type DevicePairRemoveParams,
  DevicePairRemoveParamsSchema,
  type DevicePairRejectParams,
  DevicePairRejectParamsSchema,
  type DeviceTokenRevokeParams,
  DeviceTokenRevokeParamsSchema,
  type DeviceTokenRotateParams,
  DeviceTokenRotateParamsSchema,
  type ExecApprovalsGetParams,
  ExecApprovalsGetParamsSchema,
  type ExecApprovalsNodeGetParams,
  ExecApprovalsNodeGetParamsSchema,
  type ExecApprovalsNodeSetParams,
  ExecApprovalsNodeSetParamsSchema,
  type ExecApprovalsSetParams,
  ExecApprovalsSetParamsSchema,
  type ExecApprovalsSnapshot,
  type ExecApprovalRequestParams,
  ExecApprovalRequestParamsSchema,
  type ExecApprovalResolveParams,
  ExecApprovalResolveParamsSchema,
  ErrorCodes,
  type ErrorShape,
  ErrorShapeSchema,
  type EventFrame,
  EventFrameSchema,
  errorShape,
  type GatewayFrame,
  GatewayFrameSchema,
  type HelloOk,
  HelloOkSchema,
  type LogsTailParams,
  LogsTailParamsSchema,
  type LogsTailResult,
  LogsTailResultSchema,
  type ModelsListParams,
  ModelsListParamsSchema,
  type ResolvedCapabilityClass,
  ResolvedCapabilityClassSchema,
  type ResolvedCapabilityDenyReason,
  ResolvedCapabilityDenyReasonSchema,
  type ResolvedCapabilityEvidence,
  ResolvedCapabilityEvidenceSchema,
  type ResolvedCapabilityKind,
  ResolvedCapabilityKindSchema,
  type ResolvedCapabilityManifest,
  ResolvedCapabilityManifestSchema,
  type ResolvedCapabilityPolicy,
  ResolvedCapabilityPolicySchema,
  type ResolvedCapabilityPolicySource,
  ResolvedCapabilityPolicySourceSchema,
  type ResolvedCapabilityProjectionEvidence,
  ResolvedCapabilityProjectionEvidenceSchema,
  type ResolvedCapabilityProviderEvidence,
  ResolvedCapabilityProviderEvidenceSchema,
  type ResolvedCapabilityRemoteEvidence,
  ResolvedCapabilityRemoteEvidenceSchema,
  type ResolvedCapabilityRuntimeContext,
  ResolvedCapabilityRuntimeContextSchema,
  type ResolvedCapabilityRuntimeEvidence,
  ResolvedCapabilityRuntimeEvidenceSchema,
  type ResolvedCapabilityUnavailableReason,
  ResolvedCapabilityUnavailableReasonSchema,
  type ResolvedSkillBlockedCapability,
  ResolvedSkillBlockedCapabilitySchema,
  type ResolvedSkillCapability,
  ResolvedSkillCapabilitySchema,
  type ResolvedSkillLocalCapability,
  ResolvedSkillLocalCapabilitySchema,
  type ResolvedSkillRemoteCapability,
  ResolvedSkillRemoteCapabilitySchema,
  type ResolvedSkillUnsupportedCapability,
  ResolvedSkillUnsupportedCapabilitySchema,
  type ResolvedToolBlockedCapability,
  ResolvedToolBlockedCapabilitySchema,
  type ResolvedToolBrokeredCapability,
  ResolvedToolBrokeredCapabilitySchema,
  type ResolvedToolCapability,
  ResolvedToolCapabilitySchema,
  type ResolvedToolLocalCapability,
  ResolvedToolLocalCapabilitySchema,
  type ResolvedToolRemoteCapability,
  ResolvedToolRemoteCapabilitySchema,
  type ResolvedToolUnsupportedCapability,
  ResolvedToolUnsupportedCapabilitySchema,
  type SkillInstallOption,
  SkillInstallOptionSchema,
  type SkillRemoteSatisfied,
  SkillRemoteSatisfiedSchema,
  type SkillStatusConfigCheck,
  SkillStatusConfigCheckSchema,
  type SkillStatusEntry,
  SkillStatusEntrySchema,
  type SkillStatusRequirements,
  SkillStatusRequirementsSchema,
  type NodeDescribeParams,
  NodeDescribeParamsSchema,
  type NodeEventParams,
  NodeEventParamsSchema,
  type NodeInvokeParams,
  NodeInvokeParamsSchema,
  type NodeInvokeResultParams,
  NodeInvokeResultParamsSchema,
  type NodeListParams,
  NodeListParamsSchema,
  type NodePairApproveParams,
  NodePairApproveParamsSchema,
  type NodePairListParams,
  NodePairListParamsSchema,
  type NodePairRejectParams,
  NodePairRejectParamsSchema,
  type NodePairRequestParams,
  NodePairRequestParamsSchema,
  type NodePairVerifyParams,
  NodePairVerifyParamsSchema,
  type NodeRenameParams,
  NodeRenameParamsSchema,
  type PollParams,
  PollParamsSchema,
  PROTOCOL_VERSION,
  type PushTestParams,
  PushTestParamsSchema,
  PushTestResultSchema,
  type PresenceEntry,
  PresenceEntrySchema,
  ProtocolSchemas,
  type RequestFrame,
  RequestFrameSchema,
  type ResponseFrame,
  ResponseFrameSchema,
  SendParamsSchema,
  type SecretsResolveParams,
  type SecretsResolveResult,
  SecretsResolveParamsSchema,
  SecretsResolveResultSchema,
  type SessionsCompactParams,
  SessionsCompactParamsSchema,
  type SessionsDeleteParams,
  SessionsDeleteParamsSchema,
  type SessionsListParams,
  SessionsListParamsSchema,
  type SessionsPatchParams,
  SessionsPatchParamsSchema,
  type SessionsPreviewParams,
  SessionsPreviewParamsSchema,
  type SessionsResetParams,
  SessionsResetParamsSchema,
  type SessionsResolveParams,
  SessionsResolveParamsSchema,
  type SessionsUsageParams,
  SessionsUsageParamsSchema,
  type KanbanBoardGetParams,
  KanbanBoardGetParamsSchema,
  type KanbanBoardSnapshot,
  KanbanBoardSnapshotSchema,
  type KanbanCardDetail,
  KanbanCardDetailSchema,
  type KanbanCardsCreateParams,
  KanbanCardsCreateParamsSchema,
  type KanbanCardsGetParams,
  KanbanCardsGetParamsSchema,
  type KanbanCardsListParams,
  KanbanCardsListParamsSchema,
  type KanbanCardsListResult,
  KanbanCardsListResultSchema,
  type KanbanCardsMoveParams,
  KanbanCardsMoveParamsSchema,
  type KanbanCardsUpdateParams,
  KanbanCardsUpdateParamsSchema,
  type KanbanChecklistsAddItemParams,
  KanbanChecklistsAddItemParamsSchema,
  type KanbanChecklistsAddItemResult,
  KanbanChecklistsAddItemResultSchema,
  type KanbanChecklistsDeleteItemParams,
  KanbanChecklistsDeleteItemParamsSchema,
  type KanbanChecklistsDeleteItemResult,
  KanbanChecklistsDeleteItemResultSchema,
  type KanbanChecklistsUpdateItemParams,
  KanbanChecklistsUpdateItemParamsSchema,
  type KanbanChecklistsUpdateItemResult,
  KanbanChecklistsUpdateItemResultSchema,
  type KanbanCommentsAddParams,
  KanbanCommentsAddParamsSchema,
  type KanbanCommentsAddResult,
  KanbanCommentsAddResultSchema,
  type KanbanCommentsListParams,
  KanbanCommentsListParamsSchema,
  type KanbanCommentsListResult,
  KanbanCommentsListResultSchema,
  type ShutdownEvent,
  ShutdownEventSchema,
  type SkillsBinsParams,
  SkillsBinsParamsSchema,
  type SkillsBinsResult,
  type SkillsInstallParams,
  SkillsInstallParamsSchema,
  type SkillsStatusParams,
  type SkillsStatusResult,
  SkillsStatusResultSchema,
  SkillsStatusParamsSchema,
  type SkillsUpdateParams,
  SkillsUpdateParamsSchema,
  type ToolsCatalogParams,
  ToolsCatalogParamsSchema,
  type ToolsCatalogResult,
  type Snapshot,
  SnapshotSchema,
  type StateVersion,
  StateVersionSchema,
  type TalkModeParams,
  TalkModeParamsSchema,
  type TickEvent,
  TickEventSchema,
  type UpdateRunParams,
  UpdateRunParamsSchema,
  type WakeParams,
  WakeParamsSchema,
  type WebLoginStartParams,
  WebLoginStartParamsSchema,
  type WebLoginWaitParams,
  WebLoginWaitParamsSchema,
  type WizardCancelParams,
  WizardCancelParamsSchema,
  type WizardNextParams,
  WizardNextParamsSchema,
  type WizardNextResult,
  WizardNextResultSchema,
  type WizardStartParams,
  WizardStartParamsSchema,
  type WizardStartResult,
  WizardStartResultSchema,
  type WizardStatusParams,
  WizardStatusParamsSchema,
  type WizardStatusResult,
  WizardStatusResultSchema,
  type WizardStep,
  WizardStepSchema,
} from "./schema.js";

const ajv = new (AjvPkg as unknown as new (opts?: object) => import("ajv").default)({
  allErrors: true,
  strict: false,
  removeAdditional: false,
});

export const validateConnectParams = ajv.compile<ConnectParams>(ConnectParamsSchema);
export const validateRequestFrame = ajv.compile<RequestFrame>(RequestFrameSchema);
export const validateResponseFrame = ajv.compile<ResponseFrame>(ResponseFrameSchema);
export const validateEventFrame = ajv.compile<EventFrame>(EventFrameSchema);
export const validateSendParams = ajv.compile(SendParamsSchema);
export const validatePollParams = ajv.compile<PollParams>(PollParamsSchema);
export const validateAgentParams = ajv.compile(AgentParamsSchema);
export const validateAgentIdentityParams =
  ajv.compile<AgentIdentityParams>(AgentIdentityParamsSchema);
export const validateAgentWaitParams = ajv.compile<AgentWaitParams>(AgentWaitParamsSchema);
export const validateWakeParams = ajv.compile<WakeParams>(WakeParamsSchema);
export const validateAgentsListParams = ajv.compile<AgentsListParams>(AgentsListParamsSchema);
export const validateAgentsCreateParams = ajv.compile<AgentsCreateParams>(AgentsCreateParamsSchema);
export const validateAgentsUpdateParams = ajv.compile<AgentsUpdateParams>(AgentsUpdateParamsSchema);
export const validateAgentsDeleteParams = ajv.compile<AgentsDeleteParams>(AgentsDeleteParamsSchema);
export const validateAgentsFilesListParams = ajv.compile<AgentsFilesListParams>(
  AgentsFilesListParamsSchema,
);
export const validateAgentsFilesGetParams = ajv.compile<AgentsFilesGetParams>(
  AgentsFilesGetParamsSchema,
);
export const validateAgentsFilesSetParams = ajv.compile<AgentsFilesSetParams>(
  AgentsFilesSetParamsSchema,
);
export const validateAgentsWorkspaceFilesListParams = ajv.compile<AgentsWorkspaceFilesListParams>(
  AgentsWorkspaceFilesListParamsSchema,
);
export const validateAgentsWorkspaceFilesGetParams = ajv.compile<AgentsWorkspaceFilesGetParams>(
  AgentsWorkspaceFilesGetParamsSchema,
);
export const validateAgentsWorkspaceFilesSetParams = ajv.compile<AgentsWorkspaceFilesSetParams>(
  AgentsWorkspaceFilesSetParamsSchema,
);
export const validateAgentsWorkspaceFilesDeleteParams =
  ajv.compile<AgentsWorkspaceFilesDeleteParams>(AgentsWorkspaceFilesDeleteParamsSchema);
export const validateAgentsWorkspaceFilesMkdirParams = ajv.compile<AgentsWorkspaceFilesMkdirParams>(
  AgentsWorkspaceFilesMkdirParamsSchema,
);
export const validateAgentsWorkspaceFilesMoveParams = ajv.compile<AgentsWorkspaceFilesMoveParams>(
  AgentsWorkspaceFilesMoveParamsSchema,
);
export const validateNodePairRequestParams = ajv.compile<NodePairRequestParams>(
  NodePairRequestParamsSchema,
);
export const validateNodePairListParams = ajv.compile<NodePairListParams>(NodePairListParamsSchema);
export const validateNodePairApproveParams = ajv.compile<NodePairApproveParams>(
  NodePairApproveParamsSchema,
);
export const validateNodePairRejectParams = ajv.compile<NodePairRejectParams>(
  NodePairRejectParamsSchema,
);
export const validateNodePairVerifyParams = ajv.compile<NodePairVerifyParams>(
  NodePairVerifyParamsSchema,
);
export const validateNodeRenameParams = ajv.compile<NodeRenameParams>(NodeRenameParamsSchema);
export const validateNodeListParams = ajv.compile<NodeListParams>(NodeListParamsSchema);
export const validateNodeDescribeParams = ajv.compile<NodeDescribeParams>(NodeDescribeParamsSchema);
export const validateNodeInvokeParams = ajv.compile<NodeInvokeParams>(NodeInvokeParamsSchema);
export const validateNodeInvokeResultParams = ajv.compile<NodeInvokeResultParams>(
  NodeInvokeResultParamsSchema,
);
export const validateNodeEventParams = ajv.compile<NodeEventParams>(NodeEventParamsSchema);
export const validatePushTestParams = ajv.compile<PushTestParams>(PushTestParamsSchema);
export const validateSecretsResolveParams = ajv.compile<SecretsResolveParams>(
  SecretsResolveParamsSchema,
);
export const validateSecretsResolveResult = ajv.compile<SecretsResolveResult>(
  SecretsResolveResultSchema,
);
export const validateSessionsListParams = ajv.compile<SessionsListParams>(SessionsListParamsSchema);
export const validateSessionsPreviewParams = ajv.compile<SessionsPreviewParams>(
  SessionsPreviewParamsSchema,
);
export const validateSessionsResolveParams = ajv.compile<SessionsResolveParams>(
  SessionsResolveParamsSchema,
);
export const validateSessionsPatchParams =
  ajv.compile<SessionsPatchParams>(SessionsPatchParamsSchema);
export const validateSessionsResetParams =
  ajv.compile<SessionsResetParams>(SessionsResetParamsSchema);
export const validateSessionsDeleteParams = ajv.compile<SessionsDeleteParams>(
  SessionsDeleteParamsSchema,
);
export const validateSessionsCompactParams = ajv.compile<SessionsCompactParams>(
  SessionsCompactParamsSchema,
);
export const validateSessionsUsageParams =
  ajv.compile<SessionsUsageParams>(SessionsUsageParamsSchema);
export const validateKanbanBoardGetParams = ajv.compile<KanbanBoardGetParams>(
  KanbanBoardGetParamsSchema,
);
export const validateKanbanBoardSnapshot =
  ajv.compile<KanbanBoardSnapshot>(KanbanBoardSnapshotSchema);
export const validateKanbanCardsListParams = ajv.compile<KanbanCardsListParams>(
  KanbanCardsListParamsSchema,
);
export const validateKanbanCardsListResult = ajv.compile<KanbanCardsListResult>(
  KanbanCardsListResultSchema,
);
export const validateKanbanCardsGetParams = ajv.compile<KanbanCardsGetParams>(
  KanbanCardsGetParamsSchema,
);
export const validateKanbanCardDetail = ajv.compile<KanbanCardDetail>(KanbanCardDetailSchema);
export const validateKanbanCardsCreateParams = ajv.compile<KanbanCardsCreateParams>(
  KanbanCardsCreateParamsSchema,
);
export const validateKanbanCardsUpdateParams = ajv.compile<KanbanCardsUpdateParams>(
  KanbanCardsUpdateParamsSchema,
);
export const validateKanbanCardsMoveParams = ajv.compile<KanbanCardsMoveParams>(
  KanbanCardsMoveParamsSchema,
);
export const validateKanbanChecklistsAddItemParams = ajv.compile<KanbanChecklistsAddItemParams>(
  KanbanChecklistsAddItemParamsSchema,
);
export const validateKanbanChecklistsAddItemResult = ajv.compile<KanbanChecklistsAddItemResult>(
  KanbanChecklistsAddItemResultSchema,
);
export const validateKanbanChecklistsUpdateItemParams =
  ajv.compile<KanbanChecklistsUpdateItemParams>(KanbanChecklistsUpdateItemParamsSchema);
export const validateKanbanChecklistsUpdateItemResult =
  ajv.compile<KanbanChecklistsUpdateItemResult>(KanbanChecklistsUpdateItemResultSchema);
export const validateKanbanChecklistsDeleteItemParams =
  ajv.compile<KanbanChecklistsDeleteItemParams>(KanbanChecklistsDeleteItemParamsSchema);
export const validateKanbanChecklistsDeleteItemResult =
  ajv.compile<KanbanChecklistsDeleteItemResult>(KanbanChecklistsDeleteItemResultSchema);
export const validateKanbanCommentsListParams = ajv.compile<KanbanCommentsListParams>(
  KanbanCommentsListParamsSchema,
);
export const validateKanbanCommentsListResult = ajv.compile<KanbanCommentsListResult>(
  KanbanCommentsListResultSchema,
);
export const validateKanbanCommentsAddParams = ajv.compile<KanbanCommentsAddParams>(
  KanbanCommentsAddParamsSchema,
);
export const validateKanbanCommentsAddResult = ajv.compile<KanbanCommentsAddResult>(
  KanbanCommentsAddResultSchema,
);
export const validateConfigGetParams = ajv.compile<ConfigGetParams>(ConfigGetParamsSchema);
export const validateConfigSetParams = ajv.compile<ConfigSetParams>(ConfigSetParamsSchema);
export const validateConfigApplyParams = ajv.compile<ConfigApplyParams>(ConfigApplyParamsSchema);
export const validateConfigPatchParams = ajv.compile<ConfigPatchParams>(ConfigPatchParamsSchema);
export const validateDoctorRunParams = ajv.compile<DoctorRunParams>(DoctorRunParamsSchema);
export const validateConfigSchemaParams = ajv.compile<ConfigSchemaParams>(ConfigSchemaParamsSchema);
export const validateWizardStartParams = ajv.compile<WizardStartParams>(WizardStartParamsSchema);
export const validateWizardNextParams = ajv.compile<WizardNextParams>(WizardNextParamsSchema);
export const validateWizardCancelParams = ajv.compile<WizardCancelParams>(WizardCancelParamsSchema);
export const validateWizardStatusParams = ajv.compile<WizardStatusParams>(WizardStatusParamsSchema);
export const validateTalkModeParams = ajv.compile<TalkModeParams>(TalkModeParamsSchema);
export const validateTalkConfigParams = ajv.compile<TalkConfigParams>(TalkConfigParamsSchema);
export const validateChannelsStatusParams = ajv.compile<ChannelsStatusParams>(
  ChannelsStatusParamsSchema,
);
export const validateChannelsLogoutParams = ajv.compile<ChannelsLogoutParams>(
  ChannelsLogoutParamsSchema,
);
export const validateModelsListParams = ajv.compile<ModelsListParams>(ModelsListParamsSchema);
export const validateSkillsStatusParams = ajv.compile<SkillsStatusParams>(SkillsStatusParamsSchema);
export const validateToolsCatalogParams = ajv.compile<ToolsCatalogParams>(ToolsCatalogParamsSchema);
export const validateSkillsBinsParams = ajv.compile<SkillsBinsParams>(SkillsBinsParamsSchema);
export const validateSkillsInstallParams =
  ajv.compile<SkillsInstallParams>(SkillsInstallParamsSchema);
export const validateSkillsUpdateParams = ajv.compile<SkillsUpdateParams>(SkillsUpdateParamsSchema);
export const validateCronListParams = ajv.compile<CronListParams>(CronListParamsSchema);
export const validateCronStatusParams = ajv.compile<CronStatusParams>(CronStatusParamsSchema);
export const validateCronAddParams = ajv.compile<CronAddParams>(CronAddParamsSchema);
export const validateCronUpdateParams = ajv.compile<CronUpdateParams>(CronUpdateParamsSchema);
export const validateCronRemoveParams = ajv.compile<CronRemoveParams>(CronRemoveParamsSchema);
export const validateCronRunParams = ajv.compile<CronRunParams>(CronRunParamsSchema);
export const validateCronRunsParams = ajv.compile<CronRunsParams>(CronRunsParamsSchema);
export const validateDevicePairListParams = ajv.compile<DevicePairListParams>(
  DevicePairListParamsSchema,
);
export const validateDevicePairApproveParams = ajv.compile<DevicePairApproveParams>(
  DevicePairApproveParamsSchema,
);
export const validateDevicePairRejectParams = ajv.compile<DevicePairRejectParams>(
  DevicePairRejectParamsSchema,
);
export const validateDevicePairRemoveParams = ajv.compile<DevicePairRemoveParams>(
  DevicePairRemoveParamsSchema,
);
export const validateDeviceTokenRotateParams = ajv.compile<DeviceTokenRotateParams>(
  DeviceTokenRotateParamsSchema,
);
export const validateDeviceTokenRevokeParams = ajv.compile<DeviceTokenRevokeParams>(
  DeviceTokenRevokeParamsSchema,
);
export const validateExecApprovalsGetParams = ajv.compile<ExecApprovalsGetParams>(
  ExecApprovalsGetParamsSchema,
);
export const validateExecApprovalsSetParams = ajv.compile<ExecApprovalsSetParams>(
  ExecApprovalsSetParamsSchema,
);
export const validateExecApprovalRequestParams = ajv.compile<ExecApprovalRequestParams>(
  ExecApprovalRequestParamsSchema,
);
export const validateExecApprovalResolveParams = ajv.compile<ExecApprovalResolveParams>(
  ExecApprovalResolveParamsSchema,
);
export const validateExecApprovalsNodeGetParams = ajv.compile<ExecApprovalsNodeGetParams>(
  ExecApprovalsNodeGetParamsSchema,
);
export const validateExecApprovalsNodeSetParams = ajv.compile<ExecApprovalsNodeSetParams>(
  ExecApprovalsNodeSetParamsSchema,
);
export const validateLogsTailParams = ajv.compile<LogsTailParams>(LogsTailParamsSchema);
export const validateChatHistoryParams = ajv.compile(ChatHistoryParamsSchema);
export const validateChatSendParams = ajv.compile(ChatSendParamsSchema);
export const validateChatAbortParams = ajv.compile<ChatAbortParams>(ChatAbortParamsSchema);
export const validateChatInjectParams = ajv.compile<ChatInjectParams>(ChatInjectParamsSchema);
export const validateChatEvent = ajv.compile(ChatEventSchema);
export const validateUpdateRunParams = ajv.compile<UpdateRunParams>(UpdateRunParamsSchema);
export const validateWebLoginStartParams =
  ajv.compile<WebLoginStartParams>(WebLoginStartParamsSchema);
export const validateWebLoginWaitParams = ajv.compile<WebLoginWaitParams>(WebLoginWaitParamsSchema);

export function formatValidationErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors?.length) {
    return "unknown validation error";
  }

  const parts: string[] = [];

  for (const err of errors) {
    const keyword = typeof err?.keyword === "string" ? err.keyword : "";
    const instancePath = typeof err?.instancePath === "string" ? err.instancePath : "";

    if (keyword === "additionalProperties") {
      const params = err?.params as { additionalProperty?: unknown } | undefined;
      const additionalProperty = params?.additionalProperty;
      if (typeof additionalProperty === "string" && additionalProperty.trim()) {
        const where = instancePath ? `at ${instancePath}` : "at root";
        parts.push(`${where}: unexpected property '${additionalProperty}'`);
        continue;
      }
    }

    const message =
      typeof err?.message === "string" && err.message.trim() ? err.message : "validation error";
    const where = instancePath ? `at ${instancePath}: ` : "";
    parts.push(`${where}${message}`);
  }

  // De-dupe while preserving order.
  const unique = Array.from(new Set(parts.filter((part) => part.trim())));
  if (!unique.length) {
    const fallback = ajv.errorsText(errors, { separator: "; " });
    return fallback || "unknown validation error";
  }
  return unique.join("; ");
}

export {
  ConnectParamsSchema,
  HelloOkSchema,
  RequestFrameSchema,
  ResponseFrameSchema,
  EventFrameSchema,
  GatewayFrameSchema,
  PresenceEntrySchema,
  SnapshotSchema,
  ErrorShapeSchema,
  StateVersionSchema,
  AgentEventSchema,
  ChatEventSchema,
  SendParamsSchema,
  PollParamsSchema,
  AgentParamsSchema,
  AgentIdentityParamsSchema,
  AgentIdentityResultSchema,
  WakeParamsSchema,
  PushTestParamsSchema,
  PushTestResultSchema,
  NodePairRequestParamsSchema,
  NodePairListParamsSchema,
  NodePairApproveParamsSchema,
  NodePairRejectParamsSchema,
  NodePairVerifyParamsSchema,
  NodeListParamsSchema,
  NodeInvokeParamsSchema,
  SessionsListParamsSchema,
  SessionsPreviewParamsSchema,
  SessionsPatchParamsSchema,
  SessionsResetParamsSchema,
  SessionsDeleteParamsSchema,
  SessionsCompactParamsSchema,
  SessionsUsageParamsSchema,
  ConfigGetParamsSchema,
  ConfigSetParamsSchema,
  ConfigApplyParamsSchema,
  ConfigPatchParamsSchema,
  DoctorRunParamsSchema,
  ConfigSchemaParamsSchema,
  ConfigSchemaResponseSchema,
  WizardStartParamsSchema,
  WizardNextParamsSchema,
  WizardCancelParamsSchema,
  WizardStatusParamsSchema,
  WizardStepSchema,
  WizardNextResultSchema,
  WizardStartResultSchema,
  WizardStatusResultSchema,
  TalkConfigParamsSchema,
  TalkConfigResultSchema,
  ChannelsStatusParamsSchema,
  ChannelsStatusResultSchema,
  ChannelsLogoutParamsSchema,
  WebLoginStartParamsSchema,
  WebLoginWaitParamsSchema,
  AgentSummarySchema,
  AgentsFileEntrySchema,
  AgentsCreateParamsSchema,
  AgentsCreateResultSchema,
  AgentsUpdateParamsSchema,
  AgentsUpdateResultSchema,
  AgentsDeleteParamsSchema,
  AgentsDeleteResultSchema,
  AgentsFilesListParamsSchema,
  AgentsFilesListResultSchema,
  AgentsFilesGetParamsSchema,
  AgentsFilesGetResultSchema,
  AgentsFilesSetParamsSchema,
  AgentsFilesSetResultSchema,
  AgentsWorkspaceFileDocumentSchema,
  AgentsWorkspaceFileEntrySchema,
  AgentsWorkspaceFilesDeleteResultSchema,
  AgentsWorkspaceFilesGetResultSchema,
  AgentsWorkspaceFilesListResultSchema,
  AgentsWorkspaceFilesMkdirResultSchema,
  AgentsWorkspaceFilesMoveResultSchema,
  AgentsWorkspaceFilesSetResultSchema,
  AgentsListParamsSchema,
  AgentsListResultSchema,
  ModelsListParamsSchema,
  ResolvedCapabilityClassSchema,
  ResolvedCapabilityKindSchema,
  ResolvedCapabilityDenyReasonSchema,
  ResolvedCapabilityUnavailableReasonSchema,
  ResolvedCapabilityRuntimeContextSchema,
  ResolvedCapabilityPolicySourceSchema,
  ResolvedCapabilityPolicySchema,
  ResolvedCapabilityRuntimeEvidenceSchema,
  ResolvedCapabilityProjectionEvidenceSchema,
  ResolvedCapabilityProviderEvidenceSchema,
  ResolvedCapabilityRemoteEvidenceSchema,
  ResolvedCapabilityEvidenceSchema,
  SkillStatusRequirementsSchema,
  SkillStatusConfigCheckSchema,
  SkillInstallOptionSchema,
  SkillRemoteSatisfiedSchema,
  ResolvedSkillLocalCapabilitySchema,
  ResolvedSkillRemoteCapabilitySchema,
  ResolvedSkillBlockedCapabilitySchema,
  ResolvedSkillUnsupportedCapabilitySchema,
  ResolvedSkillCapabilitySchema,
  ResolvedToolLocalCapabilitySchema,
  ResolvedToolBrokeredCapabilitySchema,
  ResolvedToolRemoteCapabilitySchema,
  ResolvedToolBlockedCapabilitySchema,
  ResolvedToolUnsupportedCapabilitySchema,
  ResolvedToolCapabilitySchema,
  ResolvedCapabilityManifestSchema,
  SkillStatusEntrySchema,
  SkillsStatusParamsSchema,
  SkillsStatusResultSchema,
  ToolsCatalogParamsSchema,
  SkillsInstallParamsSchema,
  SkillsUpdateParamsSchema,
  CronJobSchema,
  CronListParamsSchema,
  CronStatusParamsSchema,
  CronAddParamsSchema,
  CronUpdateParamsSchema,
  CronRemoveParamsSchema,
  CronRunParamsSchema,
  CronRunsParamsSchema,
  LogsTailParamsSchema,
  LogsTailResultSchema,
  ChatHistoryParamsSchema,
  ChatSendParamsSchema,
  ChatInjectParamsSchema,
  UpdateRunParamsSchema,
  TickEventSchema,
  ShutdownEventSchema,
  ProtocolSchemas,
  PROTOCOL_VERSION,
  ErrorCodes,
  errorShape,
};

export type {
  GatewayFrame,
  ConnectParams,
  HelloOk,
  RequestFrame,
  ResponseFrame,
  EventFrame,
  PresenceEntry,
  Snapshot,
  ErrorShape,
  StateVersion,
  AgentEvent,
  AgentIdentityParams,
  AgentIdentityResult,
  AgentWaitParams,
  ChatEvent,
  TickEvent,
  ShutdownEvent,
  WakeParams,
  NodePairRequestParams,
  NodePairListParams,
  NodePairApproveParams,
  DevicePairListParams,
  DevicePairApproveParams,
  DevicePairRejectParams,
  ConfigGetParams,
  ConfigSetParams,
  ConfigApplyParams,
  ConfigPatchParams,
  DoctorRunParams,
  ConfigSchemaParams,
  ConfigSchemaResponse,
  WizardStartParams,
  WizardNextParams,
  WizardCancelParams,
  WizardStatusParams,
  WizardStep,
  WizardNextResult,
  WizardStartResult,
  WizardStatusResult,
  TalkConfigParams,
  TalkConfigResult,
  TalkModeParams,
  ChannelsStatusParams,
  ChannelsStatusResult,
  ChannelsLogoutParams,
  WebLoginStartParams,
  WebLoginWaitParams,
  AgentSummary,
  AgentsFileEntry,
  AgentsCreateParams,
  AgentsCreateResult,
  AgentsUpdateParams,
  AgentsUpdateResult,
  AgentsDeleteParams,
  AgentsDeleteResult,
  AgentsFilesListParams,
  AgentsFilesListResult,
  AgentsFilesGetParams,
  AgentsFilesGetResult,
  AgentsFilesSetParams,
  AgentsFilesSetResult,
  AgentsWorkspaceFileDocument,
  AgentsWorkspaceFileEntry,
  AgentsWorkspaceFilesDeleteResult,
  AgentsWorkspaceFilesGetResult,
  AgentsWorkspaceFilesListResult,
  AgentsWorkspaceFilesMkdirResult,
  AgentsWorkspaceFilesMoveResult,
  AgentsWorkspaceFilesSetResult,
  AgentsListParams,
  AgentsListResult,
  ResolvedCapabilityClass,
  ResolvedCapabilityKind,
  ResolvedCapabilityDenyReason,
  ResolvedCapabilityUnavailableReason,
  ResolvedCapabilityRuntimeContext,
  ResolvedCapabilityPolicySource,
  ResolvedCapabilityPolicy,
  ResolvedCapabilityRuntimeEvidence,
  ResolvedCapabilityProjectionEvidence,
  ResolvedCapabilityProviderEvidence,
  ResolvedCapabilityRemoteEvidence,
  ResolvedCapabilityEvidence,
  SkillStatusRequirements,
  SkillStatusConfigCheck,
  SkillInstallOption,
  SkillRemoteSatisfied,
  ResolvedSkillLocalCapability,
  ResolvedSkillRemoteCapability,
  ResolvedSkillBlockedCapability,
  ResolvedSkillUnsupportedCapability,
  ResolvedSkillCapability,
  ResolvedToolLocalCapability,
  ResolvedToolBrokeredCapability,
  ResolvedToolRemoteCapability,
  ResolvedToolBlockedCapability,
  ResolvedToolUnsupportedCapability,
  ResolvedToolCapability,
  ResolvedCapabilityManifest,
  SkillStatusEntry,
  SkillsStatusParams,
  SkillsStatusResult,
  ToolsCatalogParams,
  ToolsCatalogResult,
  SkillsBinsParams,
  SkillsBinsResult,
  SkillsInstallParams,
  SkillsUpdateParams,
  NodePairRejectParams,
  NodePairVerifyParams,
  NodeListParams,
  NodeInvokeParams,
  NodeInvokeResultParams,
  NodeEventParams,
  SessionsListParams,
  SessionsPreviewParams,
  SessionsResolveParams,
  SessionsPatchParams,
  SessionsPatchResult,
  SessionsResetParams,
  SessionsDeleteParams,
  SessionsCompactParams,
  SessionsUsageParams,
  CronJob,
  CronListParams,
  CronStatusParams,
  CronAddParams,
  CronUpdateParams,
  CronRemoveParams,
  CronRunParams,
  CronRunsParams,
  CronRunLogEntry,
  ExecApprovalsGetParams,
  ExecApprovalsSetParams,
  ExecApprovalsSnapshot,
  LogsTailParams,
  LogsTailResult,
  PollParams,
  UpdateRunParams,
  ChatInjectParams,
};
