import { fetchEvents } from "@/app/actions"
import { type Event } from "@/lib/parsers/events"

export const eventKeys = {
  all: ["events"] as const,
}

export { fetchEvents, type Event }
