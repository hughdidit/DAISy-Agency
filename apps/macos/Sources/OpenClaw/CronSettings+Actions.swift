<<<<<<< HEAD:apps/macos/Sources/Moltbot/CronSettings+Actions.swift
=======
import OpenClawProtocol
>>>>>>> 9a7160786 (refactor: rename to openclaw):apps/macos/Sources/OpenClaw/CronSettings+Actions.swift
import Foundation
import MoltbotProtocol

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
