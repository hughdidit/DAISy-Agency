import Foundation

final class CanvasFileWatcher: @unchecked Sendable {
    private let watcher: CoalescingFSEventsWatcher

    init(url: URL, onChange: @escaping () -> Void) {
        self.url = url
        self.queue = DispatchQueue(label: "bot.molt.canvaswatcher")
        self.onChange = onChange
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
