<<<<<<< HEAD
<<<<<<< HEAD
import MoltbotKit
import OpenClawKit
import AVFoundation
import CoreLocation
>>>>>>> b17e6fdd0 (iOS: align node permissions and notifications)
=======
import OpenClawKit
>>>>>>> 4ab814fd5 (Revert "iOS: wire node services and tests")
import Darwin
import Foundation
import Network
import Observation
import SwiftUI
import UIKit

@MainActor
@Observable
final class GatewayConnectionController {
    private(set) var gateways: [GatewayDiscoveryModel.DiscoveredGateway] = []
    private(set) var discoveryStatusText: String = "Idle"
    private(set) var discoveryDebugLog: [GatewayDiscoveryModel.DebugLogEntry] = []

    private let discovery = GatewayDiscoveryModel()
    private weak var appModel: NodeAppModel?
    private var didAutoConnect = false

    init(appModel: NodeAppModel, startDiscovery: Bool = true) {
        self.appModel = appModel

        GatewaySettingsStore.bootstrapPersistence()
        let defaults = UserDefaults.standard
        self.discovery.setDebugLoggingEnabled(defaults.bool(forKey: "gateway.discovery.debugLogs"))

        self.updateFromDiscovery()
        self.observeDiscovery()

        if startDiscovery {
            self.discovery.start()
        }
    }

    func setDiscoveryDebugLoggingEnabled(_ enabled: Bool) {
        self.discovery.setDebugLoggingEnabled(enabled)
    }

    func setScenePhase(_ phase: ScenePhase) {
        switch phase {
        case .background:
            self.discovery.stop()
        case .active, .inactive:
            self.discovery.start()
        @unknown default:
            self.discovery.start()
        }
    }

    func connect(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) async {
        let instanceId = UserDefaults.standard.string(forKey: "node.instanceId")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let token = GatewaySettingsStore.loadGatewayToken(instanceId: instanceId)
        let password = GatewaySettingsStore.loadGatewayPassword(instanceId: instanceId)
        guard let host = self.resolveGatewayHost(gateway) else { return }
        let port = gateway.gatewayPort ?? 18789
        let tlsParams = self.resolveDiscoveredTLSParams(gateway: gateway)
        guard let url = self.buildGatewayURL(
            host: host,
            port: port,
            useTLS: tlsParams?.required == true)
        else { return }
        self.didAutoConnect = true
        self.startAutoConnect(
            url: url,
            gatewayStableID: gateway.stableID,
            tls: tlsParams,
            token: token,
            password: password)
    }

    func connectManual(host: String, port: Int, useTLS: Bool) async {
        let instanceId = UserDefaults.standard.string(forKey: "node.instanceId")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let token = GatewaySettingsStore.loadGatewayToken(instanceId: instanceId)
        let password = GatewaySettingsStore.loadGatewayPassword(instanceId: instanceId)
        let stableID = self.manualStableID(host: host, port: port)
        let tlsParams = self.resolveManualTLSParams(stableID: stableID, tlsEnabled: useTLS)
        guard let url = self.buildGatewayURL(
            host: host,
            port: port,
            useTLS: tlsParams?.required == true)
        else { return }
        self.didAutoConnect = true
        self.startAutoConnect(
            url: url,
            gatewayStableID: stableID,
            tls: tlsParams,
            token: token,
            password: password)
    }

    func connectLastKnown() async {
        guard let last = GatewaySettingsStore.loadLastGatewayConnection() else { return }
        switch last {
        case let .manual(host, port, useTLS, _):
            await self.connectManual(host: host, port: port, useTLS: useTLS)
        case let .discovered(stableID, _):
            guard let gateway = self.gateways.first(where: { $0.stableID == stableID }) else { return }
            _ = await self.connectDiscoveredGateway(gateway)
        }
    }

