import Foundation

public enum OpenClawCalendarCommand: String, Codable, Sendable {
    case events = "calendar.events"
<<<<<<< HEAD:apps/shared/MoltbotKit/Sources/MoltbotKit/CalendarCommands.swift
=======
    case add = "calendar.add"
>>>>>>> 6aedc54bd (iOS: alpha node app + setup-code onboarding (#11756)):apps/shared/OpenClawKit/Sources/OpenClawKit/CalendarCommands.swift
}

public struct OpenClawCalendarEventsParams: Codable, Sendable, Equatable {
    public var startISO: String?
    public var endISO: String?
    public var limit: Int?

    public init(startISO: String? = nil, endISO: String? = nil, limit: Int? = nil) {
        self.startISO = startISO
        self.endISO = endISO
        self.limit = limit
    }
}

<<<<<<< HEAD:apps/shared/MoltbotKit/Sources/MoltbotKit/CalendarCommands.swift
=======
public struct OpenClawCalendarAddParams: Codable, Sendable, Equatable {
    public var title: String
    public var startISO: String
    public var endISO: String
    public var isAllDay: Bool?
    public var location: String?
    public var notes: String?
    public var calendarId: String?
    public var calendarTitle: String?

    public init(
        title: String,
        startISO: String,
        endISO: String,
        isAllDay: Bool? = nil,
        location: String? = nil,
        notes: String? = nil,
        calendarId: String? = nil,
        calendarTitle: String? = nil)
    {
        self.title = title
        self.startISO = startISO
        self.endISO = endISO
        self.isAllDay = isAllDay
        self.location = location
        self.notes = notes
        self.calendarId = calendarId
        self.calendarTitle = calendarTitle
    }
}

>>>>>>> 6aedc54bd (iOS: alpha node app + setup-code onboarding (#11756)):apps/shared/OpenClawKit/Sources/OpenClawKit/CalendarCommands.swift
public struct OpenClawCalendarEventPayload: Codable, Sendable, Equatable {
    public var identifier: String
    public var title: String
    public var startISO: String
    public var endISO: String
    public var isAllDay: Bool
    public var location: String?
    public var calendarTitle: String?

    public init(
        identifier: String,
        title: String,
        startISO: String,
        endISO: String,
        isAllDay: Bool,
        location: String? = nil,
        calendarTitle: String? = nil)
    {
        self.identifier = identifier
        self.title = title
        self.startISO = startISO
        self.endISO = endISO
        self.isAllDay = isAllDay
        self.location = location
        self.calendarTitle = calendarTitle
    }
}

public struct OpenClawCalendarEventsPayload: Codable, Sendable, Equatable {
    public var events: [OpenClawCalendarEventPayload]

    public init(events: [OpenClawCalendarEventPayload]) {
        self.events = events
    }
}
<<<<<<< HEAD:apps/shared/MoltbotKit/Sources/MoltbotKit/CalendarCommands.swift
=======

public struct OpenClawCalendarAddPayload: Codable, Sendable, Equatable {
    public var event: OpenClawCalendarEventPayload

    public init(event: OpenClawCalendarEventPayload) {
        self.event = event
    }
}
>>>>>>> 6aedc54bd (iOS: alpha node app + setup-code onboarding (#11756)):apps/shared/OpenClawKit/Sources/OpenClawKit/CalendarCommands.swift
