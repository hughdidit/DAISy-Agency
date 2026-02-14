<<<<<<< HEAD
=======
import AVFoundation
import Contacts
import CoreLocation
import CoreMotion
import CryptoKit
import EventKit
import Foundation
>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
import OpenClawKit
import Darwin
import Foundation
import Network
import Observation
<<<<<<< HEAD
=======
import Photos
import ReplayKit
import Security
import Speech
>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
import SwiftUI
import UIKit

@MainActor
@Observable
final class GatewayConnectionController {
    struct TrustPrompt: Identifiable, Equatable {
        let stableID: String
        let gatewayName: String
        let host: String
        let port: Int
        let fingerprintSha256: String
        let isManual: Bool

        var id: String { self.stableID }
    }

    private(set) var gateways: [GatewayDiscoveryModel.DiscoveredGateway] = []
    private(set) var discoveryStatusText: String = "Idle"
    private(set) var discoveryDebugLog: [GatewayDiscoveryModel.DebugLogEntry] = []
    private(set) var pendingTrustPrompt: TrustPrompt?

    private let discovery = GatewayDiscoveryModel()
    private weak var appModel: NodeAppModel?
    private var didAutoConnect = false
    private var pendingServiceResolvers: [String: GatewayServiceResolver] = [:]
    private var pendingTrustConnect: (url: URL, stableID: String, isManual: Bool)?

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
        await self.connectDiscoveredGateway(gateway)
    }

    private func connectDiscoveredGateway(
        _ gateway: GatewayDiscoveryModel.DiscoveredGateway) async
    {
        let instanceId = UserDefaults.standard.string(forKey: "node.instanceId")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let token = GatewaySettingsStore.loadGatewayToken(instanceId: instanceId)
        let password = GatewaySettingsStore.loadGatewayPassword(instanceId: instanceId)

        // Resolve the service endpoint (SRV/A/AAAA). TXT is unauthenticated; do not route via TXT.
        guard let target = await self.resolveServiceEndpoint(gateway.endpoint) else { return }

        let stableID = gateway.stableID
        // Discovery is a LAN operation; refuse unauthenticated plaintext connects.
        let tlsRequired = true
        let stored = GatewayTLSStore.loadFingerprint(stableID: stableID)

        guard gateway.tlsEnabled || stored != nil else { return }

        if tlsRequired, stored == nil {
            guard let url = self.buildGatewayURL(host: target.host, port: target.port, useTLS: true)
            else { return }
            guard let fp = await self.probeTLSFingerprint(url: url) else { return }
            self.pendingTrustConnect = (url: url, stableID: stableID, isManual: false)
            self.pendingTrustPrompt = TrustPrompt(
                stableID: stableID,
                gatewayName: gateway.name,
                host: target.host,
                port: target.port,
                fingerprintSha256: fp,
                isManual: false)
            self.appModel?.gatewayStatusText = "Verify gateway TLS fingerprint"
            return
        }

        let tlsParams = stored.map { fp in
            GatewayTLSParams(required: true, expectedFingerprint: fp, allowTOFU: false, storeKey: stableID)
        }

        guard let url = self.buildGatewayURL(
            host: target.host,
            port: target.port,
            useTLS: tlsParams?.required == true)
        else { return }
<<<<<<< HEAD
<<<<<<< HEAD
=======
        GatewaySettingsStore.saveLastGatewayConnection(
            host: target.host,
            port: target.port,
            useTLS: tlsParams?.required == true,
            stableID: gateway.stableID)
>>>>>>> d583782ee (fix(security): harden discovery routing and TLS pins)
=======
        GatewaySettingsStore.saveLastGatewayConnectionDiscovered(stableID: stableID, useTLS: true)
>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
        self.didAutoConnect = true
        self.startAutoConnect(
            url: url,
            gatewayStableID: stableID,
            tls: tlsParams,
            token: token,
            password: password)
    }

    func connectManual(host: String, port: Int, useTLS: Bool) async {
        let instanceId = UserDefaults.standard.string(forKey: "node.instanceId")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let token = GatewaySettingsStore.loadGatewayToken(instanceId: instanceId)
        let password = GatewaySettingsStore.loadGatewayPassword(instanceId: instanceId)
<<<<<<< HEAD
        let stableID = self.manualStableID(host: host, port: port)
        let tlsParams = self.resolveManualTLSParams(stableID: stableID, tlsEnabled: useTLS)
=======
        let resolvedUseTLS = useTLS
        guard let resolvedPort = self.resolveManualPort(host: host, port: port, useTLS: resolvedUseTLS)
        else { return }
        let stableID = self.manualStableID(host: host, port: resolvedPort)
        let stored = GatewayTLSStore.loadFingerprint(stableID: stableID)
        if resolvedUseTLS, stored == nil {
            guard let url = self.buildGatewayURL(host: host, port: resolvedPort, useTLS: true) else { return }
            guard let fp = await self.probeTLSFingerprint(url: url) else { return }
            self.pendingTrustConnect = (url: url, stableID: stableID, isManual: true)
            self.pendingTrustPrompt = TrustPrompt(
                stableID: stableID,
                gatewayName: "\(host):\(resolvedPort)",
                host: host,
                port: resolvedPort,
                fingerprintSha256: fp,
                isManual: true)
            self.appModel?.gatewayStatusText = "Verify gateway TLS fingerprint"
            return
        }

        let tlsParams = stored.map { fp in
            GatewayTLSParams(required: true, expectedFingerprint: fp, allowTOFU: false, storeKey: stableID)
        }
>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
        guard let url = self.buildGatewayURL(
            host: host,
            port: port,
            useTLS: tlsParams?.required == true)
        else { return }
<<<<<<< HEAD
=======
        GatewaySettingsStore.saveLastGatewayConnectionManual(
            host: host,
            port: resolvedPort,
            useTLS: resolvedUseTLS && tlsParams != nil,
            stableID: stableID)
>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
        self.didAutoConnect = true
        self.startAutoConnect(
            url: url,
            gatewayStableID: stableID,
            tls: tlsParams,
            token: token,
            password: password)
    }

