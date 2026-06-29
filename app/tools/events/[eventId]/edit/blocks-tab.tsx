"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { Loader2, CheckCircle, RotateCcw } from "lucide-react"
import { getWebAuthCookie } from "@/components/web-auth-guard"
import { updateBlock } from "@/lib/queries/events"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { EventDetailsData } from "@/types/event"

type SubmitStatus = "idle" | "submitting" | "success" | "error"

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

export function BlockProvider({ children }: { children: React.ReactNode }) {
  const [selectedArea, setSelectedArea] = useState<string>("")
  const [selectedBlockId, setSelectedBlockId] = useState<string>("")
  const [grid, setGrid] = useState<number[][]>([])

  const value = useMemo(
    () => ({ selectedArea, setSelectedArea, selectedBlockId, setSelectedBlockId, grid, setGrid }),
    [selectedArea, selectedBlockId, grid],
  )

  return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>
}

export function BlocksTab({
  areas,
  blocks,
  users,
  csrf,
  eventId,
}: {
  areas: EventDetailsData["areas"]
  blocks: EventDetailsData["blocks"]
  users: EventDetailsData["users"]
  csrf: string | null
  eventId: string
}) {
  const { selectedArea, setSelectedArea, selectedBlockId, setSelectedBlockId, grid, setGrid } =
    useBlockContext()

  const [rowInput, setRowInput] = useState("")
  const [colInput, setColInput] = useState("")
  const [updateStatus, setUpdateStatus] = useState<SubmitStatus>("idle")
  const [updateError, setUpdateError] = useState("")

  const areaBlocks = useMemo(() => {
    if (!selectedArea) return []
    return blocks.filter((b) => String(b.area_id) === selectedArea)
  }, [selectedArea, blocks])

  const blockUserIds = useMemo(() => {
    if (!selectedBlockId) return []
    const blockIdNum = Number(selectedBlockId)
    return users
      .filter((user) => user.blocks.includes(blockIdNum))
      .map((user) => user.id)
  }, [selectedBlockId, users])

  const handleAreaChange = (value: string | null) => {
    setSelectedArea(value ?? "")
    setSelectedBlockId("")
    setGrid([])
    setRowInput("")
    setColInput("")
  }

  const handleBlockChange = (value: string | null) => {
    const id = value ?? ""
    setSelectedBlockId(id)
    if (id) {
      const block = blocks.find((b) => String(b.id) === id)
      if (block) {
        setRowInput(String(block.row))
        setColInput(String(block.column))
        setGrid(block.chairs_data.map((row) => [...row]))
      }
    } else {
      setGrid([])
      setRowInput("")
      setColInput("")
    }
  }

  const handleRowChange = (value: string) => {
    setRowInput(value)
  }

  const handleColChange = (value: string) => {
    setColInput(value)
  }

  const applyRowChange = () => {
    const newRow = parseInt(rowInput, 10)
    if (isNaN(newRow) || newRow < 0) return
    setGrid((prev) => {
      const colCount = prev[0]?.length ?? parseInt(colInput, 10) ?? 0
      if (colCount <= 0) return prev
      if (newRow > prev.length) {
        const added = Array.from({ length: newRow - prev.length }, () =>
          Array(colCount).fill(0),
        )
        return [...prev, ...added]
      }
      return prev.slice(0, newRow)
    })
  }

  const applyColChange = () => {
    const newCol = parseInt(colInput, 10)
    if (isNaN(newCol) || newCol < 0) return
    setGrid((prev) =>
      prev.map((row) => {
        if (newCol > row.length) {
          return [...row, ...Array(newCol - row.length).fill(0)]
        }
        return row.slice(0, newCol)
      }),
    )
  }

  const toggleCell = (row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r])
      next[row][col] = next[row][col] === 1 ? 0 : 1
      return next
    })
  }

  const handleRevert = () => {
    if (!selectedBlockId) return
    const block = blocks.find((b) => String(b.id) === selectedBlockId)
    if (block) {
      setRowInput(String(block.row))
      setColInput(String(block.column))
      setGrid(block.chairs_data.map((row) => [...row]))
    }
  }

  const handleUpdate = async () => {
    if (!selectedBlockId) return
    const block = blocks.find((b) => String(b.id) === selectedBlockId)
    if (!block) return
    const cookie = getWebAuthCookie()
    if (!cookie) {
      setUpdateStatus("error")
      setUpdateError("Not authenticated")
      return
    }

    setUpdateStatus("submitting")
    setUpdateError("")

    try {
      const result = await updateBlock(
        { cookie, csrf: csrf ?? "" },
        selectedBlockId,
        block.name,
        parseInt(rowInput, 10),
        parseInt(colInput, 10),
        grid,
        blockUserIds,
      )
      if (result.success) {
        setUpdateStatus("success")
        setTimeout(() => setUpdateStatus("idle"), 2000)
      } else {
        setUpdateStatus("error")
        setUpdateError(result.error ?? "Failed to update block")
      }
    } catch (err) {
      setUpdateStatus("error")
      setUpdateError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-1 flex-wrap gap-3">
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

        <Input
          type="number"
          min={0}
          placeholder="Row"
          value={rowInput}
          onChange={(e) => handleRowChange(e.target.value)}
          onBlur={applyRowChange}
          disabled={!selectedBlockId}
          className="w-20 h-8 text-sm"
        />
        <Input
          type="number"
          min={0}
          placeholder="Col"
          value={colInput}
          onChange={(e) => handleColChange(e.target.value)}
          onBlur={applyColChange}
          disabled={!selectedBlockId}
          className="w-20 h-8 text-sm"
        />

        <Button
          size="sm"
          onClick={handleUpdate}
          disabled={!selectedBlockId || updateStatus === "submitting"}
        >
          {updateStatus === "submitting" && <Loader2 className="mr-2 size-4 animate-spin" />}
          {updateStatus === "success" && <CheckCircle className="mr-2 size-4" />}
          {updateStatus === "submitting"
            ? "Updating..."
            : updateStatus === "success"
              ? "Updated!"
              : "Update"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRevert}
          disabled={!selectedBlockId}
        >
          <RotateCcw className="mr-2 size-4" />
          Revert
        </Button>
      </div>

      {updateStatus === "error" && (
        <p className="text-sm text-destructive">{updateError}</p>
      )}

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
                        " w-8 aspect-square transition-colors border border-border cursor-pointer",
                        val === 1
                          ? "bg-emerald-500"
                          : "bg-muted",
                      )}
                      onClick={() => toggleCell(ri, ci)}
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
