import CoreLocation
import Testing
<<<<<<< HEAD:apps/macos/Tests/MoltbotIPCTests/PermissionManagerLocationTests.swift
@testable import Moltbot
=======
@testable import OpenClaw
>>>>>>> 7b3f506e6 (style(swift): apply swiftformat and swiftlint fixes):apps/macos/Tests/OpenClawIPCTests/PermissionManagerLocationTests.swift

@Suite("PermissionManager Location")
struct PermissionManagerLocationTests {
    @Test("authorizedAlways counts for both modes")
    func authorizedAlwaysCountsForBothModes() {
        #expect(PermissionManager.isLocationAuthorized(status: .authorizedAlways, requireAlways: false))
        #expect(PermissionManager.isLocationAuthorized(status: .authorizedAlways, requireAlways: true))
    }

    @Test("other statuses not authorized")
    func otherStatusesNotAuthorized() {
        #expect(!PermissionManager.isLocationAuthorized(status: .notDetermined, requireAlways: false))
        #expect(!PermissionManager.isLocationAuthorized(status: .denied, requireAlways: false))
        #expect(!PermissionManager.isLocationAuthorized(status: .restricted, requireAlways: false))
    }
}