    /// Rebuild connect options from current local settings (caps/commands/permissions)
    /// and re-apply the active gateway config so capability changes take effect immediately.
    func refreshActiveGatewayRegistrationFromSettings() {
        guard let appModel else { return }
        guard let cfg = appModel.activeGatewayConnectConfig else { return }
        guard appModel.gatewayAutoReconnectEnabled else { return }

        let refreshedConfig = GatewayConnectConfig(
            url: cfg.url,
            stableID: cfg.stableID,
            tls: cfg.tls,
            token: cfg.token,
            password: cfg.password,
            nodeOptions: self.makeConnectOptions(stableID: cfg.stableID))
        appModel.applyGatewayConnectConfig(refreshedConfig)
    }

    func clearPendingTrustPrompt() {
        self.pendingTrustPrompt = nil
        self.pendingTrustConnect = nil
    }

    func acceptPendingTrustPrompt() async {
        guard let pending = self.pendingTrustConnect,
              let prompt = self.pendingTrustPrompt,
              pending.stableID == prompt.stableID
        else { return }

        GatewayTLSStore.saveFingerprint(prompt.fingerprintSha256, stableID: pending.stableID)
        self.clearPendingTrustPrompt()

        if pending.isManual {
            GatewaySettingsStore.saveLastGatewayConnectionManual(
                host: prompt.host,
                port: prompt.port,
                useTLS: true,
                stableID: pending.stableID)
        } else {
            GatewaySettingsStore.saveLastGatewayConnectionDiscovered(stableID: pending.stableID, useTLS: true)
        }

        let instanceId = UserDefaults.standard.string(forKey: "node.instanceId")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let token = GatewaySettingsStore.loadGatewayToken(instanceId: instanceId)
        let password = GatewaySettingsStore.loadGatewayPassword(instanceId: instanceId)
        let tlsParams = GatewayTLSParams(
            required: true,
            expectedFingerprint: prompt.fingerprintSha256,
            allowTOFU: false,
            storeKey: pending.stableID)

        self.didAutoConnect = true
        self.startAutoConnect(
            url: pending.url,
            gatewayStableID: pending.stableID,
            tls: tlsParams,
            token: token,
            password: password)
    }

    func declinePendingTrustPrompt() {
        self.clearPendingTrustPrompt()
        self.appModel?.gatewayStatusText = "Offline"
    }

    private func updateFromDiscovery() {
        let newGateways = self.discovery.gateways
        self.gateways = newGateways
        self.discoveryStatusText = self.discovery.statusText
        self.discoveryDebugLog = self.discovery.debugLog
        self.updateLastDiscoveredGateway(from: newGateways)
        self.maybeAutoConnect()
    }

