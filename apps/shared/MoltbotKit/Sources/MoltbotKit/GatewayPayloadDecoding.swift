import MoltbotProtocol
import Foundation

public enum GatewayPayloadDecoding {
    public static func decode<T: Decodable>(
<<<<<<< HEAD:apps/shared/MoltbotKit/Sources/MoltbotKit/GatewayPayloadDecoding.swift
        _ payload: MoltbotProtocol.AnyCodable,
        as _: T.Type = T.self) throws -> T
    {
        let data = try JSONEncoder().encode(payload)
        return try JSONDecoder().decode(T.self, from: data)
    }

    public static func decode<T: Decodable>(
=======
>>>>>>> a3419e48a (refactor(swift): dedupe AnyCodable):apps/shared/OpenClawKit/Sources/OpenClawKit/GatewayPayloadDecoding.swift
        _ payload: AnyCodable,
        as _: T.Type = T.self) throws -> T
    {
        let data = try JSONEncoder().encode(payload)
        return try JSONDecoder().decode(T.self, from: data)
    }

    public static func decodeIfPresent<T: Decodable>(
<<<<<<< HEAD:apps/shared/MoltbotKit/Sources/MoltbotKit/GatewayPayloadDecoding.swift
        _ payload: MoltbotProtocol.AnyCodable?,
        as _: T.Type = T.self) throws -> T?
    {
        guard let payload else { return nil }
        return try self.decode(payload, as: T.self)
    }

    public static func decodeIfPresent<T: Decodable>(
=======
>>>>>>> a3419e48a (refactor(swift): dedupe AnyCodable):apps/shared/OpenClawKit/Sources/OpenClawKit/GatewayPayloadDecoding.swift
        _ payload: AnyCodable?,
        as _: T.Type = T.self) throws -> T?
    {
        guard let payload else { return nil }
        return try self.decode(payload, as: T.self)
    }
}
