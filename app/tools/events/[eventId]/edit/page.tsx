"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { getWebAuthCookie } from "@/components/web-auth-guard"
import { fetchEventEditPage, eventKeys, type Area } from "@/lib/queries/events"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WebAuthGuard } from "@/components/web-auth-guard"
import { cn } from "@/lib/utils"

// Types
interface AreaBlock {
  id: string
  name: string
  row: number
  col: number
}

interface BlockSeats {
  row: number
  col: number
  data: number[][]
}

// Dummy data
const DUMMY_EVENT = {
  id: "123",
  eventName: "AOG TEEN",
  date: "24 JUN 2026",
  time: "16:00",
  location: "Main Hall",
  locked: false,
}

const DUMMY_BLOCKS: Record<string, AreaBlock[]> = {
  "1": [
    { id: "101", name: "A1", row: 12, col: 15 },
    { id: "102", name: "A2", row: 4, col: 6 },
    { id: "103", name: "A3", row: 5, col: 8 },
    { id: "104", name: "A4", row: 3, col: 6 },
  ],
  "2": [
    { id: "201", name: "B1", row: 6, col: 10 },
    { id: "202", name: "B2", row: 5, col: 8 },
    { id: "203", name: "B3", row: 4, col: 6 },
  ],
  "3": [
    { id: "301", name: "S1", row: 4, col: 6 },
    { id: "302", name: "S2", row: 5, col: 8 },
  ],
  "4": [
    { id: "401", name: "O", row: 3, col: 6 },
  ],
}

const DUMMY_SEATS: Record<string, BlockSeats> = {
  "101": {
    row: 12,
    col: 15,
    data: [
      [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1],
      [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
      [0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0],
      [1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1],
      [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
      [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
      [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    ],
  },
  "102": {
    row: 4,
    col: 6,
    data: [
      [1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1],
      [1, 1, 0, 0, 1, 1],
      [0, 0, 1, 1, 0, 0],
    ],
  },
  "103": {
    row: 5,
    col: 8,
    data: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0],
    ],
  },
  "104": {
    row: 3,
    col: 6,
    data: [
      [1, 1, 0, 0, 1, 1],
      [0, 0, 1, 1, 0, 0],
      [1, 1, 0, 0, 1, 1],
    ],
  },
  "201": {
    row: 6,
    col: 10,
    data: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    ],
  },
  "202": {
    row: 5,
    col: 8,
    data: [
      [1, 1, 0, 0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1, 0, 0],
    ],
  },
  "203": {
    row: 4,
    col: 6,
    data: [
      [1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1],
    ],
  },
  "301": {
    row: 4,
    col: 6,
    data: [
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
    ],
  },
  "302": {
    row: 5,
    col: 8,
    data: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0],
    ],
  },
  "401": {
    row: 3,
    col: 6,
    data: [
      [1, 1, 0, 0, 1, 1],
      [0, 0, 1, 1, 0, 0],
      [1, 1, 0, 0, 1, 1],
    ],
  },
}

