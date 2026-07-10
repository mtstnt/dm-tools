"use client"

import { useMemo, useState } from "react"
import { Loader2, CheckCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { EventArea, EventBlock } from "@/types/event"

type SubmitStatus = "idle" | "submitting" | "success" | "error"

export function SeatingTab({ areas }: { areas: EventArea[] }) {
  const firstArea = areas[0] ?? null
  const firstBlock = firstArea?.blocks[0] ?? null
  const [selectedAreaId, setSelectedAreaId] = useState(() => String(firstArea?.id ?? ""))
  const [selectedBlockId, setSelectedBlockId] = useState(() => String(firstBlock?.id ?? ""))
  const [grid, setGrid] = useState<number[][]>(() => firstBlock?.chairs.map((row) => [...row]) ?? [])
  const [rowInput, setRowInput] = useState(() => String(firstBlock?.row ?? ""))
  const [colInput, setColInput] = useState(() => String(firstBlock?.column ?? ""))
  const [updateStatus, setUpdateStatus] = useState<SubmitStatus>("idle")

  const selectedArea = useMemo(
    () => areas.find((area) => String(area.id) === selectedAreaId) ?? firstArea,
    [areas, firstArea, selectedAreaId],
  )

  const selectedBlock = useMemo(
    () => selectedArea?.blocks.find((block) => String(block.id) === selectedBlockId) ?? null,
    [selectedArea, selectedBlockId],
  )

  function loadBlock(block: EventBlock | null) {
    if (!block) {
      setGrid([])
      setRowInput("")
      setColInput("")
      return
    }

    setRowInput(String(block.row))
    setColInput(String(block.column))
    setGrid(block.chairs.map((row) => [...row]))
  }

  function handleAreaChange(area: EventArea) {
    const block = area.blocks[0] ?? null
    setSelectedAreaId(String(area.id))
    setSelectedBlockId(String(block?.id ?? ""))
    loadBlock(block)
  }

  function handleBlockChange(block: EventBlock) {
    setSelectedBlockId(String(block.id))
    loadBlock(block)
  }

  function applyRowChange() {
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

  function applyColChange() {
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

  function toggleCell(row: number, col: number) {
    setGrid((prev) => {
      const next = prev.map((r) => [...r])
      next[row][col] = next[row][col] === 1 ? 0 : 1
      return next
    })
  }

  function handleRevert() {
    if (!selectedBlock) return
    setRowInput(String(selectedBlock.row))
    setColInput(String(selectedBlock.column))
    setGrid(selectedBlock.chairs.map((row) => [...row]))
  }

  function handleUpdate() {
    if (!selectedBlock) return
    setUpdateStatus("submitting")
    setTimeout(() => {
      setUpdateStatus("success")
      setTimeout(() => setUpdateStatus("idle"), 2000)
    }, 500)
  }

  return (
    <div className="mb-20 flex flex-col overflow-hidden rounded-lg border md:mb-0 md:flex-row">
      <aside className="shrink-0 border-b bg-muted/30 md:w-44 md:border-r md:border-b-0">
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Areas</div>
        <div className="flex gap-1 overflow-x-auto p-2 md:flex-col">
          {areas.map((area) => (
            <Button
              key={area.id}
              variant="ghost"
              size="sm"
              className={cn(
                "shrink-0 justify-start",
                selectedArea?.id === area.id && "border border-primary bg-background text-foreground shadow-sm dark:border-primary",
              )}
              onClick={() => handleAreaChange(area)}
            >
              {area.name}
            </Button>
          ))}
        </div>
        <div className="border-y px-3 py-2 text-xs font-medium text-muted-foreground md:border-b-0">
          Blocks
        </div>
        <div className="flex gap-1 overflow-x-auto p-2 md:flex-col">
          {selectedArea?.blocks.map((block) => (
            <Button
              key={block.id}
              variant="ghost"
              size="sm"
              className={cn(
                "shrink-0 justify-start",
                selectedBlock?.id === block.id && "border border-primary bg-background text-foreground shadow-sm dark:border-primary",
              )}
              onClick={() => handleBlockChange(block)}
            >
              {block.name}
            </Button>
          ))}
          {!selectedArea?.blocks.length && (
            <p className="px-2 py-1 text-sm text-muted-foreground">No blocks are listed</p>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4 p-4">
        {!selectedBlock ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No blocks are listed</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Input
                type="number"
                min={0}
                placeholder="Row"
                value={rowInput}
                onChange={(e) => setRowInput(e.target.value)}
                onBlur={applyRowChange}
                className="h-8 w-20 text-sm"
              />
              <Input
                type="number"
                min={0}
                placeholder="Col"
                value={colInput}
                onChange={(e) => setColInput(e.target.value)}
                onBlur={applyColChange}
                className="h-8 w-20 text-sm"
              />
              <Button size="sm" onClick={handleUpdate} disabled={updateStatus === "submitting"}>
                {updateStatus === "submitting" && <Loader2 className="mr-2 size-4 animate-spin" />}
                {updateStatus === "success" && <CheckCircle className="mr-2 size-4" />}
                {updateStatus === "submitting"
                  ? "Updating..."
                  : updateStatus === "success"
                    ? "Updated!"
                    : "Update"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleRevert}>
                <RotateCcw className="mr-2 size-4" />
                Revert
              </Button>
            </div>

            {grid.length > 0 && grid[0] ? (
              <div className="min-w-full overflow-x-auto">
                <table className="border-collapse" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th className="h-8 w-8" />
                      {grid[0].map((_, ci) => (
                        <th key={ci} className="h-8 w-8 text-center text-xs font-medium text-muted-foreground">
                          {ci + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((row, ri) => (
                      <tr key={ri}>
                        <td className="h-8 w-8 text-center text-xs font-medium text-muted-foreground">{ri + 1}</td>
                        {row.map((val, ci) => (
                          <td
                            key={ci}
                            className={cn(
                              "h-8 w-8 cursor-pointer border border-border transition-colors",
                              val === 1 ? "bg-emerald-500" : "bg-muted",
                            )}
                            onClick={() => toggleCell(ri, ci)}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No seating data. Adjust row and column to create a grid.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
