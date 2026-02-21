import OpenClawDiscovery
import Foundation

enum GatewayDiscoveryHelpers {
<<<<<<< HEAD
    static func sshTarget(for gateway: GatewayDiscoveryModel.DiscoveredGateway) -> String? {
        let host = self.sanitizedTailnetHost(gateway.tailnetDns) ?? gateway.lanHost
        guard let host = self.trimmed(host), !host.isEmpty else { return nil }
=======
    static func resolvedServiceHost(
        for gateway: GatewayDiscoveryModel.DiscoveredGateway) -> String?
    {
        self.resolvedServiceHost(gateway.serviceHost)
    }

    static func resolvedServiceHost(_ host: String?) -> String? {
        guard let host = self.trimmed(host), !host.isEmpty else { return nil }
        return host
    }

    static func serviceEndpoint(
        for gateway: GatewayDiscoveryModel.DiscoveredGateway) -> (host: String, port: Int)?
    {
        self.serviceEndpoint(serviceHost: gateway.serviceHost, servicePort: gateway.servicePort)
    }

    static func serviceEndpoint(
        serviceHost: String?,
        servicePort: Int?) -> (host: String, port: Int)?
    {
        guard let host = self.resolvedServiceHost(serviceHost) else { return nil }
        guard let port = servicePort, port > 0, port <= 65535 else { return nil }
        return (host, port)
    }

    static func sshTarget(for gateway: GatewayDiscoveryModel.DiscoveredGateway) -> String? {
        guard let host = self.resolvedServiceHost(for: gateway) else { return nil }
>>>>>>> bfe016fa2 (fix: clear stale remote discovery endpoints (#21618) (thanks @bmendonca3))
        let user = NSUserName()
        var target = "\(user)@\(host)"
        if gateway.sshPort != 22 {
            target += ":\(gateway.sshPort)"
        }
        return target
    }

    static func directUrl(for gateway: GatewayDiscoveryModel.DiscoveredGateway) -> String? {
        self.directGatewayUrl(
            tailnetDns: gateway.tailnetDns,
            lanHost: gateway.lanHost,
            gatewayPort: gateway.gatewayPort)
    }

    static func directGatewayUrl(
        tailnetDns: String?,
        lanHost: String?,
        gatewayPort: Int?) -> String?
    {
        if let tailnetDns = self.sanitizedTailnetHost(tailnetDns) {
            return "wss://\(tailnetDns)"
        }
        guard let lanHost = self.trimmed(lanHost), !lanHost.isEmpty else { return nil }
        let port = gatewayPort ?? 18789
        return "ws://\(lanHost):\(port)"
    }

    static func sanitizedTailnetHost(_ host: String?) -> String? {
        guard let host = self.trimmed(host), !host.isEmpty else { return nil }
        if host.hasSuffix(".internal.") || host.hasSuffix(".internal") {
            return nil
        }
        return host
    }

    private static func trimmed(_ value: String?) -> String? {
        value?.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
