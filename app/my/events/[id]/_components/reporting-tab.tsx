"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Copy, Check, Settings2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { MinistriesDialog } from "@/components/ministries-dialog"
import type { EventScheduleItem } from "@/actions/events"
import type { Ministry } from "@/actions/master/ministries"

interface AltarCallEntry {
  description: string
  count: string
}

interface VolunteerData {
  count: string
  byMinistry: Record<string, string>
}

interface ReportFormData {
  volunteers: VolunteerData
  congregationCount: string
  congregationTcCount: string
  altarCalls: AltarCallEntry[]
}

function formatDateDisplay(date: Date) {
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ]
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`
}

function formatDateTimeDisplay(date: Date) {
  const formattedDate = formatDateDisplay(date)
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${formattedDate} ${hours}:${minutes}`
}

function calculateVolunteerSum(byMinistry: Record<string, string>, ministryNames: string[]): number {
  return ministryNames.reduce((sum, name) => {
    const value = parseInt(byMinistry[name] || "0", 10)
    return sum + (isNaN(value) ? 0 : value)
  }, 0)
}

function formatAltarCalls(altarCalls: AltarCallEntry[]): string {
  const valid = altarCalls.filter((e) => e.description.trim() || e.count.trim())
  if (valid.length === 0) return ""
  return valid.map((e) => `${e.description}: ${e.count}`).join("; ")
}

