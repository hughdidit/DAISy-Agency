import Foundation
<<<<<<< HEAD:apps/macos/Sources/Moltbot/CronSettings+Actions.swift
import MoltbotProtocol
=======
import OpenClawProtocol
>>>>>>> 8725c2b19 (style(swift): run swiftformat + swiftlint autocorrect):apps/macos/Sources/OpenClaw/CronSettings+Actions.swift

extension CronSettings {
    func save(payload: [String: AnyCodable]) async {
        guard !self.isSaving else { return }
        self.isSaving = true
        self.editorError = nil
        do {
            try await self.store.upsertJob(id: self.editingJob?.id, payload: payload)
            await MainActor.run {
                self.isSaving = false
                self.showEditor = false
                self.editingJob = nil
            }
        } catch {
            await MainActor.run {
                self.isSaving = false
                self.editorError = error.localizedDescription
            }
        }
    }
}