    private func observeDiscovery() {
        withObservationTracking {
            _ = self.discovery.gateways
            _ = self.discovery.statusText
            _ = self.discovery.debugLog
        } onChange: { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.updateFromDiscovery()
                self.observeDiscovery()
            }
        }
    }

    private func maybeAutoConnect() {
        guard !self.didAutoConnect else { return }
        guard let appModel = self.appModel else { return }
        guard appModel.gatewayServerName == nil else { return }

        let defaults = UserDefaults.standard
        let manualEnabled = defaults.bool(forKey: "gateway.manual.enabled")

        let instanceId = defaults.string(forKey: "node.instanceId")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !instanceId.isEmpty else { return }

        let token = GatewaySettingsStore.loadGatewayToken(instanceId: instanceId)
        let password = GatewaySettingsStore.loadGatewayPassword(instanceId: instanceId)

        if manualEnabled {
            let manualHost = defaults.string(forKey: "gateway.manual.host")?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !manualHost.isEmpty else { return }

            let manualPort = defaults.integer(forKey: "gateway.manual.port")
            let resolvedPort = manualPort > 0 ? manualPort : 18789
            let manualTLS = defaults.bool(forKey: "gateway.manual.tls")

            let stableID = self.manualStableID(host: manualHost, port: resolvedPort)
            let tlsParams = self.resolveManualTLSParams(stableID: stableID, tlsEnabled: manualTLS)

            guard let url = self.buildGatewayURL(
                host: manualHost,
                port: resolvedPort,
                useTLS: tlsParams?.required == true)
            else { return }

            self.didAutoConnect = true
            self.startAutoConnect(
                url: url,
                gatewayStableID: stableID,
                tls: tlsParams,
                token: token,
                password: password)
            return
        }

        let preferredStableID = defaults.string(forKey: "gateway.preferredStableID")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let lastDiscoveredStableID = defaults.string(forKey: "gateway.lastDiscoveredStableID")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        let candidates = [preferredStableID, lastDiscoveredStableID].filter { !$0.isEmpty }
        guard let targetStableID = candidates.first(where: { id in
            self.gateways.contains(where: { $0.stableID == id })
        }) else { return }

        guard let target = self.gateways.first(where: { $0.stableID == targetStableID }) else { return }
        guard let host = self.resolveGatewayHost(target) else { return }
        let port = target.gatewayPort ?? 18789
        let tlsParams = self.resolveDiscoveredTLSParams(gateway: target)
        guard let url = self.buildGatewayURL(host: host, port: port, useTLS: tlsParams?.required == true)
        else { return }

        self.didAutoConnect = true
        self.startAutoConnect(
            url: url,
            gatewayStableID: target.stableID,
            tls: tlsParams,
            token: token,
            password: password)
    }

    private func updateLastDiscoveredGateway(from gateways: [GatewayDiscoveryModel.DiscoveredGateway]) {
        let defaults = UserDefaults.standard
        let preferred = defaults.string(forKey: "gateway.preferredStableID")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let existingLast = defaults.string(forKey: "gateway.lastDiscoveredStableID")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        // Avoid overriding user intent (preferred/lastDiscovered are also set on manual Connect).
        guard preferred.isEmpty, existingLast.isEmpty else { return }
        guard let first = gateways.first else { return }

        defaults.set(first.stableID, forKey: "gateway.lastDiscoveredStableID")
        GatewaySettingsStore.saveLastDiscoveredGatewayStableID(first.stableID)
    }

    private func startAutoConnect(
        url: URL,
        gatewayStableID: String,
        tls: GatewayTLSParams?,
        token: String?,
        password: String?)
    {
        guard let appModel else { return }
        let connectOptions = self.makeConnectOptions()

        Task { [weak self] in
            guard let self else { return }
            await MainActor.run {
                appModel.gatewayStatusText = "Connecting…"
            }
            appModel.connectToGateway(
                url: url,
                gatewayStableID: gatewayStableID,
                tls: tls,
                token: token,
                password: password,
                connectOptions: connectOptions)
        }
    }

    private func resolveDiscoveredTLSParams(gateway: GatewayDiscoveryModel.DiscoveredGateway) -> GatewayTLSParams? {
        let stableID = gateway.stableID
        let stored = GatewayTLSStore.loadFingerprint(stableID: stableID)

        if gateway.tlsEnabled || gateway.tlsFingerprintSha256 != nil || stored != nil {
            return GatewayTLSParams(
                required: true,
                expectedFingerprint: gateway.tlsFingerprintSha256 ?? stored,
                allowTOFU: stored == nil,
                storeKey: stableID)
        }

        return nil
    }

    private func resolveManualTLSParams(stableID: String, tlsEnabled: Bool) -> GatewayTLSParams? {
        let stored = GatewayTLSStore.loadFingerprint(stableID: stableID)
        if tlsEnabled || stored != nil {
            return GatewayTLSParams(
                required: true,
                expectedFingerprint: stored,
                allowTOFU: stored == nil,
                storeKey: stableID)
        }

        return nil
    }

    private func resolveGatewayHost(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) -> String? {
        if let lanHost = gateway.lanHost?.trimmingCharacters(in: .whitespacesAndNewlines), !lanHost.isEmpty {
            return lanHost
        }
        if let tailnet = gateway.tailnetDns?.trimmingCharacters(in: .whitespacesAndNewlines), !tailnet.isEmpty {
            return tailnet
        }
        return nil
    }

    private func buildGatewayURL(host: String, port: Int, useTLS: Bool) -> URL? {
        let scheme = useTLS ? "wss" : "ws"
        var components = URLComponents()
        components.scheme = scheme
        components.host = host
        components.port = port
        return components.url
    }

    private func resolveManualUseTLS(host: String, useTLS: Bool) -> Bool {
        useTLS || self.shouldRequireTLS(host: host)
    }

    private func shouldRequireTLS(host: String) -> Bool {
        !Self.isLoopbackHost(host)
    }

    private func shouldForceTLS(host: String) -> Bool {
        let trimmed = host.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if trimmed.isEmpty { return false }
        return trimmed.hasSuffix(".ts.net") || trimmed.hasSuffix(".ts.net.")
    }

    private static func isLoopbackHost(_ rawHost: String) -> Bool {
        var host = rawHost.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !host.isEmpty else { return false }

        if host.hasPrefix("[") && host.hasSuffix("]") {
            host.removeFirst()
            host.removeLast()
        }
        if host.hasSuffix(".") {
            host.removeLast()
        }
        if let zoneIndex = host.firstIndex(of: "%") {
            host = String(host[..<zoneIndex])
        }
        if host.isEmpty { return false }

        if host == "localhost" || host == "0.0.0.0" || host == "::" {
            return true
        }
        return Self.isLoopbackIPv4(host) || Self.isLoopbackIPv6(host)
    }

    private static func isLoopbackIPv4(_ host: String) -> Bool {
        var addr = in_addr()
        let parsed = host.withCString { inet_pton(AF_INET, $0, &addr) == 1 }
        guard parsed else { return false }
        let value = UInt32(bigEndian: addr.s_addr)
        let firstOctet = UInt8((value >> 24) & 0xFF)
        return firstOctet == 127
    }

    private static func isLoopbackIPv6(_ host: String) -> Bool {
        var addr = in6_addr()
        let parsed = host.withCString { inet_pton(AF_INET6, $0, &addr) == 1 }
        guard parsed else { return false }
        return withUnsafeBytes(of: &addr) { rawBytes in
            let bytes = rawBytes.bindMemory(to: UInt8.self)
            let isV6Loopback = bytes[0..<15].allSatisfy { $0 == 0 } && bytes[15] == 1
            if isV6Loopback { return true }

            let isMappedV4 = bytes[0..<10].allSatisfy { $0 == 0 } && bytes[10] == 0xFF && bytes[11] == 0xFF
            return isMappedV4 && bytes[12] == 127
        }
    }

    private func manualStableID(host: String, port: Int) -> String {
        "manual|\(host.lowercased())|\(port)"
    }

    private func makeConnectOptions() -> GatewayConnectOptions {
        let defaults = UserDefaults.standard
        let displayName = self.resolvedDisplayName(defaults: defaults)

        return GatewayConnectOptions(
            role: "node",
            scopes: [],
            caps: self.currentCaps(),
            commands: self.currentCommands(),
<<<<<<< HEAD
<<<<<<< HEAD
            permissions: [:],
            clientId: "moltbot-ios",
            clientId: "openclaw-ios",
>>>>>>> b17e6fdd0 (iOS: align node permissions and notifications)
=======
            clientId: resolvedClientId,
>>>>>>> 84e115834 (Gateway: fix node invoke receive loop)
=======
            permissions: [:],
            clientId: "openclaw-ios",
>>>>>>> 4ab814fd5 (Revert "iOS: wire node services and tests")
            clientMode: "node",
            clientDisplayName: displayName)
    }

    private func resolvedDisplayName(defaults: UserDefaults) -> String {
        let key = "node.displayName"
        let existing = defaults.string(forKey: key)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !existing.isEmpty, existing != "iOS Node" { return existing }

        let deviceName = UIDevice.current.name.trimmingCharacters(in: .whitespacesAndNewlines)
        let candidate = deviceName.isEmpty ? "iOS Node" : deviceName

        if existing.isEmpty || existing == "iOS Node" {
            defaults.set(candidate, forKey: key)
        }

        return candidate
    }

    private func currentCaps() -> [String] {
        var caps = [MoltbotCapability.canvas.rawValue, MoltbotCapability.screen.rawValue]

        // Default-on: if the key doesn't exist yet, treat it as enabled.
        let cameraEnabled =
            UserDefaults.standard.object(forKey: "camera.enabled") == nil
                ? true
                : UserDefaults.standard.bool(forKey: "camera.enabled")
        if cameraEnabled { caps.append(MoltbotCapability.camera.rawValue) }

        let voiceWakeEnabled = UserDefaults.standard.bool(forKey: VoiceWakePreferences.enabledKey)
        if voiceWakeEnabled { caps.append(MoltbotCapability.voiceWake.rawValue) }

        let locationModeRaw = UserDefaults.standard.string(forKey: "location.enabledMode") ?? "off"
        let locationMode = MoltbotLocationMode(rawValue: locationModeRaw) ?? .off
        if locationMode != .off { caps.append(MoltbotCapability.location.rawValue) }
=======

        caps.append(OpenClawCapability.device.rawValue)
        if WatchMessagingService.isSupportedOnDevice() {
            caps.append(OpenClawCapability.watch.rawValue)
        }
        caps.append(OpenClawCapability.photos.rawValue)
        caps.append(OpenClawCapability.contacts.rawValue)
        caps.append(OpenClawCapability.calendar.rawValue)
        caps.append(OpenClawCapability.reminders.rawValue)
        if Self.motionAvailable() {
            caps.append(OpenClawCapability.motion.rawValue)
        }
>>>>>>> 57083e422 (iOS: add Apple Watch companion message MVP (#20054))

        return caps
    }

    private func currentCommands() -> [String] {
        var commands: [String] = [
            MoltbotCanvasCommand.present.rawValue,
            MoltbotCanvasCommand.hide.rawValue,
            MoltbotCanvasCommand.navigate.rawValue,
            MoltbotCanvasCommand.evalJS.rawValue,
            MoltbotCanvasCommand.snapshot.rawValue,
            MoltbotCanvasA2UICommand.push.rawValue,
            MoltbotCanvasA2UICommand.pushJSONL.rawValue,
            MoltbotCanvasA2UICommand.reset.rawValue,
            MoltbotScreenCommand.record.rawValue,
            MoltbotSystemCommand.notify.rawValue,
            MoltbotSystemCommand.which.rawValue,
            MoltbotSystemCommand.run.rawValue,
            MoltbotSystemCommand.execApprovalsGet.rawValue,
            MoltbotSystemCommand.execApprovalsSet.rawValue,
=======
=======
>>>>>>> 4ab814fd5 (Revert "iOS: wire node services and tests")
            OpenClawSystemCommand.which.rawValue,
            OpenClawSystemCommand.run.rawValue,
            OpenClawSystemCommand.execApprovalsGet.rawValue,
            OpenClawSystemCommand.execApprovalsSet.rawValue,
>>>>>>> 821ed35be (Revert "iOS: align node permissions and notifications")
            OpenClawTalkCommand.pttStart.rawValue,
            OpenClawTalkCommand.pttStop.rawValue,
>>>>>>> 9f101d3a9 (iOS: add push-to-talk node commands)
=======
>>>>>>> 4ab814fd5 (Revert "iOS: wire node services and tests")
        ]

        let caps = Set(self.currentCaps())
        if caps.contains(MoltbotCapability.camera.rawValue) {
            commands.append(MoltbotCameraCommand.list.rawValue)
            commands.append(MoltbotCameraCommand.snap.rawValue)
            commands.append(MoltbotCameraCommand.clip.rawValue)
        }
        if caps.contains(MoltbotCapability.location.rawValue) {
            commands.append(MoltbotLocationCommand.get.rawValue)
        }
=======
>>>>>>> 4ab814fd5 (Revert "iOS: wire node services and tests")

        return commands
    }

<<<<<<< HEAD
=======
>>>>>>> 4ab814fd5 (Revert "iOS: wire node services and tests")
    private func platformString() -> String {
        let v = ProcessInfo.processInfo.operatingSystemVersion
        let name = switch UIDevice.current.userInterfaceIdiom {
        case .pad:
            "iPadOS"
        case .phone:
            "iOS"
        default:
            "iOS"
        }
        return "\(name) \(v.majorVersion).\(v.minorVersion).\(v.patchVersion)"
    }

    private func deviceFamily() -> String {
        switch UIDevice.current.userInterfaceIdiom {
        case .pad:
            "iPad"
        case .phone:
            "iPhone"
        default:
            "iOS"
        }
    }

    private func modelIdentifier() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machine = withUnsafeBytes(of: &systemInfo.machine) { ptr in
            String(bytes: ptr.prefix { $0 != 0 }, encoding: .utf8)
        }
        let trimmed = machine?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "unknown" : trimmed
    }

    private func appVersion() -> String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"
    }
