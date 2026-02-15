import Foundation

final class CanvasFileWatcher: @unchecked Sendable {
    private let watcher: CoalescingFSEventsWatcher

    init(url: URL, onChange: @escaping () -> Void) {
<<<<<<< HEAD:apps/macos/Sources/Moltbot/CanvasFileWatcher.swift
        self.url = url
        self.queue = DispatchQueue(label: "bot.molt.canvaswatcher")
        self.onChange = onChange
=======
        self.watcher = CoalescingFSEventsWatcher(
            paths: [url.path],
            queueLabel: "ai.openclaw.canvaswatcher",
            onChange: onChange)
>>>>>>> 375e16170 (refactor(macos): dedupe file watcher):apps/macos/Sources/OpenClaw/CanvasFileWatcher.swift
    }

    deinit {
        self.stop()
    }

    func start() {
        self.watcher.start()
    }

    func stop() {
        self.watcher.stop()
    }
}
