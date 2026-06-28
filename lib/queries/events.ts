import { fetchEvents, fetchEventEditPage, updateUserBlocks } from "@/app/actions"
import { type EventDetail } from "@/lib/parsers/events"

export const eventKeys = {
  all: ["events"] as const,
  detail: (eventId: string) => ["events", eventId] as const,
}

export { fetchEvents, fetchEventEditPage, updateUserBlocks, type EventDetail }
