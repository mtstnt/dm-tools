import { getEvents } from "@/actions/legacy-web/events/list"
import { getEventDetail } from "@/actions/legacy-web/events/detail"
import { updateUserBlocks } from "@/actions/legacy-web/events/user-blocks/update"
import { removeUserBlock } from "@/actions/legacy-web/events/user-blocks/delete"
import { updateEventUsers } from "@/actions/legacy-web/events/update"
import { updateBlock } from "@/actions/legacy-web/events/blocks/update"
import { type LegacyWebContext } from "@/actions/legacy-web/_shared"
import { type EventInfo } from "@/lib/parsers/events"

export const eventKeys = {
  all: ["events"] as const,
  detail: (id: string) => ["events", id] as const,
}

export { getEvents, getEventDetail, updateUserBlocks, removeUserBlock, updateEventUsers, updateBlock, type LegacyWebContext, type EventInfo }