=======
>>>>>>> 32d7756d8 (iOS: extract device/platform info into DeviceInfoHelper, keep Settings platform string as iOS X.Y.Z)
}

#if DEBUG
extension GatewayConnectionController {
    func _test_resolvedDisplayName(defaults: UserDefaults) -> String {
        self.resolvedDisplayName(defaults: defaults)
    }

    func _test_currentCaps() -> [String] {
        self.currentCaps()
    }

    func _test_currentCommands() -> [String] {
        self.currentCommands()
    }

    func _test_platformString() -> String {
        DeviceInfoHelper.platformString()
    }

    func _test_deviceFamily() -> String {
        DeviceInfoHelper.deviceFamily()
    }

    func _test_modelIdentifier() -> String {
        DeviceInfoHelper.modelIdentifier()
    }

    func _test_appVersion() -> String {
        DeviceInfoHelper.appVersion()
    }

    func _test_setGateways(_ gateways: [GatewayDiscoveryModel.DiscoveredGateway]) {
        self.gateways = gateways
    }

    func _test_triggerAutoConnect() {
        self.maybeAutoConnect()
    }
}
#endif

private final class GatewayTLSFingerprintProbe: NSObject, URLSessionDelegate, @unchecked Sendable {
    private let url: URL
    private let timeoutSeconds: Double
    private let onComplete: (String?) -> Void
    private var didFinish = false
    private var session: URLSession?
    private var task: URLSessionWebSocketTask?

