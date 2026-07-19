"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  getEventDetail,
  getEventSchedule,
  type EventDetailData,
  type EventScheduleItem,
} from "@/actions/events"
import { getMinistries, type Ministry } from "@/actions/master/ministries"
import { getTasks, type Task } from "@/actions/master/tasks"
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
import { ConfigurationTab } from "./_components/configuration-tab"
import type { EventArea, EventAssignedUser, EventUser } from "@/types/event"

type FetchStatus = "idle" | "loading" | "success" | "error"

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [availableEvents, setAvailableEvents] = useState<EventScheduleItem[]>([])
  const [event, setEvent] = useState<EventDetailData | null>(null)
  const [allUsers, setAllUsers] = useState<EventUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const seatingAreas: EventArea[] = []

  useEffect(() => {
    async function load() {
      const id = Number(eventId)
      if (!Number.isInteger(id) || id <= 0) {
        setError("Event not found")
        setStatus("error")
        return
      }

      const now = new Date();
      const [eventResult, ministriesResult, eventsResult, tasksResult] = await Promise.all([
        getEventDetail(id),
        getMinistries(),
        getEventSchedule(now.getMonth(), now.getFullYear()),
        getTasks(),
      ])
      if (!eventResult.success || !eventResult.data) {
        setError(eventResult.error ?? "Failed to load event")
        setStatus("error")
        return
      }
      setEvent(eventResult.data)
      setAllUsers(eventResult.data.allUsers)
      setAssignments(eventResult.data.assignments)
      if (ministriesResult.success && ministriesResult.data) {
        setMinistries(ministriesResult.data)
      }
      if (eventsResult.success) {
        setAvailableEvents(eventsResult.data ?? [])
      }
      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data)
      }
      setStatus("success")
    }
    load()
  }, [eventId])

  function handleAssign(userIds: number[], blockIds: number[]) {
    setAssignments((prev) => {
      const next = [...prev]
      for (const userId of userIds) {
        const existing = next.find((assignment) => assignment.id === userId)
        if (existing) {
          existing.assignedBlockIds = [
            ...new Set([...existing.assignedBlockIds, ...blockIds]),
          ]
        } else {
          const user = allUsers.find((candidate) => candidate.id === userId)
          if (user) next.push({ ...user, assignedBlockIds: blockIds, taskIds: [] })
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
            ? { ...a, assignedBlockIds: a.assignedBlockIds.filter((id) => id !== blockId) }
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
      {status === "error" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {status === "success" && event && (
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
                  {event.name}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {formatDateDisplay(event.date)}
                  {` · ${event.regionName}`}
                </p>
              </div>
              <Badge className={cn("w-fit capitalize", STATUS_STYLES[event.status])}>
                {event.status}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="configuration" className="w-full">
            <TabsList variant="line" className="w-full">
              <TabsTrigger value="configuration" className="flex-1 px-4 pb-4 pt-2 text-sm font-semibold">Configuration</TabsTrigger>
              <TabsTrigger value="assignment" className="flex-1 px-4 pb-4 pt-2 text-sm font-semibold">Assignment</TabsTrigger>
              <TabsTrigger value="seating" className="flex-1 px-4 pb-4 pt-2 text-sm font-semibold">Seating</TabsTrigger>
              <TabsTrigger value="reporting" className="flex-1 px-4 pb-4 pt-2 text-sm font-semibold">Reporting</TabsTrigger>
            </TabsList>

            <TabsContent value="configuration">
              <ConfigurationTab eventId={Number(eventId)} />
            </TabsContent>

            <TabsContent value="assignment">
              <AssignmentTab
                allUsers={allUsers}
                areas={seatingAreas}
                users={assignments}
                tasks={tasks}
                onAssignAction={handleAssign}
                onRemoveBlockAction={handleRemoveBlock}
                onRemoveUserAction={handleRemoveUser}
              />
            </TabsContent>

            <TabsContent value="seating">
              <SeatingTab areas={seatingAreas} />
            </TabsContent>

            <TabsContent value="reporting">
              <ReportingTab
                eventName={event.name}
                eventDate={event.date}
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
