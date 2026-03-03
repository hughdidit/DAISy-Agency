@file:Suppress("DEPRECATION")

package ai.openclaw.android

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import java.security.MessageDigest
import java.util.UUID

class SecurePrefs(context: Context) {
  companion object {
    val defaultWakeWords: List<String> = listOf("clawd", "claude")
    private const val displayNameKey = "node.displayName"
    private const val voiceWakeModeKey = "voiceWake.mode"
    private const val plainPrefsName = "openclaw.node"
    private const val securePrefsName = "openclaw.node.secure"
  }

  private val json = Json { ignoreUnknownKeys = true }
  private val plainPrefs: SharedPreferences =
    appContext.getSharedPreferences(plainPrefsName, Context.MODE_PRIVATE)

  private val masterKey by lazy {
    MasterKey.Builder(appContext)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()

  private val prefs =
    EncryptedSharedPreferences.create(
      context,
      "openclaw.node.secure",
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

  private val _instanceId = MutableStateFlow(loadOrCreateInstanceId())
  val instanceId: StateFlow<String> = _instanceId

  private val _displayName =
    MutableStateFlow(loadOrMigrateDisplayName(context = context))
  val displayName: StateFlow<String> = _displayName

  private val _cameraEnabled = MutableStateFlow(plainPrefs.getBoolean("camera.enabled", true))
  val cameraEnabled: StateFlow<Boolean> = _cameraEnabled

  private val _locationMode =
    MutableStateFlow(LocationMode.fromRawValue(plainPrefs.getString("location.enabledMode", "off")))
  val locationMode: StateFlow<LocationMode> = _locationMode

  private val _locationPreciseEnabled =
    MutableStateFlow(plainPrefs.getBoolean("location.preciseEnabled", true))
  val locationPreciseEnabled: StateFlow<Boolean> = _locationPreciseEnabled

  private val _preventSleep = MutableStateFlow(plainPrefs.getBoolean("screen.preventSleep", true))
  val preventSleep: StateFlow<Boolean> = _preventSleep

  private val _manualEnabled =
    MutableStateFlow(readBoolWithMigration("gateway.manual.enabled", "bridge.manual.enabled", false))
  val manualEnabled: StateFlow<Boolean> = _manualEnabled

  private val _manualHost =
    MutableStateFlow(readStringWithMigration("gateway.manual.host", "bridge.manual.host", ""))
  val manualHost: StateFlow<String> = _manualHost

  private val _manualPort =
    MutableStateFlow(readIntWithMigration("gateway.manual.port", "bridge.manual.port", 18789))
  val manualPort: StateFlow<Int> = _manualPort

  private val _manualTls =
    MutableStateFlow(readBoolWithMigration("gateway.manual.tls", null, true))
  val manualTls: StateFlow<Boolean> = _manualTls

  private val _gatewayToken = MutableStateFlow("")
  val gatewayToken: StateFlow<String> = _gatewayToken

  private val _onboardingCompleted =
    MutableStateFlow(plainPrefs.getBoolean("onboarding.completed", false))
  val onboardingCompleted: StateFlow<Boolean> = _onboardingCompleted

  private val _lastDiscoveredStableId =
    MutableStateFlow(
      readStringWithMigration(
        "gateway.lastDiscoveredStableID",
        "bridge.lastDiscoveredStableId",
        "",
      ),
    )
  val lastDiscoveredStableId: StateFlow<String> = _lastDiscoveredStableId

  private val _canvasDebugStatusEnabled =
    MutableStateFlow(plainPrefs.getBoolean("canvas.debugStatusEnabled", false))
  val canvasDebugStatusEnabled: StateFlow<Boolean> = _canvasDebugStatusEnabled

  private val _wakeWords = MutableStateFlow(loadWakeWords())
  val wakeWords: StateFlow<List<String>> = _wakeWords

  private val _voiceWakeMode = MutableStateFlow(loadVoiceWakeMode())
  val voiceWakeMode: StateFlow<VoiceWakeMode> = _voiceWakeMode

  private val _talkEnabled = MutableStateFlow(plainPrefs.getBoolean("talk.enabled", false))
  val talkEnabled: StateFlow<Boolean> = _talkEnabled

  init {
    logGatewayToken("init.gateway.manual.token", _gatewayToken.value)
  }

  fun setLastDiscoveredStableId(value: String) {
    val trimmed = value.trim()
    plainPrefs.edit { putString("gateway.lastDiscoveredStableID", trimmed) }
    _lastDiscoveredStableId.value = trimmed
  }

  fun setDisplayName(value: String) {
    val trimmed = value.trim()
    plainPrefs.edit { putString(displayNameKey, trimmed) }
    _displayName.value = trimmed
  }

  fun setCameraEnabled(value: Boolean) {
    plainPrefs.edit { putBoolean("camera.enabled", value) }
    _cameraEnabled.value = value
  }

  fun setLocationMode(mode: LocationMode) {
    plainPrefs.edit { putString("location.enabledMode", mode.rawValue) }
    _locationMode.value = mode
  }

  fun setLocationPreciseEnabled(value: Boolean) {
    plainPrefs.edit { putBoolean("location.preciseEnabled", value) }
    _locationPreciseEnabled.value = value
  }

  fun setPreventSleep(value: Boolean) {
    plainPrefs.edit { putBoolean("screen.preventSleep", value) }
    _preventSleep.value = value
  }

  fun setManualEnabled(value: Boolean) {
    plainPrefs.edit { putBoolean("gateway.manual.enabled", value) }
    _manualEnabled.value = value
  }

  fun setManualHost(value: String) {
    val trimmed = value.trim()
    plainPrefs.edit { putString("gateway.manual.host", trimmed) }
    _manualHost.value = trimmed
  }

  fun setManualPort(value: Int) {
    plainPrefs.edit { putInt("gateway.manual.port", value) }
    _manualPort.value = value
  }

  fun setManualTls(value: Boolean) {
    plainPrefs.edit { putBoolean("gateway.manual.tls", value) }
    _manualTls.value = value
  }

  fun setGatewayToken(value: String) {
    val trimmed = value.trim()
    securePrefs.edit { putString("gateway.manual.token", trimmed) }
    _gatewayToken.value = trimmed
    logGatewayToken("setGatewayToken", trimmed)
  }

  fun setGatewayPassword(value: String) {
    saveGatewayPassword(value)
  }

  fun setOnboardingCompleted(value: Boolean) {
    plainPrefs.edit { putBoolean("onboarding.completed", value) }
    _onboardingCompleted.value = value
  }

  fun setCanvasDebugStatusEnabled(value: Boolean) {
    plainPrefs.edit { putBoolean("canvas.debugStatusEnabled", value) }
    _canvasDebugStatusEnabled.value = value
  }

  fun loadGatewayToken(): String? {
    val manual = _gatewayToken.value.trim()
    if (manual.isNotEmpty()) {
      logGatewayToken("loadGatewayToken.manual", manual)
      return manual
    }
    val key = "gateway.token.${_instanceId.value}"
    val stored = prefs.getString(key, null)?.trim()
<<<<<<< HEAD:apps/android/app/src/main/java/ai/openclaw/android/SecurePrefs.kt
    if (!stored.isNullOrEmpty()) return stored
    val legacy = prefs.getString("bridge.token.${_instanceId.value}", null)?.trim()
    return legacy?.takeIf { it.isNotEmpty() }
=======
    val manual =
      _gatewayToken.value.trim().ifEmpty {
        val stored = securePrefs.getString("gateway.manual.token", null)?.trim().orEmpty()
        if (stored.isNotEmpty()) _gatewayToken.value = stored
        stored
      }
    if (manual.isNotEmpty()) return manual
    val key = "gateway.token.${_instanceId.value}"
    val stored = securePrefs.getString(key, null)?.trim()
    return stored?.takeIf { it.isNotEmpty() }
>>>>>>> b49c2cbdd (perf(android): tighten startup path and add perf tooling):apps/android/app/src/main/java/ai/openclaw/android/SecurePrefs.kt
  }

  fun saveGatewayToken(token: String) {
    val key = "gateway.token.${_instanceId.value}"
    securePrefs.edit { putString(key, token.trim()) }
  }

  fun loadGatewayPassword(): String? {
    val key = "gateway.password.${_instanceId.value}"
    val stored = securePrefs.getString(key, null)?.trim()
    return stored?.takeIf { it.isNotEmpty() }
  }

  fun saveGatewayPassword(password: String) {
    val key = "gateway.password.${_instanceId.value}"
    securePrefs.edit { putString(key, password.trim()) }
  }

  fun loadGatewayTlsFingerprint(stableId: String): String? {
    val key = "gateway.tls.$stableId"
    return plainPrefs.getString(key, null)?.trim()?.takeIf { it.isNotEmpty() }
  }

  fun saveGatewayTlsFingerprint(stableId: String, fingerprint: String) {
    val key = "gateway.tls.$stableId"
    plainPrefs.edit { putString(key, fingerprint.trim()) }
  }

  fun getString(key: String): String? {
    return securePrefs.getString(key, null)
  }

  fun putString(key: String, value: String) {
    securePrefs.edit { putString(key, value) }
  }

  fun remove(key: String) {
    securePrefs.edit { remove(key) }
  }

  private fun createSecurePrefs(context: Context, name: String): SharedPreferences {
    return EncryptedSharedPreferences.create(
      context,
      name,
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
  }

  private fun loadOrCreateInstanceId(): String {
    val existing = plainPrefs.getString("node.instanceId", null)?.trim()
    if (!existing.isNullOrBlank()) return existing
    val fresh = UUID.randomUUID().toString()
    plainPrefs.edit { putString("node.instanceId", fresh) }
    return fresh
  }

  private fun logGatewayToken(event: String, value: String) {
    val digest =
      if (value.isBlank()) {
        "empty"
      } else {
        try {
          val bytes = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
          bytes.take(4).joinToString("") { "%02x".format(it) }
        } catch (_: Throwable) {
          "hash_err"
        }
      }
    Log.i("OpenClawSecurePrefs", "$event tokenLen=${value.length} tokenSha256Prefix=$digest")
  }

  private fun loadOrMigrateDisplayName(context: Context): String {
    val existing = plainPrefs.getString(displayNameKey, null)?.trim().orEmpty()
    if (existing.isNotEmpty() && existing != "Android Node") return existing

    val candidate = DeviceNames.bestDefaultNodeName(context).trim()
    val resolved = candidate.ifEmpty { "Android Node" }

    plainPrefs.edit { putString(displayNameKey, resolved) }
    return resolved
  }

  fun setWakeWords(words: List<String>) {
    val sanitized = WakeWords.sanitize(words, defaultWakeWords)
    val encoded =
      JsonArray(sanitized.map { JsonPrimitive(it) }).toString()
    plainPrefs.edit { putString("voiceWake.triggerWords", encoded) }
    _wakeWords.value = sanitized
  }

  fun setVoiceWakeMode(mode: VoiceWakeMode) {
    plainPrefs.edit { putString(voiceWakeModeKey, mode.rawValue) }
    _voiceWakeMode.value = mode
  }

  fun setTalkEnabled(value: Boolean) {
    plainPrefs.edit { putBoolean("talk.enabled", value) }
    _talkEnabled.value = value
  }

  fun setSpeakerEnabled(value: Boolean) {
    plainPrefs.edit { putBoolean("voice.speakerEnabled", value) }
    _speakerEnabled.value = value
  }

  private fun loadVoiceWakeMode(): VoiceWakeMode {
    val raw = plainPrefs.getString(voiceWakeModeKey, null)
    val resolved = VoiceWakeMode.fromRawValue(raw)

    // Default ON (foreground) when unset.
    if (raw.isNullOrBlank()) {
      plainPrefs.edit { putString(voiceWakeModeKey, resolved.rawValue) }
    }

    return resolved
  }

  private fun loadWakeWords(): List<String> {
    val raw = plainPrefs.getString("voiceWake.triggerWords", null)?.trim()
    if (raw.isNullOrEmpty()) return defaultWakeWords
    return try {
      val element = json.parseToJsonElement(raw)
      val array = element as? JsonArray ?: return defaultWakeWords
      val decoded =
        array.mapNotNull { item ->
          when (item) {
            is JsonNull -> null
            is JsonPrimitive -> item.content.trim().takeIf { it.isNotEmpty() }
            else -> null
          }
        }
      WakeWords.sanitize(decoded, defaultWakeWords)
    } catch (_: Throwable) {
      defaultWakeWords
    }
  }

  private fun readBoolWithMigration(newKey: String, oldKey: String?, defaultValue: Boolean): Boolean {
    if (prefs.contains(newKey)) {
      return prefs.getBoolean(newKey, defaultValue)
    }
    if (oldKey != null && prefs.contains(oldKey)) {
      val value = prefs.getBoolean(oldKey, defaultValue)
      prefs.edit { putBoolean(newKey, value) }
      return value
    }
    return defaultValue
  }

  private fun readStringWithMigration(newKey: String, oldKey: String?, defaultValue: String): String {
    if (prefs.contains(newKey)) {
      return prefs.getString(newKey, defaultValue) ?: defaultValue
    }
    if (oldKey != null && prefs.contains(oldKey)) {
      val value = prefs.getString(oldKey, defaultValue) ?: defaultValue
      prefs.edit { putString(newKey, value) }
      return value
    }
    return defaultValue
  }

  private fun readIntWithMigration(newKey: String, oldKey: String?, defaultValue: Int): Int {
    if (prefs.contains(newKey)) {
      return prefs.getInt(newKey, defaultValue)
    }
    if (oldKey != null && prefs.contains(oldKey)) {
      val value = prefs.getInt(oldKey, defaultValue)
      prefs.edit { putInt(newKey, value) }
      return value
    }
    return defaultValue
  }
}
