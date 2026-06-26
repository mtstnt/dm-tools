import { fetchEvents, fetchEventEditPage } from "@/app/actions"
import { type EventDetail } from "@/lib/parsers/events"

export const eventKeys = {
  all: ["events"] as const,
  detail: (eventId: string) => ["events", eventId] as const,
}

export { fetchEvents, fetchEventEditPage, type EventDetail }
