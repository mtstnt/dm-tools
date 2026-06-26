import { fetchEvents, fetchEventEditPage } from "@/app/actions"
import { type EventDetail } from "@/lib/parsers/events"
import { type ParsedResult, type Area } from "@/lib/parsers/event-details"

export const eventKeys = {
  all: ["events"] as const,
  detail: (eventId: string) => ["events", eventId] as const,
}

export { fetchEvents, fetchEventEditPage, type EventDetail, type ParsedResult, type Area }
