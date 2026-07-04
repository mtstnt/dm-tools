"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getWebAuthCookie, WebAuthGuard } from "@/components/web-auth-guard"
import { getEventDetail } from "@/lib/queries/events"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { parseEventTitle } from "@/lib/utils"
import type { EventDetail } from "@/types/event"
import { AssignmentTab } from "./assignment-tab"
import { BlockProvider, BlocksTab } from "./blocks-tab"

type FetchStatus = "idle" | "loading" | "success" | "error"

export default function EventEditPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [status, setStatus] = useState<FetchStatus>("loading")
  const [error, setError] = useState("")
  const [result, setResult] = useState<EventDetail | null>(null)

  const refetch = useCallback(async () => {
    const cookie = getWebAuthCookie()
    if (!cookie) {
      throw new Error("Not authenticated")
    }
    const data = await getEventDetail({ cookie, csrf: "" }, eventId)
    setResult(data as EventDetail)
  }, [eventId])

  useEffect(() => {
    refetch()
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Unknown error")
      })
  }, [refetch])

  return (
    <WebAuthGuard>
      <div className="animate-stagger">
        {status === "loading" && <LoadingSkeleton />}
        {status === "error" && (
          <p className="text-sm text-destructive">Failed to load: {error}</p>
        )}
        {status === "success" && result && (
          <EventEditContent result={result} eventId={eventId} refetch={refetch} />
        )}
      </div>
    </WebAuthGuard>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-40 mt-2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

function EventEditContent({
  result,
  eventId,
  refetch,
}: {
  result: EventDetail
  eventId: string
  refetch: () => Promise<void>
}) {
  const { name, location, users, allUsers, areas, csrf } = result

  const parsedTitle = useMemo(() => parseEventTitle(name), [name])

  const flatBlocks = useMemo(() => areas.flatMap((a) => a.blocks), [areas])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tools/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-4" />
          Events
        </Link>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.1]">
          {parsedTitle.name || "Untitled Event"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {parsedTitle.date || "No date"}
          {location ? ` · ${location}` : ""}
        </p>
      </div>

      <BlockProvider>
        <Tabs defaultValue="assignment" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="blocks">Blocks</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="assignment">
            <AssignmentTab
              users={users}
              allUsers={allUsers}
              blocks={flatBlocks}
              csrf={csrf}
              eventId={eventId}
              refetch={refetch}
            />
          </TabsContent>

          <TabsContent value="blocks">
            <BlocksTab areas={areas} csrf={csrf} />
          </TabsContent>

          <TabsContent value="dashboard">
            <p className="text-muted-foreground py-8">Dashboard — coming soon</p>
          </TabsContent>
        </Tabs>
      </BlockProvider>
    </div>
  )
}
