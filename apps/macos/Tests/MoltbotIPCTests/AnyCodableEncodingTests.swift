import Foundation
<<<<<<< HEAD:apps/macos/Tests/MoltbotIPCTests/AnyCodableEncodingTests.swift
import MoltbotProtocol
import Testing
@testable import Moltbot
=======
import OpenClawProtocol
import Testing
@testable import OpenClaw
>>>>>>> 7b3f506e6 (style(swift): apply swiftformat and swiftlint fixes):apps/macos/Tests/OpenClawIPCTests/AnyCodableEncodingTests.swift

@Suite struct AnyCodableEncodingTests {
    @Test func encodesSwiftArrayAndDictionaryValues() throws {
        let payload: [String: Any] = [
            "tags": ["node", "ios"],
            "meta": ["count": 2],
            "null": NSNull(),
        ]

        let data = try JSONEncoder().encode(MoltbotProtocol.AnyCodable(payload))
        let obj = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])

        #expect(obj["tags"] as? [String] == ["node", "ios"])
        #expect((obj["meta"] as? [String: Any])?["count"] as? Int == 2)
        #expect(obj["null"] is NSNull)
    }

    @Test func protocolAnyCodableEncodesPrimitiveArrays() throws {
        let payload: [String: Any] = [
            "items": [1, "two", NSNull(), ["ok": true]],
        ]

        let data = try JSONEncoder().encode(MoltbotProtocol.AnyCodable(payload))
        let obj = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])

        let items = try #require(obj["items"] as? [Any])
        #expect(items.count == 4)
        #expect(items[0] as? Int == 1)
        #expect(items[1] as? String == "two")
        #expect(items[2] is NSNull)
        #expect((items[3] as? [String: Any])?["ok"] as? Bool == true)
    }
}
