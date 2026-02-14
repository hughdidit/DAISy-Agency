import Foundation

enum GatewaySettingsStore {
    private static let gatewayService = "ai.openclaw.gateway"
    private static let nodeService = "ai.openclaw.node"

    private static let instanceIdDefaultsKey = "node.instanceId"
    private static let preferredGatewayStableIDDefaultsKey = "gateway.preferredStableID"
    private static let lastDiscoveredGatewayStableIDDefaultsKey = "gateway.lastDiscoveredStableID"
    private static let manualEnabledDefaultsKey = "gateway.manual.enabled"
    private static let manualHostDefaultsKey = "gateway.manual.host"
    private static let manualPortDefaultsKey = "gateway.manual.port"
    private static let manualTlsDefaultsKey = "gateway.manual.tls"
    private static let discoveryDebugLogsDefaultsKey = "gateway.discovery.debugLogs"
<<<<<<< HEAD
=======
    private static let lastGatewayKindDefaultsKey = "gateway.last.kind"
    private static let lastGatewayHostDefaultsKey = "gateway.last.host"
    private static let lastGatewayPortDefaultsKey = "gateway.last.port"
    private static let lastGatewayTlsDefaultsKey = "gateway.last.tls"
    private static let lastGatewayStableIDDefaultsKey = "gateway.last.stableID"
    private static let clientIdOverrideDefaultsPrefix = "gateway.clientIdOverride."
    private static let selectedAgentDefaultsPrefix = "gateway.selectedAgentId."
>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)

    private static let instanceIdAccount = "instanceId"
    private static let preferredGatewayStableIDAccount = "preferredStableID"
    private static let lastDiscoveredGatewayStableIDAccount = "lastDiscoveredStableID"

    static func bootstrapPersistence() {
        self.ensureStableInstanceID()
        self.ensurePreferredGatewayStableID()
        self.ensureLastDiscoveredGatewayStableID()
    }

    static func loadStableInstanceID() -> String? {
        if let value = KeychainStore.loadString(service: self.nodeService, account: self.instanceIdAccount)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !value.isEmpty
        {
            return value
        }

        return nil
    }

    static func saveStableInstanceID(_ instanceId: String) {
        _ = KeychainStore.saveString(instanceId, service: self.nodeService, account: self.instanceIdAccount)
    }

    static func loadPreferredGatewayStableID() -> String? {
        if let value = KeychainStore.loadString(
            service: self.gatewayService,
            account: self.preferredGatewayStableIDAccount
        )?.trimmingCharacters(in: .whitespacesAndNewlines),
            !value.isEmpty
        {
            return value
        }

        return nil
    }

    static func savePreferredGatewayStableID(_ stableID: String) {
        _ = KeychainStore.saveString(
            stableID,
            service: self.gatewayService,
            account: self.preferredGatewayStableIDAccount)
    }

    static func loadLastDiscoveredGatewayStableID() -> String? {
        if let value = KeychainStore.loadString(
            service: self.gatewayService,
            account: self.lastDiscoveredGatewayStableIDAccount
        )?.trimmingCharacters(in: .whitespacesAndNewlines),
            !value.isEmpty
        {
            return value
        }

        return nil
    }

    static func saveLastDiscoveredGatewayStableID(_ stableID: String) {
        _ = KeychainStore.saveString(
            stableID,
            service: self.gatewayService,
            account: self.lastDiscoveredGatewayStableIDAccount)
    }

    static func loadGatewayToken(instanceId: String) -> String? {
        let account = self.gatewayTokenAccount(instanceId: instanceId)
        let token = KeychainStore.loadString(service: self.gatewayService, account: account)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if token?.isEmpty == false { return token }
        return nil
    }

    static func saveGatewayToken(_ token: String, instanceId: String) {
        _ = KeychainStore.saveString(
            token,
            service: self.gatewayService,
            account: self.gatewayTokenAccount(instanceId: instanceId))
    }

    static func loadGatewayPassword(instanceId: String) -> String? {
        KeychainStore.loadString(
            service: self.gatewayService,
            account: self.gatewayPasswordAccount(instanceId: instanceId))?
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func saveGatewayPassword(_ password: String, instanceId: String) {
        _ = KeychainStore.saveString(
            password,
            service: self.gatewayService,
            account: self.gatewayPasswordAccount(instanceId: instanceId))
    }

<<<<<<< HEAD
=======
    enum LastGatewayConnection: Equatable {
        case manual(host: String, port: Int, useTLS: Bool, stableID: String)
        case discovered(stableID: String, useTLS: Bool)

        var stableID: String {
            switch self {
            case let .manual(_, _, _, stableID):
                return stableID
            case let .discovered(stableID, _):
                return stableID
            }
        }

        var useTLS: Bool {
            switch self {
            case let .manual(_, _, useTLS, _):
                return useTLS
            case let .discovered(_, useTLS):
                return useTLS
            }
        }
    }

    private enum LastGatewayKind: String {
        case manual
        case discovered
    }

    static func saveLastGatewayConnectionManual(host: String, port: Int, useTLS: Bool, stableID: String) {
        let defaults = UserDefaults.standard
        defaults.set(LastGatewayKind.manual.rawValue, forKey: self.lastGatewayKindDefaultsKey)
        defaults.set(host, forKey: self.lastGatewayHostDefaultsKey)
        defaults.set(port, forKey: self.lastGatewayPortDefaultsKey)
        defaults.set(useTLS, forKey: self.lastGatewayTlsDefaultsKey)
        defaults.set(stableID, forKey: self.lastGatewayStableIDDefaultsKey)
    }

    static func saveLastGatewayConnectionDiscovered(stableID: String, useTLS: Bool) {
        let defaults = UserDefaults.standard
        defaults.set(LastGatewayKind.discovered.rawValue, forKey: self.lastGatewayKindDefaultsKey)
        defaults.removeObject(forKey: self.lastGatewayHostDefaultsKey)
        defaults.removeObject(forKey: self.lastGatewayPortDefaultsKey)
        defaults.set(useTLS, forKey: self.lastGatewayTlsDefaultsKey)
        defaults.set(stableID, forKey: self.lastGatewayStableIDDefaultsKey)
    }

    static func loadLastGatewayConnection() -> LastGatewayConnection? {
        let defaults = UserDefaults.standard
        let stableID = defaults.string(forKey: self.lastGatewayStableIDDefaultsKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !stableID.isEmpty else { return nil }
        let useTLS = defaults.bool(forKey: self.lastGatewayTlsDefaultsKey)
        let kindRaw = defaults.string(forKey: self.lastGatewayKindDefaultsKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let kind = LastGatewayKind(rawValue: kindRaw) ?? .manual

        if kind == .discovered {
            return .discovered(stableID: stableID, useTLS: useTLS)
        }

        let host = defaults.string(forKey: self.lastGatewayHostDefaultsKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let port = defaults.integer(forKey: self.lastGatewayPortDefaultsKey)

        // Back-compat: older builds persisted manual-style host/port without a kind marker.
        guard !host.isEmpty, port > 0, port <= 65535 else { return nil }
        return .manual(host: host, port: port, useTLS: useTLS, stableID: stableID)
    }

    static func loadGatewayClientIdOverride(stableID: String) -> String? {
        let trimmedID = stableID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedID.isEmpty else { return nil }
        let key = self.clientIdOverrideDefaultsPrefix + trimmedID
        let value = UserDefaults.standard.string(forKey: key)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if value?.isEmpty == false { return value }
        return nil
    }

    static func saveGatewayClientIdOverride(stableID: String, clientId: String?) {
        let trimmedID = stableID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedID.isEmpty else { return }
        let key = self.clientIdOverrideDefaultsPrefix + trimmedID
        let trimmedClientId = clientId?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if trimmedClientId.isEmpty {
            UserDefaults.standard.removeObject(forKey: key)
        } else {
            UserDefaults.standard.set(trimmedClientId, forKey: key)
        }
    }

    static func loadGatewaySelectedAgentId(stableID: String) -> String? {
        let trimmedID = stableID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedID.isEmpty else { return nil }
        let key = self.selectedAgentDefaultsPrefix + trimmedID
        let value = UserDefaults.standard.string(forKey: key)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if value?.isEmpty == false { return value }
        return nil
    }

    static func saveGatewaySelectedAgentId(stableID: String, agentId: String?) {
        let trimmedID = stableID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedID.isEmpty else { return }
        let key = self.selectedAgentDefaultsPrefix + trimmedID
        let trimmedAgentId = agentId?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if trimmedAgentId.isEmpty {
            UserDefaults.standard.removeObject(forKey: key)
        } else {
            UserDefaults.standard.set(trimmedAgentId, forKey: key)
        }
    }

>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
    private static func gatewayTokenAccount(instanceId: String) -> String {
        "gateway-token.\(instanceId)"
    }

    private static func gatewayPasswordAccount(instanceId: String) -> String {
        "gateway-password.\(instanceId)"
    }

    private static func ensureStableInstanceID() {
        let defaults = UserDefaults.standard

        if let existing = defaults.string(forKey: self.instanceIdDefaultsKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !existing.isEmpty
        {
            if self.loadStableInstanceID() == nil {
                self.saveStableInstanceID(existing)
            }
            return
        }

        if let stored = self.loadStableInstanceID(), !stored.isEmpty {
            defaults.set(stored, forKey: self.instanceIdDefaultsKey)
            return
        }

        let fresh = UUID().uuidString
        self.saveStableInstanceID(fresh)
        defaults.set(fresh, forKey: self.instanceIdDefaultsKey)
    }

    private static func ensurePreferredGatewayStableID() {
        let defaults = UserDefaults.standard

        if let existing = defaults.string(forKey: self.preferredGatewayStableIDDefaultsKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !existing.isEmpty
        {
            if self.loadPreferredGatewayStableID() == nil {
                self.savePreferredGatewayStableID(existing)
            }
            return
        }

        if let stored = self.loadPreferredGatewayStableID(), !stored.isEmpty {
            defaults.set(stored, forKey: self.preferredGatewayStableIDDefaultsKey)
        }
    }

    private static func ensureLastDiscoveredGatewayStableID() {
        let defaults = UserDefaults.standard

        if let existing = defaults.string(forKey: self.lastDiscoveredGatewayStableIDDefaultsKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !existing.isEmpty
        {
            if self.loadLastDiscoveredGatewayStableID() == nil {
                self.saveLastDiscoveredGatewayStableID(existing)
            }
            return
        }

        if let stored = self.loadLastDiscoveredGatewayStableID(), !stored.isEmpty {
            defaults.set(stored, forKey: self.lastDiscoveredGatewayStableIDDefaultsKey)
        }
    }

}
