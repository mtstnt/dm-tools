import { getEvents } from "@/app/actions/events/list"
import { getEventDetail } from "@/app/actions/events/detail"
import { updateUserBlocks } from "@/app/actions/events/user-blocks/update"
import { removeUserBlock } from "@/app/actions/events/user-blocks/delete"
import { type LegacyWebContext } from "@/app/actions/_shared"
import { type EventDetail } from "@/lib/parsers/events"

export const eventKeys = {
  all: ["events"] as const,
  detail: (id: string) => ["events", id] as const,
}

export { getEvents, getEventDetail, updateUserBlocks, removeUserBlock, type LegacyWebContext, type EventDetail }