export function ReportingTab({
  eventName,
  eventDate,
  initialMinistries,
  availableEvents,
}: {
  eventName: string
  eventDate: Date
  initialMinistries: Ministry[]
  availableEvents: EventScheduleItem[]
}) {
  const [useMinistries, setUseMinistries] = useState(true)
  const [useBulkVolunteerInput, setUseBulkVolunteerInput] = useState(false)
  const [selectedBulkEvents, setSelectedBulkEvents] = useState<MultiSelectOption[]>([])
  const [ministryNames, setMinistryNames] = useState<string[]>(
    initialMinistries.map((m) => m.name),
  )
  const [copied, setCopied] = useState(false)
  const [clipboardUnavailable, setClipboardUnavailable] = useState(false)
  const [canUseClipboard, setCanUseClipboard] = useState(false)

  useEffect(() => {
    setCanUseClipboard(window.isSecureContext && Boolean(navigator.clipboard))
  }, [])

  const [formData, setFormData] = useState<ReportFormData>({
    volunteers: {
      count: "",
      byMinistry: Object.fromEntries(initialMinistries.map((m) => [m.name, ""])),
    },
    congregationCount: "",
    congregationTcCount: "",
    altarCalls: [{ description: "", count: "" }],
  })

  const eventOptions = useMemo(
    () => [...availableEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((event) => {
        const date = new Date(event.date)
        return {
          value: String(event.id),
          label: `${event.name} / ${formatDateTimeDisplay(date)}`,
        }
      }),
    [availableEvents],
  )

  const volunteerSum = calculateVolunteerSum(formData.volunteers.byMinistry, ministryNames)
  const effectiveVolunteerCount = useMinistries
    ? String(volunteerSum)
    : formData.volunteers.count

  const date = formatDateDisplay(eventDate)
  const altarCallText = formatAltarCalls(formData.altarCalls)

  function handleMinistriesSave(newNames: string[]) {
    setMinistryNames(newNames)
    setFormData((prev) => {
      const updatedByMinistry: Record<string, string> = {}
      for (const name of newNames) {
        updatedByMinistry[name] = prev.volunteers.byMinistry[name] ?? ""
      }
      return {
        ...prev,
        volunteers: { ...prev.volunteers, byMinistry: updatedByMinistry },
      }
    })
  }

  function handleChange(
    field: keyof Omit<ReportFormData, "volunteers" | "altarCalls">,
    value: string,
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function handleVolunteerCountChange(value: string) {
    setFormData((prev) => ({
      ...prev,
      volunteers: { ...prev.volunteers, count: value },
    }))
  }

  function handleMinistryChange(ministry: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      volunteers: {
        ...prev.volunteers,
        byMinistry: { ...prev.volunteers.byMinistry, [ministry]: value },
      },
    }))
  }

  function addAltarCall() {
    setFormData((prev) => ({
      ...prev,
      altarCalls: [...prev.altarCalls, { description: "", count: "" }],
    }))
  }

  function removeAltarCall(index: number) {
    setFormData((prev) => {
      const next = prev.altarCalls.filter((_, i) => i !== index)
      if (next.length === 0) next.push({ description: "", count: "" })
      return { ...prev, altarCalls: next }
    })
  }

  function updateAltarCall(index: number, field: keyof AltarCallEntry, value: string) {
    setFormData((prev) => {
      const next = [...prev.altarCalls]
      next[index] = { ...next[index], [field]: value }
      return { ...prev, altarCalls: next }
    })
  }

  function generateReport() {
    const altarCallLine = altarCallText ? ` (Altarcall ${altarCallText})` : ""
    return `*${eventName} ${date}*
1. Pastor and Speaker:
2. Guest:
3. Volunteer: ${effectiveVolunteerCount}
4. Jemaat: ${formData.congregationCount} ; TC: ${formData.congregationTcCount}${altarCallLine}
5. Baptisan:
6. WHL:   (Bersedia Join CG: )
7. Prayer Station:
8. One Minute Prayer: `
  }

  async function handleCopy() {
    if (!window.isSecureContext || !navigator.clipboard) {
      setClipboardUnavailable(true)
      setTimeout(() => setClipboardUnavailable(false), 3000)
      return
    }

    await navigator.clipboard.writeText(generateReport())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 py-2">
      {clipboardUnavailable && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
        >
          Clipboard is unavailable in this browser.
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="flex flex-col gap-4 lg:col-span-2 lg:order-2">
          <div className="sticky top-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-muted-foreground/60">
                Preview
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!canUseClipboard}
                className="gap-2 text-xs h-8"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <pre className="bg-card border border-border/70 rounded-xl p-5 text-sm whitespace-pre-wrap font-mono leading-relaxed shadow-sm">
              {generateReport()}
            </pre>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-3">
          <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-muted-foreground/60">
            Input Fields
          </h2>

          <div className="rounded-xl border border-border/60 bg-card p-6 space-y-5">
            <div className="space-y-3 border-b border-border/60 pb-5">
              <label className="flex w-fit items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={useBulkVolunteerInput}
                  onChange={(event) => setUseBulkVolunteerInput(event.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                Bulk Volunteer Input
              </label>
              {useBulkVolunteerInput && (
                <MultiSelect
                  options={eventOptions}
                  value={selectedBulkEvents}
                  onChange={setSelectedBulkEvents}
                  placeholder="Select events..."
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                    Volunteer
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {useMinistries ? "Ministries" : "Total"}
                    </span>
                    <Switch
                      checked={useMinistries}
                      onCheckedChange={setUseMinistries}
                    />
                    {useMinistries && (
                      <MinistriesDialog
                        ministries={ministryNames}
                        onSave={handleMinistriesSave}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-6 text-muted-foreground"
                          >
                            <Settings2 className="size-3.5" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>

                {useMinistries ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ministryNames.map((ministry) => (
                        <div key={ministry} className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            {ministry}
                          </label>
                          <Input
                            value={formData.volunteers.byMinistry[ministry] ?? ""}
                            onChange={(e) => handleMinistryChange(ministry, e.target.value)}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground pt-1">
                      Total: {volunteerSum}
                    </div>
                  </div>
                ) : (
                  <Input
                    value={formData.volunteers.count}
                    onChange={(e) => handleVolunteerCountChange(e.target.value)}
                    placeholder="e.g. 18"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                  Jemaat
                </label>
                <Input
                  value={formData.congregationCount}
                  onChange={(e) => handleChange("congregationCount", e.target.value)}
                  placeholder="e.g. 11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                  TC
                </label>
                <Input
                  value={formData.congregationTcCount}
                  onChange={(e) => handleChange("congregationTcCount", e.target.value)}
                  placeholder="e.g. 11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                    Altar Calls
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addAltarCall}
                    className="h-7 px-2"
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.altarCalls.map((entry, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Textarea
                        value={entry.description}
                        onChange={(e) => updateAltarCall(index, "description", e.target.value)}
                        placeholder="Description"
                        className="flex-1 min-h-10"
                        rows={1}
                      />
                      <Input
                        value={entry.count}
                        onChange={(e) => updateAltarCall(index, "count", e.target.value)}
                        placeholder="Count"
                        className="w-20 h-10"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAltarCall(index)}
                        className="h-10 px-2 text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button className="w-full sm:w-auto sm:self-end">
            Save
          </Button>
        </div>

      </div>
    </div>
  )
}
