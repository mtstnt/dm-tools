import { getEvents } from "@/app/actions/events/list"
import { getEventDetail } from "@/app/actions/events/detail"
import { updateUserBlocks } from "@/app/actions/events/user-blocks/update"
import { removeUserBlock } from "@/app/actions/events/user-blocks/delete"
import { updateEventUsers } from "@/app/actions/events/update"
import { type LegacyWebContext } from "@/app/actions/_shared"
import { type EventDetail } from "@/lib/parsers/events"

export const eventKeys = {
  all: ["events"] as const,
  detail: (id: string) => ["events", id] as const,
}

export { getEvents, getEventDetail, updateUserBlocks, removeUserBlock, updateEventUsers, type LegacyWebContext, type EventDetail }
