package ai.openclaw.android.node

import android.os.Build
import ai.openclaw.android.BuildConfig
import ai.openclaw.android.SecurePrefs
import ai.openclaw.android.gateway.GatewayClientInfo
import ai.openclaw.android.gateway.GatewayConnectOptions
import ai.openclaw.android.gateway.GatewayEndpoint
import ai.openclaw.android.gateway.GatewayTlsParams
import ai.openclaw.android.LocationMode
import ai.openclaw.android.VoiceWakeMode

class ConnectionManager(
  private val prefs: SecurePrefs,
  private val cameraEnabled: () -> Boolean,
  private val locationMode: () -> LocationMode,
  private val voiceWakeMode: () -> VoiceWakeMode,
  private val motionActivityAvailable: () -> Boolean,
  private val motionPedometerAvailable: () -> Boolean,
  private val smsAvailable: () -> Boolean,
  private val hasRecordAudioPermission: () -> Boolean,
  private val manualTls: () -> Boolean,
) {
<<<<<<< HEAD
  fun buildInvokeCommands(): List<String> =
    InvokeCommandRegistry.advertisedCommands(
=======
  companion object {
    internal fun resolveTlsParamsForEndpoint(
      endpoint: GatewayEndpoint,
      storedFingerprint: String?,
      manualTlsEnabled: Boolean,
    ): GatewayTlsParams? {
      val stableId = endpoint.stableId
      val stored = storedFingerprint?.trim().takeIf { !it.isNullOrEmpty() }
      val isManual = stableId.startsWith("manual|")

      if (isManual) {
        if (!manualTlsEnabled) return null
        if (!stored.isNullOrBlank()) {
          return GatewayTlsParams(
            required = true,
            expectedFingerprint = stored,
            allowTOFU = false,
            stableId = stableId,
          )
        }
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      // Prefer stored pins. Never let discovery-provided TXT override a stored fingerprint.
      if (!stored.isNullOrBlank()) {
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = stored,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      val hinted = endpoint.tlsEnabled || !endpoint.tlsFingerprintSha256.isNullOrBlank()
      if (hinted) {
        // TXT is unauthenticated. Do not treat the advertised fingerprint as authoritative.
        return GatewayTlsParams(
          required = true,
          expectedFingerprint = null,
          allowTOFU = false,
          stableId = stableId,
        )
      }

      return null
    }
  }

  private fun runtimeFlags(): NodeRuntimeFlags =
    NodeRuntimeFlags(
>>>>>>> 3f06693e7 (refactor(android): share node capability and command manifest)
      cameraEnabled = cameraEnabled(),
      locationEnabled = locationMode() != LocationMode.Off,
      smsAvailable = smsAvailable(),
      voiceWakeEnabled = voiceWakeMode() != VoiceWakeMode.Off && hasRecordAudioPermission(),
      motionActivityAvailable = motionActivityAvailable(),
      motionPedometerAvailable = motionPedometerAvailable(),
      debugBuild = BuildConfig.DEBUG,
    )

  fun buildInvokeCommands(): List<String> = InvokeCommandRegistry.advertisedCommands(runtimeFlags())

  fun buildCapabilities(): List<String> = InvokeCommandRegistry.advertisedCapabilities(runtimeFlags())

  fun resolvedVersionName(): String {
    val versionName = BuildConfig.VERSION_NAME.trim().ifEmpty { "dev" }
    return if (BuildConfig.DEBUG && !versionName.contains("dev", ignoreCase = true)) {
      "$versionName-dev"
    } else {
      versionName
    }
  }

  fun resolveModelIdentifier(): String? {
    return listOfNotNull(Build.MANUFACTURER, Build.MODEL)
      .joinToString(" ")
      .trim()
      .ifEmpty { null }
  }

  fun buildUserAgent(): String {
    val version = resolvedVersionName()
    val release = Build.VERSION.RELEASE?.trim().orEmpty()
    val releaseLabel = if (release.isEmpty()) "unknown" else release
    return "OpenClawAndroid/$version (Android $releaseLabel; SDK ${Build.VERSION.SDK_INT})"
  }

  fun buildClientInfo(clientId: String, clientMode: String): GatewayClientInfo {
    return GatewayClientInfo(
      id = clientId,
      displayName = prefs.displayName.value,
      version = resolvedVersionName(),
      platform = "android",
      mode = clientMode,
      instanceId = prefs.instanceId.value,
      deviceFamily = "Android",
      modelIdentifier = resolveModelIdentifier(),
    )
  }

  fun buildNodeConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "node",
      scopes = emptyList(),
      caps = buildCapabilities(),
      commands = buildInvokeCommands(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "openclaw-android", clientMode = "node"),
      userAgent = buildUserAgent(),
    )
  }

  fun buildOperatorConnectOptions(): GatewayConnectOptions {
    return GatewayConnectOptions(
      role = "operator",
      scopes = emptyList(),
      caps = emptyList(),
      commands = emptyList(),
      permissions = emptyMap(),
      client = buildClientInfo(clientId = "openclaw-android", clientMode = "ui"),
      userAgent = buildUserAgent(),
    )
  }

  fun resolveTlsParams(endpoint: GatewayEndpoint): GatewayTlsParams? {
    val stored = prefs.loadGatewayTlsFingerprint(endpoint.stableId)
    val hinted = endpoint.tlsEnabled || !endpoint.tlsFingerprintSha256.isNullOrBlank()
    val manual = endpoint.stableId.startsWith("manual|")

    if (manual) {
      if (!manualTls()) return null
      return GatewayTlsParams(
        required = true,
        expectedFingerprint = endpoint.tlsFingerprintSha256 ?: stored,
        allowTOFU = stored == null,
        stableId = endpoint.stableId,
      )
    }

    if (hinted) {
      return GatewayTlsParams(
        required = true,
        expectedFingerprint = endpoint.tlsFingerprintSha256 ?: stored,
        allowTOFU = stored == null,
        stableId = endpoint.stableId,
      )
    }

    if (!stored.isNullOrBlank()) {
      return GatewayTlsParams(
        required = true,
        expectedFingerprint = stored,
        allowTOFU = false,
        stableId = endpoint.stableId,
      )
    }

    return null
  }
}
