"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { getWebAuthCookie, WebAuthGuard } from "@/components/web-auth-guard"
import { getEventDetail, updateUserBlocks } from "@/lib/queries/events"
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
import { Button } from "@/components/ui/button"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { cn, parseEventTitle } from "@/lib/utils"
import type {
  EventDetailsData,
  EventDetailsBlock,
  EventDetailsBlockItem,
} from "@/types/event"

type FetchStatus = "idle" | "loading" | "success" | "error"
type SubmitStatus = "idle" | "submitting" | "success" | "error"

function isEventDetailsBlock(
  block: EventDetailsBlockItem,
): block is EventDetailsBlock {
  return "area_id" in block
}

interface BlockContextValue {
  selectedArea: string
  setSelectedArea: (v: string) => void
  selectedBlockId: string
  setSelectedBlockId: (v: string) => void
  grid: number[][]
  setGrid: React.Dispatch<React.SetStateAction<number[][]>>
}

const BlockContext = createContext<BlockContextValue | null>(null)

function useBlockContext() {
  const ctx = useContext(BlockContext)
  if (!ctx) throw new Error("useBlockContext must be used within BlockProvider")
  return ctx
}

function BlockProvider({ children }: { children: React.ReactNode }) {
  const [selectedArea, setSelectedArea] = useState<string>("")
  const [selectedBlockId, setSelectedBlockId] = useState<string>("")
  const [grid, setGrid] = useState<number[][]>([])

  const value = useMemo(
    () => ({ selectedArea, setSelectedArea, selectedBlockId, setSelectedBlockId, grid, setGrid }),
    [selectedArea, selectedBlockId, grid],
  )

  return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>
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
        const data = await getEventDetail({ cookie, csrf: "" }, eventId)
        console.log('data', data);
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
        {status === "success" && result && <EventEditContent result={result} eventId={eventId} />}
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

function EventEditContent({ result, eventId }: { result: EventDetailsData; eventId: string }) {
  const { event, users, allUsers, areas, blocks, csrf } = result

  const parsedTitle = useMemo(() => parseEventTitle(event.name), [event.name])

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
          {parsedTitle.name || "Untitled Event"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {parsedTitle.date || "No date"}
          {event.location ? ` · ${event.location}` : ""}
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
              rows={assignmentRows}
              users={users}
              allUsers={allUsers}
              blocks={blocks}
              csrf={csrf}
              eventId={eventId}
            />
          </TabsContent>

          <TabsContent value="blocks">
            <BlocksTab areas={areas} blocks={blocks} />
          </TabsContent>

          <TabsContent value="dashboard">
            <p className="text-muted-foreground py-8">Dashboard — coming soon</p>
          </TabsContent>
        </Tabs>
      </BlockProvider>
    </div>
  )
}

function AssignmentTab({
  rows,
  users,
  allUsers,
  blocks,
  csrf,
  eventId,
}: {
  rows: { id: number; name: string; email: string | null; blocks: string[] }[]
  users: EventDetailsData["users"]
  allUsers: EventDetailsData["allUsers"]
  blocks: EventDetailsData["blocks"]
  csrf: string | null
  eventId: string
}) {
  const router = useRouter()
  const [selectedUsers, setSelectedUsers] = useState<MultiSelectOption[]>([])
  const [selectedBlocks, setSelectedBlocks] = useState<MultiSelectOption[]>([])
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle")
  const [submitError, setSubmitError] = useState("")

  const realBlocks = useMemo(() => blocks.filter(isEventDetailsBlock), [blocks])

  const ALLOWED_USER_IDS = new Set([
    3086, 4554, 5457, 5456, 5918, 1644, 6456, 4553, 6203, 5907,
    1399, 6844, 5444, 4636, 5882, 5443, 6870, 6860, 5464, 5458,
    3735, 6874, 5436, 5912, 6199, 5439, 5875, 1631, 5437, 1682,
    4709, 6871, 6445, 4678, 1685, 6846,
  ])

  const blockOptions = useMemo<MultiSelectOption[]>(
    () =>
      realBlocks.map((block) => ({
        label: block.name,
        value: String(block.id),
      })),
    [realBlocks],
  )

  const handleSubmit = async () => {
    if (selectedUsers.length === 0 || selectedBlocks.length === 0) return

    const cookie = getWebAuthCookie()
    if (!cookie) {
      setSubmitStatus("error")
      setSubmitError("Not authenticated")
      return
    }

    setSubmitStatus("submitting")
    setSubmitError("")

    try {
      const userIds = selectedUsers.map((u) => Number(u.value))
      const blockIds = selectedBlocks.map((b) => Number(b.value))
      const csrfToken = csrf ?? ""

      const result = await updateUserBlocks({ cookie, csrf: csrfToken }, eventId, userIds, blockIds)

      if (result.success) {
        setSubmitStatus("success")
        setTimeout(() => {
          setSubmitStatus("idle")
          setSelectedUsers([])
          setSelectedBlocks([])
          // TODO: Raw page refresh for now.
          window.location.reload();
        }, 2000)
      } else {
        setSubmitStatus("error")
        setSubmitError(result.error ?? "Failed to update")
      }
    } catch (err) {
      setSubmitStatus("error")
      setSubmitError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const filteredUsers = allUsers
    .filter((user) => ALLOWED_USER_IDS.has(Number(user.id)))
    .map((user) => ({
      label: user.fullName,
      value: String(user.id),
    }));

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <MultiSelect
            options={filteredUsers}
            value={selectedUsers}
            onChange={setSelectedUsers}
            placeholder="Select users..."
          />
        </div>
        <div className="flex-1 min-w-0">
          <MultiSelect
            options={blockOptions}
            value={selectedBlocks}
            onChange={setSelectedBlocks}
            placeholder="Select blocks..."
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={
            selectedUsers.length === 0 ||
            selectedBlocks.length === 0 ||
            submitStatus === "submitting"
          }
          className="shrink-0"
        >
          {submitStatus === "submitting" && (
            <Loader2 className="mr-2 size-4 animate-spin" />
          )}
          {submitStatus === "success" && (
            <CheckCircle className="mr-2 size-4" />
          )}
          {submitStatus === "submitting"
            ? "Assigning..."
            : submitStatus === "success"
              ? "Assigned!"
              : "Assign"}
        </Button>
      </div>

      {submitStatus === "error" && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Blocks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                No users assigned yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function BlocksTab({
  areas,
  blocks,
}: {
  areas: EventDetailsData["areas"]
  blocks: EventDetailsData["blocks"]
}) {
  const { selectedArea, setSelectedArea, selectedBlockId, setSelectedBlockId, grid, setGrid } =
    useBlockContext()

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

  // const toggleCell = (row: number, col: number) => {
  //   setGrid((prev) => {
  //     const next = prev.map((r) => [...r])
  //     next[row][col] = next[row][col] === 1 ? 0 : 1
  //     return next
  //   })
  // }

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
        <div className="overflow-x-auto min-w-full">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center text-xs whitespace-nowrap px-1" />
                {grid[0].map((_, ci) => (
                  <TableHead key={ci} className="text-center text-xs font-medium whitespace-nowrap px-1">
                    {ci + 1}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grid.map((row, ri) => (
                <TableRow key={ri}>
                  <TableCell className="w-8 text-center text-xs font-medium text-muted-foreground whitespace-nowrap px-1">
                    {ri + 1}
                  </TableCell>
                  {row.map((val, ci) => (
                    <TableCell
                      key={ci}
                      className={cn(
                        " w-8 aspect-square transition-colors border border-border",
                        val === 1
                          ? "bg-emerald-500"
                          : "bg-muted",
                      )}
                      // onClick={() => toggleCell(ri, ci)}
                    />
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