<<<<<<< HEAD
=======
    func connectLastKnown() async {
        guard let last = GatewaySettingsStore.loadLastGatewayConnection() else { return }
        switch last {
        case let .manual(host, port, useTLS, _):
            await self.connectManual(host: host, port: port, useTLS: useTLS)
        case let .discovered(stableID, _):
            guard let gateway = self.gateways.first(where: { $0.stableID == stableID }) else { return }
            await self.connectDiscoveredGateway(gateway)
        }
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

>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
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

<<<<<<< HEAD
=======
        if let lastKnown = GatewaySettingsStore.loadLastGatewayConnection() {
            if case let .manual(host, port, useTLS, stableID) = lastKnown {
                let resolvedUseTLS = useTLS || self.shouldForceTLS(host: host)
                let stored = GatewayTLSStore.loadFingerprint(stableID: stableID)
                let tlsParams = stored.map { fp in
                    GatewayTLSParams(required: true, expectedFingerprint: fp, allowTOFU: false, storeKey: stableID)
                }
                guard let url = self.buildGatewayURL(
                    host: host,
                    port: port,
                    useTLS: resolvedUseTLS && tlsParams != nil)
                else { return }

                // Security: autoconnect only to previously trusted gateways (stored TLS pin).
                guard tlsParams != nil else { return }

                self.didAutoConnect = true
                self.startAutoConnect(
                    url: url,
                    gatewayStableID: stableID,
                    tls: tlsParams,
                    token: token,
                    password: password)
                return
            }
        }

>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
        let preferredStableID = defaults.string(forKey: "gateway.preferredStableID")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let lastDiscoveredStableID = defaults.string(forKey: "gateway.lastDiscoveredStableID")?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        let candidates = [preferredStableID, lastDiscoveredStableID].filter { !$0.isEmpty }
        guard let targetStableID = candidates.first(where: { id in
            self.gateways.contains(where: { $0.stableID == id })
<<<<<<< HEAD
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
=======
        }) {
            guard let target = self.gateways.first(where: { $0.stableID == targetStableID }) else { return }
            // Security: autoconnect only to previously trusted gateways (stored TLS pin).
            guard GatewayTLSStore.loadFingerprint(stableID: target.stableID) != nil else { return }

            self.didAutoConnect = true
            Task { [weak self] in
                guard let self else { return }
                await self.connectDiscoveredGateway(target)
            }
            return
        }

        if self.gateways.count == 1, let gateway = self.gateways.first {
            // Security: autoconnect only to previously trusted gateways (stored TLS pin).
            guard GatewayTLSStore.loadFingerprint(stableID: gateway.stableID) != nil else { return }

            self.didAutoConnect = true
            Task { [weak self] in
                guard let self else { return }
                await self.connectDiscoveredGateway(gateway)
            }
            return
        }
    }

    private func attemptAutoReconnectIfNeeded() {
        guard let appModel = self.appModel else { return }
        guard appModel.gatewayAutoReconnectEnabled else { return }
        // Avoid starting duplicate connect loops while a prior config is active.
        guard appModel.activeGatewayConnectConfig == nil else { return }
        guard UserDefaults.standard.bool(forKey: "gateway.autoconnect") else { return }
        self.didAutoConnect = false
        self.maybeAutoConnect()
>>>>>>> d583782ee (fix(security): harden discovery routing and TLS pins)
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

    private func resolveDiscoveredTLSParams(
        gateway: GatewayDiscoveryModel.DiscoveredGateway,
        allowTOFU: Bool) -> GatewayTLSParams?
    {
        let stableID = gateway.stableID
        let stored = GatewayTLSStore.loadFingerprint(stableID: stableID)

        // Never let unauthenticated discovery (TXT) override a stored pin.
        if let stored {
            return GatewayTLSParams(
                required: true,
                expectedFingerprint: stored,
                allowTOFU: false,
                storeKey: stableID)
        }

        if gateway.tlsEnabled || gateway.tlsFingerprintSha256 != nil {
            return GatewayTLSParams(
                required: true,
                expectedFingerprint: nil,
                allowTOFU: false,
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
<<<<<<< HEAD
                allowTOFU: stored == nil,
=======
                allowTOFU: false,
>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
                storeKey: stableID)
        }

        return nil
    }

<<<<<<< HEAD
<<<<<<< HEAD
    private func resolveGatewayHost(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) -> String? {
        if let lanHost = gateway.lanHost?.trimmingCharacters(in: .whitespacesAndNewlines), !lanHost.isEmpty {
            return lanHost
        }
        if let tailnet = gateway.tailnetDns?.trimmingCharacters(in: .whitespacesAndNewlines), !tailnet.isEmpty {
            return tailnet
        }
        return nil
=======
=======
    private func probeTLSFingerprint(url: URL) async -> String? {
        await withCheckedContinuation { continuation in
            let probe = GatewayTLSFingerprintProbe(url: url, timeoutSeconds: 3) { fp in
                continuation.resume(returning: fp)
            }
            probe.start()
        }
    }

>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
    private func resolveServiceEndpoint(_ endpoint: NWEndpoint) async -> (host: String, port: Int)? {
        guard case let .service(name, type, domain, _) = endpoint else { return nil }
        let key = "\(domain)|\(type)|\(name)"
        return await withCheckedContinuation { continuation in
            let resolver = GatewayServiceResolver(name: name, type: type, domain: domain) { [weak self] result in
                Task { @MainActor in
                    self?.pendingServiceResolvers[key] = nil
                    continuation.resume(returning: result)
                }
            }
            self.pendingServiceResolvers[key] = resolver
            resolver.start()
        }
>>>>>>> d583782ee (fix(security): harden discovery routing and TLS pins)
    }

    private func buildGatewayURL(host: String, port: Int, useTLS: Bool) -> URL? {
        let scheme = useTLS ? "wss" : "ws"
        var components = URLComponents()
        components.scheme = scheme
        components.host = host
        components.port = port
        return components.url
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
            permissions: [:],
            clientId: "openclaw-ios",
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
        var caps = [OpenClawCapability.canvas.rawValue, OpenClawCapability.screen.rawValue]

        // Default-on: if the key doesn't exist yet, treat it as enabled.
        let cameraEnabled =
            UserDefaults.standard.object(forKey: "camera.enabled") == nil
                ? true
                : UserDefaults.standard.bool(forKey: "camera.enabled")
        if cameraEnabled { caps.append(OpenClawCapability.camera.rawValue) }

        let voiceWakeEnabled = UserDefaults.standard.bool(forKey: VoiceWakePreferences.enabledKey)
        if voiceWakeEnabled { caps.append(OpenClawCapability.voiceWake.rawValue) }

        let locationModeRaw = UserDefaults.standard.string(forKey: "location.enabledMode") ?? "off"
        let locationMode = OpenClawLocationMode(rawValue: locationModeRaw) ?? .off
        if locationMode != .off { caps.append(OpenClawCapability.location.rawValue) }

        return caps
    }

    private func currentCommands() -> [String] {
        var commands: [String] = [
            OpenClawCanvasCommand.present.rawValue,
            OpenClawCanvasCommand.hide.rawValue,
            OpenClawCanvasCommand.navigate.rawValue,
            OpenClawCanvasCommand.evalJS.rawValue,
            OpenClawCanvasCommand.snapshot.rawValue,
            OpenClawCanvasA2UICommand.push.rawValue,
            OpenClawCanvasA2UICommand.pushJSONL.rawValue,
            OpenClawCanvasA2UICommand.reset.rawValue,
            OpenClawScreenCommand.record.rawValue,
            OpenClawSystemCommand.notify.rawValue,
            OpenClawSystemCommand.which.rawValue,
            OpenClawSystemCommand.run.rawValue,
            OpenClawSystemCommand.execApprovalsGet.rawValue,
            OpenClawSystemCommand.execApprovalsSet.rawValue,
        ]

        let caps = Set(self.currentCaps())
        if caps.contains(OpenClawCapability.camera.rawValue) {
            commands.append(OpenClawCameraCommand.list.rawValue)
            commands.append(OpenClawCameraCommand.snap.rawValue)
            commands.append(OpenClawCameraCommand.clip.rawValue)
        }
        if caps.contains(OpenClawCapability.location.rawValue) {
            commands.append(OpenClawLocationCommand.get.rawValue)
        }

        return commands
    }

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
        self.platformString()
    }

    func _test_deviceFamily() -> String {
        self.deviceFamily()
    }

    func _test_modelIdentifier() -> String {
        self.modelIdentifier()
    }

    func _test_appVersion() -> String {
        self.appVersion()
    }

    func _test_setGateways(_ gateways: [GatewayDiscoveryModel.DiscoveredGateway]) {
        self.gateways = gateways
    }

    func _test_triggerAutoConnect() {
        self.maybeAutoConnect()
    }

    func _test_didAutoConnect() -> Bool {
        self.didAutoConnect
    }

    func _test_resolveDiscoveredTLSParams(
        gateway: GatewayDiscoveryModel.DiscoveredGateway,
        allowTOFU: Bool) -> GatewayTLSParams?
    {
        self.resolveDiscoveredTLSParams(gateway: gateway, allowTOFU: allowTOFU)
    }
}
#endif

private final class GatewayTLSFingerprintProbe: NSObject, URLSessionDelegate {
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
