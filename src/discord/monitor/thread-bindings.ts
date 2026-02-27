export type {
  ThreadBindingManager,
  ThreadBindingRecord,
  ThreadBindingTargetKind,
} from "./thread-bindings.types.js";

export {
  formatThreadBindingDurationLabel,
  resolveThreadBindingIntroText,
  resolveThreadBindingThreadName,
} from "./thread-bindings.messages.js";
<<<<<<< HEAD
=======
export {
  resolveThreadBindingPersona,
  resolveThreadBindingPersonaFromRecord,
} from "./thread-bindings.persona.js";

export {
  resolveDiscordThreadBindingIdleTimeoutMs,
  resolveDiscordThreadBindingMaxAgeMs,
  resolveThreadBindingsEnabled,
} from "./thread-bindings.config.js";
>>>>>>> a7929abad (Discord: thread bindings idle + max-age lifecycle (#27845) (thanks @osolmaz))

export {
  isRecentlyUnboundThreadWebhookMessage,
  resolveThreadBindingIdleTimeoutMs,
  resolveThreadBindingInactivityExpiresAt,
  resolveThreadBindingMaxAgeExpiresAt,
  resolveThreadBindingMaxAgeMs,
} from "./thread-bindings.state.js";

export {
  autoBindSpawnedDiscordSubagent,
  listThreadBindingsBySessionKey,
  listThreadBindingsForAccount,
<<<<<<< HEAD
  setThreadBindingTtlBySessionKey,
=======
  reconcileAcpThreadBindingsOnStartup,
  setThreadBindingIdleTimeoutBySessionKey,
  setThreadBindingMaxAgeBySessionKey,
>>>>>>> a7929abad (Discord: thread bindings idle + max-age lifecycle (#27845) (thanks @osolmaz))
  unbindThreadBindingsBySessionKey,
} from "./thread-bindings.lifecycle.js";

export {
  __testing,
  createNoopThreadBindingManager,
  createThreadBindingManager,
  getThreadBindingManager,
} from "./thread-bindings.manager.js";
