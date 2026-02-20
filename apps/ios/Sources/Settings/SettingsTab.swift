import OpenClawKit
import Network
import Observation
import SwiftUI
import UIKit

@MainActor
@Observable
private final class ConnectStatusStore {
    var text: String?
}

extension ConnectStatusStore: @unchecked Sendable {}

struct SettingsTab: View {
    @Environment(NodeAppModel.self) private var appModel: NodeAppModel
    @Environment(VoiceWakeManager.self) private var voiceWake: VoiceWakeManager
    @Environment(GatewayConnectionController.self) private var gatewayController: GatewayConnectionController
    @Environment(\.dismiss) private var dismiss
    @AppStorage("node.displayName") private var displayName: String = "iOS Node"
    @AppStorage("node.instanceId") private var instanceId: String = UUID().uuidString
    @AppStorage("voiceWake.enabled") private var voiceWakeEnabled: Bool = false
    @AppStorage("talk.enabled") private var talkEnabled: Bool = false
    @AppStorage("talk.button.enabled") private var talkButtonEnabled: Bool = true
    @AppStorage("camera.enabled") private var cameraEnabled: Bool = true
    @AppStorage("location.enabledMode") private var locationEnabledModeRaw: String = OpenClawLocationMode.off.rawValue
    @AppStorage("location.preciseEnabled") private var locationPreciseEnabled: Bool = true
    @AppStorage("screen.preventSleep") private var preventSleep: Bool = true
    @AppStorage("gateway.preferredStableID") private var preferredGatewayStableID: String = ""
    @AppStorage("gateway.lastDiscoveredStableID") private var lastDiscoveredGatewayStableID: String = ""
    @AppStorage("gateway.manual.enabled") private var manualGatewayEnabled: Bool = false
    @AppStorage("gateway.manual.host") private var manualGatewayHost: String = ""
    @AppStorage("gateway.manual.port") private var manualGatewayPort: Int = 18789
    @AppStorage("gateway.manual.tls") private var manualGatewayTLS: Bool = true
    @AppStorage("gateway.discovery.debugLogs") private var discoveryDebugLogsEnabled: Bool = false
    @AppStorage("canvas.debugStatusEnabled") private var canvasDebugStatusEnabled: Bool = false
    @State private var connectStatus = ConnectStatusStore()
    @State private var connectingGatewayID: String?
<<<<<<< HEAD
    @State private var localIPAddress: String?
    @State private var lastLocationModeRaw: String = OpenClawLocationMode.off.rawValue
    @State private var gatewayToken: String = ""
    @State private var gatewayPassword: String = ""
=======
    @State private var lastLocationModeRaw: String = OpenClawLocationMode.off.rawValue
    @State private var gatewayToken: String = ""
    @State private var gatewayPassword: String = ""
    @State private var defaultShareInstruction: String = ""
    @AppStorage("gateway.setupCode") private var setupCode: String = ""
    @State private var setupStatusText: String?
    @State private var manualGatewayPortText: String = ""
    @State private var gatewayExpanded: Bool = true
    @State private var selectedAgentPickerId: String = ""

    @State private var showResetOnboardingAlert: Bool = false
    @State private var activeFeatureHelp: FeatureHelp?
    @State private var suppressCredentialPersist: Bool = false

