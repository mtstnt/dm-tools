"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getWebAuthCookie, WebAuthGuard } from "@/components/web-auth-guard"
import { fetchEventEditPage } from "@/lib/queries/events"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type {
  EventDetailsData,
  EventDetailsBlock,
  EventDetailsBlockItem,
} from "@/types/event"

type FetchStatus = "idle" | "loading" | "success" | "error"

function isEventDetailsBlock(
  block: EventDetailsBlockItem,
): block is EventDetailsBlock {
  return "area_id" in block
}



export default function EventEditPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [status, setStatus] = useState<FetchStatus>("idle")
  const [error, setError] = useState("")
  const [result, setResult] = useState<EventDetailsData | null>(null)

  useEffect(() => {
    const f = async () => {
      setStatus("loading")
      const cookie = getWebAuthCookie()
      if (!cookie) {
        setStatus("error")
        setError("Not authenticated")
        return
      }

      try {
        const data = await fetchEventEditPage(cookie, eventId)
        setResult(data as EventDetailsData)
        setStatus("success")
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    }
    f()
  }, [eventId])

  return (
    <WebAuthGuard>
      <div className="animate-stagger">
        {status === "loading" && <LoadingSkeleton />}
        {status === "error" && (
          <p className="text-sm text-destructive">Failed to load: {error}</p>
        )}
        {status === "success" && result && <EventEditContent result={result} />}
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

function EventEditContent({ result }: { result: EventDetailsData }) {
  const { event, users, areas, blocks } = result

  const assignmentRows = useMemo(() => {
    const realBlocks = blocks.filter(isEventDetailsBlock)
    return users.map((user) => {
      const blockNames = user.blocks
        .map((blockId) => realBlocks.find((b) => b.id === blockId)?.name)
        .filter(Boolean) as string[]
      return { id: user.id, name: user.name, email: user.email, blocks: blockNames }
    })
  }, [users, blocks])

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
          {event.name || "Untitled Event"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {event.date || "No date"}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>

      <Tabs defaultValue="assignment" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="assignment">
          <AssignmentTab rows={assignmentRows} />
        </TabsContent>

        <TabsContent value="blocks">
          <BlocksTab areas={areas} blocks={blocks} />
        </TabsContent>

        <TabsContent value="dashboard">
          <p className="text-muted-foreground py-8">Dashboard — coming soon</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AssignmentTab({
  rows,
}: {
  rows: { id: number; name: string; email: string | null; blocks: string[] }[]
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8">No users assigned yet.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Blocks</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <p className="font-medium">{row.name}</p>
              {row.email && (
                <p className="text-xs text-muted-foreground">{row.email}</p>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.blocks.length > 0 ? row.blocks.join(", ") : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function BlocksTab({
  areas,
  blocks,
}: {
  areas: EventDetailsData["areas"]
  blocks: EventDetailsData["blocks"]
}) {
  const [selectedArea, setSelectedArea] = useState<string>("")
  const [selectedBlockId, setSelectedBlockId] = useState<string>("")
  const [grid, setGrid] = useState<number[][]>([])

  const realBlocks = useMemo(() => blocks.filter(isEventDetailsBlock), [blocks])

  const areaBlocks = useMemo(() => {
    if (!selectedArea) return []
    return realBlocks.filter((b) => String(b.area_id) === selectedArea)
  }, [selectedArea, realBlocks])

  const handleAreaChange = (value: string | null) => {
    setSelectedArea(value ?? "")
    setSelectedBlockId("")
    setGrid([])
  }

  const handleBlockChange = (value: string | null) => {
    const id = value ?? ""
    setSelectedBlockId(id)
    if (id) {
      const block = realBlocks.find((b) => String(b.id) === id)
      setGrid(block?.chairs_data.map((row) => [...row]) ?? [])
    } else {
      setGrid([])
    }
  }

  const toggleCell = (row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r])
      next[row][col] = next[row][col] === 1 ? 0 : 1
      return next
    })
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap gap-3">
        <Select value={selectedArea} onValueChange={handleAreaChange}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Area">
              {(value) => {
                if (!value) return "Area"
                const area = areas.find((a) => a.id === value)
                return area?.name ?? value
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {areas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedBlockId}
          onValueChange={handleBlockChange}
          disabled={!selectedArea}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Block">
              {(value) => {
                if (!value) return "Block"
                const block = areaBlocks.find((b) => String(b.id) === value)
                return block?.name ?? value
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {areaBlocks.map((block) => (
              <SelectItem key={block.id} value={String(block.id)}>
                {block.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {grid.length > 0 && grid[0] && (
        <div className="overflow-x-auto">
          <Table className="w-full max-w-4xl table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-center text-xs" />
                {grid[0].map((_, ci) => (
                  <TableHead key={ci} className="text-center text-xs font-medium">
                    {ci + 1}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grid.map((row, ri) => (
                <TableRow key={ri}>
                  <TableCell className="text-center text-xs font-medium text-muted-foreground p-1">
                    {ri + 1}
                  </TableCell>
                  {row.map((val, ci) => (
                    <TableCell key={ci} className="p-0.5">
                      <button
                        type="button"
                        aria-label={`Cell ${ri + 1}-${ci + 1}`}
                        className={cn(
                          "w-full aspect-square rounded-sm border border-border/30 transition-colors cursor-pointer",
                          val === 1
                            ? "bg-emerald-500 hover:bg-emerald-400"
                            : "bg-muted hover:bg-muted/70",
                        )}
                        onClick={() => toggleCell(ri, ci)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
