<<<<<<< HEAD:apps/macos/Sources/Moltbot/AnyCodable+Helpers.swift
import Foundation
import MoltbotKit
import MoltbotProtocol
=======
import OpenClawKit
import OpenClawProtocol
import Foundation
>>>>>>> 9a7160786 (refactor: rename to openclaw):apps/macos/Sources/OpenClaw/AnyCodable+Helpers.swift

// Prefer the OpenClawKit wrapper to keep gateway request payloads consistent.
typealias AnyCodable = OpenClawKit.AnyCodable
typealias InstanceIdentity = OpenClawKit.InstanceIdentity

extension AnyCodable {
    var stringValue: String? {
        self.value as? String
    }

    var boolValue: Bool? {
        self.value as? Bool
    }

    var intValue: Int? {
        self.value as? Int
    }

    var doubleValue: Double? {
        self.value as? Double
    }

    var dictionaryValue: [String: AnyCodable]? {
        self.value as? [String: AnyCodable]
    }

    var arrayValue: [AnyCodable]? {
        self.value as? [AnyCodable]
    }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}

<<<<<<< HEAD:apps/macos/Sources/Moltbot/AnyCodable+Helpers.swift
extension MoltbotProtocol.AnyCodable {
    var stringValue: String? {
        self.value as? String
    }

    var boolValue: Bool? {
        self.value as? Bool
    }

    var intValue: Int? {
        self.value as? Int
    }

    var doubleValue: Double? {
        self.value as? Double
    }

    var dictionaryValue: [String: MoltbotProtocol.AnyCodable]? {
        self.value as? [String: MoltbotProtocol.AnyCodable]
    }

    var arrayValue: [MoltbotProtocol.AnyCodable]? {
        self.value as? [MoltbotProtocol.AnyCodable]
    }
=======
extension OpenClawProtocol.AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: OpenClawProtocol.AnyCodable]? { self.value as? [String: OpenClawProtocol.AnyCodable] }
    var arrayValue: [OpenClawProtocol.AnyCodable]? { self.value as? [OpenClawProtocol.AnyCodable] }
>>>>>>> 9a7160786 (refactor: rename to openclaw):apps/macos/Sources/OpenClaw/AnyCodable+Helpers.swift

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: OpenClawProtocol.AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [OpenClawProtocol.AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}