export default function EventEditPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string

  const [selectedArea, setSelectedArea] = useState<string>("")
  const [selectedBlock, setSelectedBlock] = useState<string>("")
  const [seatData, setSeatData] = useState<number[][]>([])
  const [originalSeatData, setOriginalSeatData] = useState<number[][]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // const { data: eventDetail } = useQuery({
  //   queryKey: eventKeys.detail(eventId),
  //   queryFn: () => {
  //     const cookie = getWebAuthCookie()
  //     if (!cookie) throw new Error("Not authenticated")
  //     return fetchEventEditPage(cookie, eventId)
  //   },
  //   meta: { parsedResult: true },
  // })

  const eventDetail = {
    areas: [],
  };

  useEffect(() => {
    (async () => {
      const cookie = getWebAuthCookie()
      if (!cookie) throw new Error("Not authenticated")
      const details = await fetchEventEditPage(cookie, eventId)
      console.log("Details", details)
    })()
  }, []);

  const areas = eventDetail?.areas ?? []

  // Get blocks for selected area
  const blocks = selectedArea ? DUMMY_BLOCKS[selectedArea] ?? [] : []

  // Handle area selection
  const handleAreaChange = (areaId: string) => {
    setSelectedArea(areaId)
    setSelectedBlock("")
    setSeatData([])
    setOriginalSeatData([])
    setHasChanges(false)
  }

  // Handle block selection (simulates refetch)
  const handleBlockChange = (blockId: string) => {
    setSelectedBlock(blockId)
    const seats = DUMMY_SEATS[blockId]
    if (seats) {
      setSeatData(seats.data.map((row) => [...row]))
      setOriginalSeatData(seats.data.map((row) => [...row]))
    } else {
      setSeatData([])
      setOriginalSeatData([])
    }
    setHasChanges(false)
  }

  // Handle cell click (toggle seat)
  const handleCellClick = (rowIdx: number, colIdx: number) => {
    const newData = seatData.map((row) => [...row])
    newData[rowIdx][colIdx] = newData[rowIdx][colIdx] === 0 ? 1 : 0
    setSeatData(newData)
    setHasChanges(true)
  }

  // Handle save (dummy)
  const handleSave = () => {
    // TODO: Implement actual save action
    console.log("Saving seat data:", seatData)
    setOriginalSeatData(seatData.map((row) => [...row]))
    setHasChanges(false)
  }

  // Get cell color based on state
  const getCellColor = (rowIdx: number, colIdx: number) => {
    const current = seatData[rowIdx][colIdx]
    const original = originalSeatData[rowIdx]?.[colIdx]

    if (current === original) {
      // No change
      return current === 1 ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
    } else {
      // Changed (unsaved)
      return current === 1
        ? "bg-yellow-400"
        : "bg-gray-500 dark:bg-gray-800"
    }
  }

  return (
    <WebAuthGuard>
      <div className="animate-stagger">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/tools/events")}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="size-4 mr-2" />
            Back to Events
          </Button>
          <h1 className="font-display text-2xl md:text-3xl tracking-tight text-foreground leading-[1.1]">
            {DUMMY_EVENT.eventName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {DUMMY_EVENT.date} &middot; {DUMMY_EVENT.time}
          </p>
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={selectedArea} onValueChange={(value: string | null) => handleAreaChange(value ?? "")}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              {areas.map((area: Area) => (
                <SelectItem key={area.id} value={area.id ?? ""}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedBlock}
            onValueChange={(value: string | null) => handleBlockChange(value ?? "")}
            disabled={!selectedArea}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Block" />
            </SelectTrigger>
            <SelectContent>
              {blocks.map((block) => (
                <SelectItem key={block.id} value={block.id}>
                  {block.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedBlock && hasChanges && (
            <Button size="sm" onClick={handleSave}>
              <Save className="size-4 mr-2" />
              Save
            </Button>
          )}
        </div>

        {/* Seat Grid */}
        {selectedBlock ? (
          <div className="space-y-4 max-w-full md:max-w-1/2">
            <div className="overflow-x-auto">
              <div
                className="grid gap-1 w-full"
                style={{
                  gridTemplateColumns: `2rem repeat(${seatData[0]?.length ?? 0}, minmax(0, 1fr))`,
                }}
              >
                {/* Empty corner cell */}
                <div />

                {/* Column headers */}
                {Array.from({ length: seatData[0]?.length ?? 0 }).map((_, colIdx) => (
                  <div
                    key={`col-${colIdx}`}
                    className="flex items-center justify-center text-muted-foreground font-mono"
                  >
                    {colIdx}
                  </div>
                ))}

                {/* Rows */}
                {seatData.map((row, rowIdx) => (
                  <>
                    {/* Row header */}
                    <div
                      key={`row-${rowIdx}`}
                      className="flex items-center justify-center text-muted-foreground font-mono"
                    >
                      {rowIdx}
                    </div>

                    {/* Cells */}
                    {row.map((cell, colIdx) => (
                      <button
                        key={`${rowIdx}-${colIdx}`}
                        className={cn(
                          "aspect-square rounded-sm border border-border/30 transition-colors w-full",
                          getCellColor(rowIdx, colIdx)
                        )}
                        onClick={() => handleCellClick(rowIdx, colIdx)}
                        title={`Row ${rowIdx}, Col ${colIdx}: ${cell === 1 ? "Has seat" : "No seat"}`}
                      />
                    ))}
                  </>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-sm bg-emerald-500" />
                <span>Has seat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-sm bg-gray-300 dark:bg-gray-600" />
                <span>No seat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3.5 rounded-sm bg-yellow-400" />
                <span>Modified (unsaved)</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select an area and block to view seat layout
          </p>
        )}
      </div>
    </WebAuthGuard>
  )
}
