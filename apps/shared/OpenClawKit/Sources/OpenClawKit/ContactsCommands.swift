import Foundation

public enum OpenClawContactsCommand: String, Codable, Sendable {
    case search = "contacts.search"
<<<<<<< HEAD:apps/shared/MoltbotKit/Sources/MoltbotKit/ContactsCommands.swift
=======
    case add = "contacts.add"
>>>>>>> 6aedc54bd (iOS: alpha node app + setup-code onboarding (#11756)):apps/shared/OpenClawKit/Sources/OpenClawKit/ContactsCommands.swift
}

public struct OpenClawContactsSearchParams: Codable, Sendable, Equatable {
    public var query: String?
    public var limit: Int?

    public init(query: String? = nil, limit: Int? = nil) {
        self.query = query
        self.limit = limit
    }
}

<<<<<<< HEAD:apps/shared/MoltbotKit/Sources/MoltbotKit/ContactsCommands.swift
=======
public struct OpenClawContactsAddParams: Codable, Sendable, Equatable {
    public var givenName: String?
    public var familyName: String?
    public var organizationName: String?
    public var displayName: String?
    public var phoneNumbers: [String]?
    public var emails: [String]?

    public init(
        givenName: String? = nil,
        familyName: String? = nil,
        organizationName: String? = nil,
        displayName: String? = nil,
        phoneNumbers: [String]? = nil,
        emails: [String]? = nil)
    {
        self.givenName = givenName
        self.familyName = familyName
        self.organizationName = organizationName
        self.displayName = displayName
        self.phoneNumbers = phoneNumbers
        self.emails = emails
    }
}

>>>>>>> 6aedc54bd (iOS: alpha node app + setup-code onboarding (#11756)):apps/shared/OpenClawKit/Sources/OpenClawKit/ContactsCommands.swift
public struct OpenClawContactPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var displayName: String
    public var givenName: String
    public var familyName: String
    public var organizationName: String
    public var phoneNumbers: [String]
    public var emails: [String]

    public init(
        identifier: String,
        displayName: String,
        givenName: String,
        familyName: String,
        organizationName: String,
        phoneNumbers: [String],
        emails: [String])
    {
        self.identifier = identifier
        self.displayName = displayName
        self.givenName = givenName
        self.familyName = familyName
        self.organizationName = organizationName
        self.phoneNumbers = phoneNumbers
        self.emails = emails
    }
}

public struct OpenClawContactsSearchPayload: Codable, Sendable, Equatable {
    public var contacts: [OpenClawContactPayload]

    public init(contacts: [OpenClawContactPayload]) {
        self.contacts = contacts
    }
}
<<<<<<< HEAD:apps/shared/MoltbotKit/Sources/MoltbotKit/ContactsCommands.swift
=======

public struct OpenClawContactsAddPayload: Codable, Sendable, Equatable {
    public var contact: OpenClawContactPayload

    public init(contact: OpenClawContactPayload) {
        self.contact = contact
    }
}
>>>>>>> 6aedc54bd (iOS: alpha node app + setup-code onboarding (#11756)):apps/shared/OpenClawKit/Sources/OpenClawKit/ContactsCommands.swift
