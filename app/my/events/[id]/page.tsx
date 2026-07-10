"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getEventSchedule, type EventScheduleItem } from "@/actions/events"
import { getMinistries, type Ministry } from "@/actions/master/ministries"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  AssignmentTab,
} from "./_components/assignment-tab"
import { SeatingTab } from "./_components/seating-tab"
import { ReportingTab } from "./_components/reporting-tab"
import type { EventArea, EventAssignedUser, EventUser } from "@/types/event"
import { DUMMY_EVENTS } from "@/lib/dummy-data"

type FetchStatus = "idle" | "loading" | "success" | "error"

const DUMMY_EVENT = {
  id: 1001,
  name: "AOG Teen South",
  date: new Date(2026, 6, 4, 16, 0),
  status: "pending" as const,
  regionName: "GMS Surabaya Selatan",
  eventTypeName: "Youth Service",
}

const DUMMY_SEATING_AREAS: EventArea[] = [
  {
    id: 1,
    name: "A",
    blocks: [
      { id: 1, name: "A1", row: 5, column: 8, userIds: [], chairs: Array.from({ length: 5 }, () => Array(8).fill(0)) },
      { id: 2, name: "A2", row: 4, column: 6, userIds: [], chairs: Array.from({ length: 4 }, () => Array(6).fill(0)) },
      { id: 3, name: "A3", row: 6, column: 10, userIds: [], chairs: Array.from({ length: 6 }, () => Array(10).fill(0)) },
    ],
  },
  {
    id: 2,
    name: "B",
    blocks: [
      { id: 4, name: "B1", row: 3, column: 5, userIds: [], chairs: Array.from({ length: 3 }, () => Array(5).fill(0)) },
      { id: 5, name: "B2", row: 2, column: 4, userIds: [], chairs: Array.from({ length: 2 }, () => Array(4).fill(0)) },
    ],
  },
  { id: 3, name: "C", blocks: [] },
]

const DUMMY_USERS: EventUser[] = [
  { id: 1, fullName: "JOHN DOE", email: "john@example.com" },
  { id: 2, fullName: "JANE SMITH", email: "jane@example.com" },
  { id: 3, fullName: "BOB WILSON", email: "bob@example.com" },
  { id: 4, fullName: "ALICE BROWN", email: "alice@example.com" },
  { id: 5, fullName: "CHARLIE DAVIS", email: "charlie@example.com" },
]

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  incomplete: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
}

function formatDateDisplay(date: Date) {
  const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ]
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-40 mt-2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.id as string
  const [status, setStatus] = useState<FetchStatus>("loading")
  const [assignments, setAssignments] = useState<EventAssignedUser[]>([])
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [availableEvents, setAvailableEvents] = useState<EventScheduleItem[]>([])

  useEffect(() => {
    async function load() {
      const [ministriesResult, eventsResult] = await Promise.all([
        getMinistries(),
        getEventSchedule(),
      ])
      if (ministriesResult.success && ministriesResult.data) {
        setMinistries(ministriesResult.data)
      }
      if (eventsResult.success) {
        setAvailableEvents([...DUMMY_EVENTS, ...(eventsResult.data ?? [])])
      } else {
        setAvailableEvents(DUMMY_EVENTS)
      }
      setAssignments([
        { ...DUMMY_USERS[0], assignedBlocks: [1, 3] },
        { ...DUMMY_USERS[1], assignedBlocks: [2] },
      ])
      setStatus("success")
    }
    const timer = setTimeout(() => { load() }, 600)
    return () => clearTimeout(timer)
  }, [eventId])

  function handleAssign(userIds: number[], blockIds: number[]) {
    setAssignments((prev) => {
      const next = [...prev]
      for (const userId of userIds) {
        const existing = next.find((assignment) => assignment.id === userId)
        if (existing) {
          existing.assignedBlocks = [...new Set([...existing.assignedBlocks, ...blockIds])]
        } else {
          const user = DUMMY_USERS.find((candidate) => candidate.id === userId)
          if (user) next.push({ ...user, assignedBlocks: [...blockIds] })
        }
      }
      return next
    })
  }

  function handleRemoveBlock(userId: number, blockId: number) {
    setAssignments((prev) =>
      prev
        .map((a) =>
          a.id === userId
            ? { ...a, assignedBlocks: a.assignedBlocks.filter((id) => id !== blockId) }
            : a,
        )
    )
  }

  function handleRemoveUser(userId: number) {
    setAssignments((prev) => prev.filter((assignment) => assignment.id !== userId))
  }

  return (
    <div className="space-y-6">
      {status === "loading" && <LoadingSkeleton />}

      {status === "success" && (
        <>
          <div>
            <Link
              href="/my/events"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "w-fit px-0 mb-3",
              )}
            >
              <ArrowLeft className="size-4" />
              Back to events
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.1]">
                  {DUMMY_EVENT.name}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {formatDateDisplay(DUMMY_EVENT.date)}
                  {` · ${DUMMY_EVENT.regionName}`}
                </p>
              </div>
              <Badge className={cn("w-fit capitalize", STATUS_STYLES[DUMMY_EVENT.status])}>
                {DUMMY_EVENT.status}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="assignment" className="w-full">
            <TabsList variant="line" className="w-full">
              <TabsTrigger value="assignment" className="flex-1 px-4 pb-4 pt-2 text-sm font-semibold">Assignment</TabsTrigger>
              <TabsTrigger value="seating" className="flex-1 px-4 pb-4 pt-2 text-sm font-semibold">Seating</TabsTrigger>
              <TabsTrigger value="reporting" className="flex-1 px-4 pb-4 pt-2 text-sm font-semibold">Reporting</TabsTrigger>
            </TabsList>

            <TabsContent value="assignment">
              <AssignmentTab
                allUsers={DUMMY_USERS}
                areas={DUMMY_SEATING_AREAS}
                users={assignments}
                onAssignAction={handleAssign}
                onRemoveBlockAction={handleRemoveBlock}
                onRemoveUserAction={handleRemoveUser}
              />
            </TabsContent>

            <TabsContent value="seating">
              <SeatingTab areas={DUMMY_SEATING_AREAS} />
            </TabsContent>

            <TabsContent value="reporting">
              <ReportingTab
                eventName={DUMMY_EVENT.name}
                eventDate={DUMMY_EVENT.date}
                initialMinistries={ministries}
                availableEvents={availableEvents}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