    private let gatewayLogger = Logger(subsystem: "ai.openclaw.ios", category: "GatewaySettings")
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))

    var body: some View {
        NavigationStack {
            Form {
<<<<<<< HEAD
                Section("Node") {
                    TextField("Name", text: self.$displayName)
                    Text(self.instanceId)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    LabeledContent("IP", value: self.localIPAddress ?? "—")
                        .contextMenu {
                            if let ip = self.localIPAddress {
                                Button {
                                    UIPasteboard.general.string = ip
                                } label: {
                                    Label("Copy", systemImage: "doc.on.doc")
                                }
                            }
                        }
                    LabeledContent("Platform", value: self.platformString())
                    LabeledContent("Version", value: self.appVersion())
                    LabeledContent("Model", value: self.modelIdentifier())
                }

                Section("Gateway") {
                    LabeledContent("Discovery", value: self.gatewayController.discoveryStatusText)
                    LabeledContent("Status", value: self.appModel.gatewayStatusText)
                    if let serverName = self.appModel.gatewayServerName {
                        LabeledContent("Server", value: serverName)
                        if let addr = self.appModel.gatewayRemoteAddress {
                            let parts = Self.parseHostPort(from: addr)
                            let urlString = Self.httpURLString(host: parts?.host, port: parts?.port, fallback: addr)
                            LabeledContent("Address") {
                                Text(urlString)
                            }
                            .contextMenu {
                                Button {
                                    UIPasteboard.general.string = urlString
                                } label: {
                                    Label("Copy URL", systemImage: "doc.on.doc")
                                }

                                if let parts {
                                    Button {
                                        UIPasteboard.general.string = parts.host
                                    } label: {
                                        Label("Copy Host", systemImage: "doc.on.doc")
                                    }

                                    Button {
                                        UIPasteboard.general.string = "\(parts.port)"
                                    } label: {
                                        Label("Copy Port", systemImage: "doc.on.doc")
                                    }
                                }
                            }
                        }

                        Button("Disconnect", role: .destructive) {
                            self.appModel.disconnectGateway()
                        }

                        self.gatewayList(showing: .availableOnly)
                    } else {
                        self.gatewayList(showing: .all)
                    }

                    if let text = self.connectStatus.text {
                        Text(text)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    DisclosureGroup("Advanced") {
                        Toggle("Use Manual Gateway", isOn: self.$manualGatewayEnabled)

                        TextField("Host", text: self.$manualGatewayHost)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        TextField("Port", value: self.$manualGatewayPort, format: .number)
                            .keyboardType(.numberPad)

                        Toggle("Use TLS", isOn: self.$manualGatewayTLS)

                        Button {
                            Task { await self.connectManual() }
                        } label: {
                            if self.connectingGatewayID == "manual" {
                                HStack(spacing: 8) {
                                    ProgressView()
                                        .progressViewStyle(.circular)
                                    Text("Connecting…")
                                }
                            } else {
                                Text("Connect (Manual)")
                            }
                        }
                        .disabled(self.connectingGatewayID != nil || self.manualGatewayHost
                            .trimmingCharacters(in: .whitespacesAndNewlines)
                            .isEmpty || self.manualGatewayPort <= 0 || self.manualGatewayPort > 65535)

                        Text(
                            "Use this when mDNS/Bonjour discovery is blocked. "
                                + "The gateway WebSocket listens on port 18789 by default.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)

                        Toggle("Discovery Debug Logs", isOn: self.$discoveryDebugLogsEnabled)
                            .onChange(of: self.discoveryDebugLogsEnabled) { _, newValue in
                                self.gatewayController.setDiscoveryDebugLoggingEnabled(newValue)
                            }

                        NavigationLink("Discovery Logs") {
                            GatewayDiscoveryDebugLogView()
                        }

                        Toggle("Debug Canvas Status", isOn: self.$canvasDebugStatusEnabled)

                        TextField("Gateway Token", text: self.$gatewayToken)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        SecureField("Gateway Password", text: self.$gatewayPassword)
                    }
                }

                Section("Voice") {
                    Toggle("Voice Wake", isOn: self.$voiceWakeEnabled)
                        .onChange(of: self.voiceWakeEnabled) { _, newValue in
                            self.appModel.setVoiceWakeEnabled(newValue)
                        }
                    Toggle("Talk Mode", isOn: self.$talkEnabled)
                        .onChange(of: self.talkEnabled) { _, newValue in
                            self.appModel.setTalkEnabled(newValue)
                        }
                    // Keep this separate so users can hide the side bubble without disabling Talk Mode.
                    Toggle("Show Talk Button", isOn: self.$talkButtonEnabled)

                    NavigationLink {
                        VoiceWakeWordsSettingsView()
                    } label: {
                        LabeledContent(
                            "Wake Words",
                            value: VoiceWakePreferences.displayString(for: self.voiceWake.triggerWords))
                    }
                }

                Section("Camera") {
                    Toggle("Allow Camera", isOn: self.$cameraEnabled)
                    Text("Allows the gateway to request photos or short video clips (foreground only).")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Location") {
                    Picker("Location Access", selection: self.$locationEnabledModeRaw) {
                        Text("Off").tag(OpenClawLocationMode.off.rawValue)
                        Text("While Using").tag(OpenClawLocationMode.whileUsing.rawValue)
                        Text("Always").tag(OpenClawLocationMode.always.rawValue)
                    }
                    .pickerStyle(.segmented)

                    Toggle("Precise Location", isOn: self.$locationPreciseEnabled)
                        .disabled(self.locationMode == .off)

                    Text("Always requires system permission and may prompt to open Settings.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Screen") {
                    Toggle("Prevent Sleep", isOn: self.$preventSleep)
                    Text("Keeps the screen awake while OpenClaw is open.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
=======
                Section {
                    DisclosureGroup(isExpanded: self.$gatewayExpanded) {
                        if !self.isGatewayConnected {
                            Text(
                                "1. Open Telegram and message your bot: /pair\n"
                                    + "2. Copy the setup code it returns\n"
                                    + "3. Paste here and tap Connect\n"
                                    + "4. Back in Telegram, run /pair approve")
                                .font(.footnote)
                                .foregroundStyle(.secondary)

                            if let warning = self.tailnetWarningText {
                                Text(warning)
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.orange)
                            }

                            TextField("Paste setup code", text: self.$setupCode)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()

                            Button {
                                Task { await self.applySetupCodeAndConnect() }
                            } label: {
                                if self.connectingGatewayID == "manual" {
                                    HStack(spacing: 8) {
                                        ProgressView()
                                            .progressViewStyle(.circular)
                                        Text("Connecting…")
                                    }
                                } else {
                                    Text("Connect with setup code")
                                }
                            }
                            .disabled(self.connectingGatewayID != nil
                                || self.setupCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                            if let status = self.setupStatusLine {
                                Text(status)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        if self.isGatewayConnected {
                            Picker("Bot", selection: self.$selectedAgentPickerId) {
                                Text("Default").tag("")
                                let defaultId = (self.appModel.gatewayDefaultAgentId ?? "")
                                    .trimmingCharacters(in: .whitespacesAndNewlines)
                                ForEach(self.appModel.gatewayAgents.filter { $0.id != defaultId }, id: \.id) { agent in
                                    let name = (agent.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
                                    Text(name.isEmpty ? agent.id : name).tag(agent.id)
                                }
                            }
                            Text("Controls which bot Chat and Talk speak to.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }

                        if self.appModel.gatewayServerName == nil {
                            LabeledContent("Discovery", value: self.gatewayController.discoveryStatusText)
                        }
                        LabeledContent("Status", value: self.appModel.gatewayStatusText)
                        Toggle("Auto-connect on launch", isOn: self.$gatewayAutoConnect)

                        if let serverName = self.appModel.gatewayServerName {
                            LabeledContent("Server", value: serverName)
                            if let addr = self.appModel.gatewayRemoteAddress {
                                let parts = Self.parseHostPort(from: addr)
                                let urlString = Self.httpURLString(host: parts?.host, port: parts?.port, fallback: addr)
                                LabeledContent("Address") {
                                    Text(urlString)
                                }
                                .contextMenu {
                                    Button {
                                        UIPasteboard.general.string = urlString
                                    } label: {
                                        Label("Copy URL", systemImage: "doc.on.doc")
                                    }

                                    if let parts {
                                        Button {
                                            UIPasteboard.general.string = parts.host
                                        } label: {
                                            Label("Copy Host", systemImage: "doc.on.doc")
                                        }

                                        Button {
                                            UIPasteboard.general.string = "\(parts.port)"
                                        } label: {
                                            Label("Copy Port", systemImage: "doc.on.doc")
                                        }
                                    }
                                }
                            }

                            Button("Disconnect", role: .destructive) {
                                self.appModel.disconnectGateway()
                            }
                        } else {
                            self.gatewayList(showing: .all)
                        }

                        DisclosureGroup("Advanced") {
                            Toggle("Use Manual Gateway", isOn: self.$manualGatewayEnabled)

                            TextField("Host", text: self.$manualGatewayHost)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()

                            TextField("Port (optional)", text: self.manualPortBinding)
                                .keyboardType(.numberPad)

                            Toggle("Use TLS", isOn: self.$manualGatewayTLS)

                            Button {
                                Task { await self.connectManual() }
                            } label: {
                                if self.connectingGatewayID == "manual" {
                                    HStack(spacing: 8) {
                                        ProgressView()
                                            .progressViewStyle(.circular)
                                        Text("Connecting…")
                                    }
                                } else {
                                    Text("Connect (Manual)")
                                }
                            }
                            .disabled(self.connectingGatewayID != nil || self.manualGatewayHost
                                .trimmingCharacters(in: .whitespacesAndNewlines)
                                .isEmpty || !self.manualPortIsValid)

                            Text(
                                "Use this when mDNS/Bonjour discovery is blocked. "
                                    + "Leave port empty for 443 on tailnet DNS (TLS) or 18789 otherwise.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)

                            Toggle("Discovery Debug Logs", isOn: self.$discoveryDebugLogsEnabled)
                                .onChange(of: self.discoveryDebugLogsEnabled) { _, newValue in
                                    self.gatewayController.setDiscoveryDebugLoggingEnabled(newValue)
                                }

                            NavigationLink("Discovery Logs") {
                                GatewayDiscoveryDebugLogView()
                            }

                            Toggle("Debug Canvas Status", isOn: self.$canvasDebugStatusEnabled)

                            TextField("Gateway Auth Token", text: self.$gatewayToken)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()

                            SecureField("Gateway Password", text: self.$gatewayPassword)

                            Button("Reset Onboarding", role: .destructive) {
                                self.showResetOnboardingAlert = true
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Debug")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                Text(self.gatewayDebugText())
                                    .font(.system(size: 12, weight: .regular, design: .monospaced))
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(10)
                                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            }
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Circle()
                                .fill(self.isGatewayConnected ? Color.green : Color.secondary.opacity(0.35))
                                .frame(width: 10, height: 10)
                            Text("Gateway")
                            Spacer()
                            Text(self.gatewaySummaryText)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("Device") {
                    DisclosureGroup("Features") {
                        self.featureToggle(
                            "Voice Wake",
                            isOn: self.$voiceWakeEnabled,
                            help: "Enables wake-word activation to start a hands-free session.") { newValue in
                                self.appModel.setVoiceWakeEnabled(newValue)
                            }
                        self.featureToggle(
                            "Talk Mode",
                            isOn: self.$talkEnabled,
                            help: "Enables voice conversation mode with your connected OpenClaw agent.") { newValue in
                                self.appModel.setTalkEnabled(newValue)
                            }
                        self.featureToggle(
                            "Background Listening",
                            isOn: self.$talkBackgroundEnabled,
                            help: "Keeps listening while the app is backgrounded. Uses more battery.")

                        NavigationLink {
                            VoiceWakeWordsSettingsView()
                        } label: {
                            LabeledContent(
                                "Wake Words",
                                value: VoiceWakePreferences.displayString(for: self.voiceWake.triggerWords))
                        }

                        self.featureToggle(
                            "Allow Camera",
                            isOn: self.$cameraEnabled,
                            help: "Allows the gateway to request photos or short video clips while OpenClaw is foregrounded.")

                        HStack(spacing: 8) {
                            Text("Location Access")
                            Spacer()
                            Button {
                                self.activeFeatureHelp = FeatureHelp(
                                    title: "Location Access",
                                    message: "Controls location permissions for OpenClaw. Off disables location tools, While Using enables foreground location, and Always enables background location.")
                            } label: {
                                Image(systemName: "info.circle")
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Location Access info")
                        }
                        Picker("Location Access", selection: self.$locationEnabledModeRaw) {
                            Text("Off").tag(OpenClawLocationMode.off.rawValue)
                            Text("While Using").tag(OpenClawLocationMode.whileUsing.rawValue)
                            Text("Always").tag(OpenClawLocationMode.always.rawValue)
                        }
                        .labelsHidden()
                        .pickerStyle(.segmented)

                        self.featureToggle(
                            "Prevent Sleep",
                            isOn: self.$preventSleep,
                            help: "Keeps the screen awake while OpenClaw is open.")

                        DisclosureGroup("Advanced") {
                            self.featureToggle(
                                "Voice Directive Hint",
                                isOn: self.$talkVoiceDirectiveHintEnabled,
                                help: "Adds voice-switching instructions to Talk prompts. Disable to reduce prompt size.")
                            self.featureToggle(
                                "Show Talk Button",
                                isOn: self.$talkButtonEnabled,
                                help: "Shows the floating Talk button in the main interface.")
                            TextField("Default Share Instruction", text: self.$defaultShareInstruction, axis: .vertical)
                                .lineLimit(2 ... 6)
                                .textInputAutocapitalization(.sentences)
                            HStack(spacing: 8) {
                                Text("Default Share Instruction")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Button {
                                    self.activeFeatureHelp = FeatureHelp(
                                        title: "Default Share Instruction",
                                        message: "Appends this instruction when sharing content into OpenClaw from iOS.")
                                } label: {
                                    Image(systemName: "info.circle")
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Default Share Instruction info")
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                Button {
                                    Task { await self.appModel.runSharePipelineSelfTest() }
                                } label: {
                                    Label("Run Share Self-Test", systemImage: "checkmark.seal")
                                }
                                Text(self.appModel.lastShareEventText)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    DisclosureGroup("Device Info") {
                        TextField("Name", text: self.$displayName)
                        Text(self.instanceId)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        LabeledContent("Device", value: self.deviceFamily())
                        LabeledContent("Platform", value: self.platformString())
                        LabeledContent("OpenClaw", value: self.openClawVersionString())
                    }
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        self.dismiss()
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .accessibilityLabel("Close")
<<<<<<< HEAD
=======
                }
            }
            .alert("Reset Onboarding?", isPresented: self.$showResetOnboardingAlert) {
                Button("Reset", role: .destructive) {
                    self.resetOnboarding()
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
                }
            }
<<<<<<< HEAD
            .onAppear {
                self.localIPAddress = Self.primaryIPv4Address()
                self.lastLocationModeRaw = self.locationEnabledModeRaw
=======
            .alert(item: self.$activeFeatureHelp) { help in
                Alert(
                    title: Text(help.title),
                    message: Text(help.message),
                    dismissButton: .default(Text("OK")))
            }
            .onAppear {
                self.lastLocationModeRaw = self.locationEnabledModeRaw
                self.syncManualPortText()
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
                let trimmedInstanceId = self.instanceId.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmedInstanceId.isEmpty {
                    self.gatewayToken = GatewaySettingsStore.loadGatewayToken(instanceId: trimmedInstanceId) ?? ""
                    self.gatewayPassword = GatewaySettingsStore.loadGatewayPassword(instanceId: trimmedInstanceId) ?? ""
                }
<<<<<<< HEAD
=======
                self.defaultShareInstruction = ShareToAgentSettings.loadDefaultInstruction()
                self.appModel.refreshLastShareEventFromRelay()
                // Keep setup front-and-center when disconnected; keep things compact once connected.
                self.gatewayExpanded = !self.isGatewayConnected
                self.selectedAgentPickerId = self.appModel.selectedAgentId ?? ""
            }
            .onChange(of: self.selectedAgentPickerId) { _, newValue in
                let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                self.appModel.setSelectedAgentId(trimmed.isEmpty ? nil : trimmed)
            }
            .onChange(of: self.appModel.selectedAgentId ?? "") { _, newValue in
                if newValue != self.selectedAgentPickerId {
                    self.selectedAgentPickerId = newValue
                }
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
            }
            .onChange(of: self.preferredGatewayStableID) { _, newValue in
                let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmed.isEmpty else { return }
                GatewaySettingsStore.savePreferredGatewayStableID(trimmed)
            }
            .onChange(of: self.gatewayToken) { _, newValue in
<<<<<<< HEAD
=======
                guard !self.suppressCredentialPersist else { return }
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
                let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                let instanceId = self.instanceId.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !instanceId.isEmpty else { return }
                GatewaySettingsStore.saveGatewayToken(trimmed, instanceId: instanceId)
            }
            .onChange(of: self.gatewayPassword) { _, newValue in
<<<<<<< HEAD
=======
                guard !self.suppressCredentialPersist else { return }
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
                let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                let instanceId = self.instanceId.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !instanceId.isEmpty else { return }
                GatewaySettingsStore.saveGatewayPassword(trimmed, instanceId: instanceId)
            }
            .onChange(of: self.appModel.gatewayServerName) { _, _ in
                self.connectStatus.text = nil
            }
<<<<<<< HEAD
=======
            .onChange(of: self.manualGatewayPort) { _, _ in
                self.syncManualPortText()
            }
            .onChange(of: self.appModel.gatewayServerName) { _, newValue in
                if newValue != nil {
                    self.setupCode = ""
                    self.setupStatusText = nil
                    return
                }
                if self.manualGatewayEnabled {
                    self.setupStatusText = self.appModel.gatewayStatusText
                }
            }
            .onChange(of: self.appModel.gatewayStatusText) { _, newValue in
                guard self.manualGatewayEnabled || self.connectingGatewayID == "manual" else { return }
                let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmed.isEmpty else { return }
                self.setupStatusText = trimmed
            }
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
            .onChange(of: self.locationEnabledModeRaw) { _, newValue in
                let previous = self.lastLocationModeRaw
                self.lastLocationModeRaw = newValue
                guard let mode = OpenClawLocationMode(rawValue: newValue) else { return }
                Task {
                    let granted = await self.appModel.requestLocationPermissions(mode: mode)
                    if !granted {
                        await MainActor.run {
                            self.locationEnabledModeRaw = previous
                            self.lastLocationModeRaw = previous
                        }
                        return
                    }
<<<<<<< HEAD
=======
                    await MainActor.run {
                        self.gatewayController.refreshActiveGatewayRegistrationFromSettings()
                    }
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
                }
            }
        }
        .gatewayTrustPromptAlert()
    }

    @ViewBuilder
    private func gatewayList(showing: GatewayListMode) -> some View {
        if self.gatewayController.gateways.isEmpty {
<<<<<<< HEAD
            Text("No gateways found yet.")
                .foregroundStyle(.secondary)
=======
            VStack(alignment: .leading, spacing: 12) {
                Text("No gateways found yet.")
                    .foregroundStyle(.secondary)
                Text("If your gateway is on another network, connect it and ensure DNS is working.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if let lastKnown = GatewaySettingsStore.loadLastGatewayConnection(),
                   case let .manual(host, port, _, _) = lastKnown
                {
                    Button {
                        Task { await self.connectLastKnown() }
                    } label: {
                        self.lastKnownButtonLabel(host: host, port: port)
                    }
                    .disabled(self.connectingGatewayID != nil)
                    .buttonStyle(.borderedProminent)
                    .tint(self.appModel.seamColor)
                }
            }
>>>>>>> 054366dea (fix(security): require explicit trust for first-time TLS pins)
        } else {
            let connectedID = self.appModel.connectedGatewayID
            let rows = self.gatewayController.gateways.filter { gateway in
                let isConnected = gateway.stableID == connectedID
                switch showing {
                case .all:
                    return true
                case .availableOnly:
                    return !isConnected
                }
            }

            if rows.isEmpty, showing == .availableOnly {
                Text("No other gateways found.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(rows) { gateway in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(gateway.name)
                            let detailLines = self.gatewayDetailLines(gateway)
                            ForEach(detailLines, id: \.self) { line in
                                Text(line)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()

                        Button {
                            Task { await self.connect(gateway) }
                        } label: {
                            if self.connectingGatewayID == gateway.id {
                                ProgressView()
                                    .progressViewStyle(.circular)
                            } else {
                                Text("Connect")
                            }
                        }
                        .disabled(self.connectingGatewayID != nil)
                    }
                }
            }
        }
    }

    private enum GatewayListMode: Equatable {
        case all
        case availableOnly
    }

    private func platformString() -> String {
        let v = ProcessInfo.processInfo.operatingSystemVersion
        return "iOS \(v.majorVersion).\(v.minorVersion).\(v.patchVersion)"
    }

    private var locationMode: OpenClawLocationMode {
        OpenClawLocationMode(rawValue: self.locationEnabledModeRaw) ?? .off
    }

    private func appVersion() -> String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"
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
<<<<<<< HEAD
        let trimmed = machine?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "unknown" : trimmed
=======
        return "\(version) (\(trimmedBuild))"
    }

    private func featureToggle(
        _ title: String,
        isOn: Binding<Bool>,
        help: String,
        onChange: ((Bool) -> Void)? = nil
    ) -> some View {
        HStack(spacing: 8) {
            Toggle(title, isOn: isOn)
            Button {
                self.activeFeatureHelp = FeatureHelp(title: title, message: help)
            } label: {
                Image(systemName: "info.circle")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(title) info")
        }
        .onChange(of: isOn.wrappedValue) { _, newValue in
            onChange?(newValue)
        }
>>>>>>> 4ab946eeb (Discord VC: voice channels, transcription, and TTS (#18774))
    }

    private func connect(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) async {
        self.connectingGatewayID = gateway.id
        self.manualGatewayEnabled = false
        self.preferredGatewayStableID = gateway.stableID
        GatewaySettingsStore.savePreferredGatewayStableID(gateway.stableID)
        self.lastDiscoveredGatewayStableID = gateway.stableID
        GatewaySettingsStore.saveLastDiscoveredGatewayStableID(gateway.stableID)
        defer { self.connectingGatewayID = nil }

        await self.gatewayController.connect(gateway)
    }

    private func connectManual() async {
        let host = self.manualGatewayHost.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !host.isEmpty else {
            self.connectStatus.text = "Failed: host required"
            return
        }
        guard self.manualGatewayPort > 0, self.manualGatewayPort <= 65535 else {
            self.connectStatus.text = "Failed: invalid port"
            return
        }

        self.connectingGatewayID = "manual"
        self.manualGatewayEnabled = true
        defer { self.connectingGatewayID = nil }

        await self.gatewayController.connectManual(
            host: host,
            port: self.manualGatewayPort,
            useTLS: self.manualGatewayTLS)
    }

    private static func primaryIPv4Address() -> String? {
        var addrList: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&addrList) == 0, let first = addrList else { return nil }
        defer { freeifaddrs(addrList) }

        var fallback: String?
        var en0: String?

        for ptr in sequence(first: first, next: { $0.pointee.ifa_next }) {
            let flags = Int32(ptr.pointee.ifa_flags)
            let isUp = (flags & IFF_UP) != 0
            let isLoopback = (flags & IFF_LOOPBACK) != 0
            let name = String(cString: ptr.pointee.ifa_name)
            let family = ptr.pointee.ifa_addr.pointee.sa_family
            if !isUp || isLoopback || family != UInt8(AF_INET) { continue }

            var addr = ptr.pointee.ifa_addr.pointee
            var buffer = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let result = getnameinfo(
                &addr,
                socklen_t(ptr.pointee.ifa_addr.pointee.sa_len),
                &buffer,
                socklen_t(buffer.count),
                nil,
                0,
                NI_NUMERICHOST)
            guard result == 0 else { continue }
            let len = buffer.prefix { $0 != 0 }
            let bytes = len.map { UInt8(bitPattern: $0) }
            guard let ip = String(bytes: bytes, encoding: .utf8) else { continue }

            if name == "en0" { en0 = ip; break }
            if fallback == nil { fallback = ip }
        }

        return en0 ?? fallback
    }

    private static func parseHostPort(from address: String) -> SettingsHostPort? {
        SettingsNetworkingHelpers.parseHostPort(from: address)
    }

    private static func httpURLString(host: String?, port: Int?, fallback: String) -> String {
        SettingsNetworkingHelpers.httpURLString(host: host, port: port, fallback: fallback)
    }

    private func gatewayDetailLines(_ gateway: GatewayDiscoveryModel.DiscoveredGateway) -> [String] {
        var lines: [String] = []
        if let lanHost = gateway.lanHost { lines.append("LAN: \(lanHost)") }
        if let tailnet = gateway.tailnetDns { lines.append("Tailnet: \(tailnet)") }

        let gatewayPort = gateway.gatewayPort
        let canvasPort = gateway.canvasPort
        if gatewayPort != nil || canvasPort != nil {
            let gw = gatewayPort.map(String.init) ?? "—"
            let canvas = canvasPort.map(String.init) ?? "—"
            lines.append("Ports: gateway \(gw) · canvas \(canvas)")
        }

        if lines.isEmpty {
            lines.append(gateway.debugID)
        }

        return lines
    }
}