    init(url: URL, timeoutSeconds: Double, onComplete: @escaping (String?) -> Void) {
        self.url = url
        self.timeoutSeconds = timeoutSeconds
        self.onComplete = onComplete
    }

    func start() {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = self.timeoutSeconds
        config.timeoutIntervalForResource = self.timeoutSeconds
        let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        self.session = session
        let task = session.webSocketTask(with: self.url)
        self.task = task
        task.resume()

        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + self.timeoutSeconds) { [weak self] in
            self?.finish(nil)
        }
    }

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust
        else {
            completionHandler(.performDefaultHandling, nil)
            return
        }

        let fp = GatewayTLSFingerprintProbe.certificateFingerprint(trust)
        completionHandler(.cancelAuthenticationChallenge, nil)
        self.finish(fp)
    }

    private func finish(_ fingerprint: String?) {
        objc_sync_enter(self)
        defer { objc_sync_exit(self) }
        guard !self.didFinish else { return }
        self.didFinish = true
        self.task?.cancel(with: .goingAway, reason: nil)
        self.session?.invalidateAndCancel()
        self.onComplete(fingerprint)
    }

    private static func certificateFingerprint(_ trust: SecTrust) -> String? {
        guard let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate],
              let cert = chain.first
        else {
            return nil
        }
        let data = SecCertificateCopyData(cert) as Data
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
