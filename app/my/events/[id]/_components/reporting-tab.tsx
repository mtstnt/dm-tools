"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Copy, Check, Settings2, Pencil, Loader2 } from "lucide-react"

const HARDCODED_METRICS = ["Seat Counter", "Tally Counter"]

function ensureHardcodedMetrics(names: string[]): string[] {
  const merged = new Set(names)
  for (const m of HARDCODED_METRICS) merged.add(m)
  return Array.from(merged)
}
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { MinistriesDialog } from "@/components/ministries-dialog"
import { MetricsDialog } from "@/components/metrics-dialog"
import type { EventScheduleItem } from "@/actions/events"
import type { Ministry } from "@/actions/master/ministries"
import type { Metric } from "@/actions/master/metrics"
import {
  saveEventReportingData,
  type EventReportingData,
} from "@/actions/events/reporting"

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
  metricValues: Record<string, string>
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

const DEFAULT_TEMPLATE_BODY = `1. Pastor and Speaker:
2. Guest:
3. Volunteer: %Volunteer%
4. %Altar Call%
5. Baptisan:
6. WHL:   (Bersedia Join CG: )
7. Prayer Station:
8. One Minute Prayer: `

function getDefaultTemplate(metricNames: string[]): string {
  if (metricNames.length === 0) return DEFAULT_TEMPLATE_BODY
  const metricPlaceholders = metricNames.map((n) => `%${n}%`).join(" ; ")
  const lines = DEFAULT_TEMPLATE_BODY.split("\n")
  lines[3] = `4. ${metricPlaceholders} %Altar Call%`
  return lines.join("\n")
}

const KNOWN_PLACEHOLDERS = new Set(["Volunteer", "Altar Call"])

function getUnresolvedPlaceholders(template: string, metricNames: string[]): string[] {
  const pattern = /%(.+?)%/g
  const unresolved: string[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = pattern.exec(template)) !== null) {
    const name = match[1].trim()
    if (seen.has(name)) continue
    seen.add(name)
    if (KNOWN_PLACEHOLDERS.has(name)) continue
    if (metricNames.includes(name)) continue
    unresolved.push(name)
  }
  return unresolved
}

export function ReportingTab({
  eventId,
  eventName,
  eventDate,
  initialMinistries,
  availableEvents,
  availableMetrics,
  initialMetricNames,
  initialReportingData,
}: {
  eventId: number
  eventName: string
  eventDate: Date
  initialMinistries: Ministry[]
  availableEvents: EventScheduleItem[]
  availableMetrics: Metric[]
  initialMetricNames: string[]
  initialReportingData?: EventReportingData
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
  const [metricNames, setMetricNames] = useState<string[]>(ensureHardcodedMetrics(initialMetricNames))
  const [reportTemplate, setReportTemplate] = useState(DEFAULT_TEMPLATE_BODY)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setCanUseClipboard(window.isSecureContext && Boolean(navigator.clipboard))
    setReportTemplate(getDefaultTemplate(ensureHardcodedMetrics(initialMetricNames)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [formData, setFormData] = useState<ReportFormData>({
    volunteers: {
      count: "",
      byMinistry: Object.fromEntries(initialMinistries.map((m) => [m.name, ""])),
    },
    metricValues: Object.fromEntries(ensureHardcodedMetrics(initialMetricNames).map((m) => [m, ""])),
    altarCalls: [{ description: "", count: "" }],
  })

  useEffect(() => {
    if (!initialReportingData) return
    const { metrics, volunteers: vols, altarCalls } = initialReportingData

    if (metrics.length > 0) {
      const names = metrics.map((m) => m.metricName)
      const values: Record<string, string> = {}
      for (const m of metrics) {
        values[m.metricName] = String(m.count)
      }
      setMetricNames(ensureHardcodedMetrics(names))
      setReportTemplate(getDefaultTemplate(ensureHardcodedMetrics(names)))
      setFormData((prev) => ({ ...prev, metricValues: values }))
    }

    if (vols.length > 0) {
      setFormData((prev) => {
        const byMinistry = { ...prev.volunteers.byMinistry }
        for (const v of vols) {
          byMinistry[v.ministryName] = String(v.count)
        }
        return {
          ...prev,
          volunteers: { ...prev.volunteers, byMinistry },
        }
      })
    }

    if (altarCalls.length > 0) {
      setFormData((prev) => ({
        ...prev,
        altarCalls: altarCalls.map((a) => ({
          description: a.description,
          count: String(a.count),
        })),
      }))
    }
  }, [initialReportingData])

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

  function resolveTemplate(template: string): string {
    let resolved = template

    const altarCallFormatted = formatAltarCalls(formData.altarCalls)
    const altarCallReplacement = altarCallFormatted
      ? ` (Altarcall ${altarCallFormatted})`
      : ""
    resolved = resolved.replace(/%Altar Call%/g, altarCallReplacement)

    resolved = resolved.replace(/%Volunteer%/g, effectiveVolunteerCount)

    for (const name of metricNames) {
      const value = formData.metricValues[name] ?? ""
      resolved = resolved.replace(
        new RegExp(`%${escapeRegExp(name)}%`, "g"),
        value,
      )
    }

    resolved = resolved.replace(/%(.+?)%/g, "")

    return resolved
  }

  function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  const unresolvedPlaceholders = useMemo(
    () => getUnresolvedPlaceholders(reportTemplate, metricNames),
    [reportTemplate, metricNames],
  )

  const resolvedBody = useMemo(
    () => resolveTemplate(reportTemplate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reportTemplate, effectiveVolunteerCount, formData.metricValues, formData.altarCalls, metricNames],
  )

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

  function handleMetricsSave(selected: string[]) {
    const merged = ensureHardcodedMetrics(selected)
    setMetricNames(merged)
    setFormData((prev) => {
      const updatedValues: Record<string, string> = {}
      for (const name of merged) {
        updatedValues[name] = prev.metricValues[name] ?? ""
      }
      return { ...prev, metricValues: updatedValues }
    })
  }

  function handleMetricValueChange(metricName: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      metricValues: { ...prev.metricValues, [metricName]: value },
    }))
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

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    const metricsPayload = metricNames
      .filter((name) => formData.metricValues[name]?.trim())
      .map((name) => {
        const metric = availableMetrics.find((m) => m.name === name)
        return {
          metricId: metric!.id,
          count: parseInt(formData.metricValues[name], 10) || 0,
        }
      })

    const volunteersPayload = useMinistries
      ? ministryNames
          .filter((name) => formData.volunteers.byMinistry[name]?.trim())
          .map((name) => {
            const ministry = initialMinistries.find((m) => m.name === name)
            return {
              ministryId: ministry!.id,
              count: parseInt(formData.volunteers.byMinistry[name], 10) || 0,
            }
          })
      : []

    const altarCallsPayload = formData.altarCalls
      .filter((e) => e.description.trim() || e.count.trim())
      .map((e, i) => ({
        description: e.description.trim(),
        count: parseInt(e.count, 10) || 0,
        sequence: i,
      }))

    const result = await saveEventReportingData(eventId, {
      metrics: metricsPayload,
      volunteers: volunteersPayload,
      altarCalls: altarCallsPayload,
    })

    setSaving(false)

    if (result.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setSaveError(result.error ?? "Failed to save")
    }
  }

  async function handleCopy() {
    if (!window.isSecureContext || !navigator.clipboard) {
      setClipboardUnavailable(true)
      setTimeout(() => setClipboardUnavailable(false), 3000)
      return
    }

    const header = `*${eventName} ${date}*`
    await navigator.clipboard.writeText(`${header}\n${resolvedBody}`)
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
              <div className="flex items-center gap-1">
                <Button
                  variant={showTemplateEditor ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => setShowTemplateEditor((prev) => !prev)}
                  className="size-7"
                  title="Edit template"
                >
                  <Pencil className="size-3.5" />
                </Button>
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
            </div>
            <div className="bg-card border border-border/70 rounded-xl shadow-sm overflow-hidden">
              {showTemplateEditor ? (
                <div className="p-5 space-y-3">
                  <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                    Editable Template
                  </label>
                  <Textarea
                    value={reportTemplate}
                    onChange={(e) => setReportTemplate(e.target.value)}
                    className="min-h-40 font-mono text-sm"
                    placeholder="Enter template…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code className="text-xs bg-secondary px-1 rounded">%Metric Name%</code> as placeholders.
                    Special: <code className="text-xs bg-secondary px-1 rounded">%Volunteer%</code>,{" "}
                    <code className="text-xs bg-secondary px-1 rounded">%Altar Call%</code>.
                  </p>
                </div>
              ) : (
                <pre className="p-5 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  *{eventName} {date}*
                  {resolvedBody ? "\n" : ""}{resolvedBody}
                </pre>
              )}
            </div>

            {unresolvedPlaceholders.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Unresolved placeholders:{" "}
                {unresolvedPlaceholders.map((p, i) => (
                  <span key={p}>
                    {i > 0 && ", "}
                    <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">
                      %{p}%
                    </code>
                  </span>
                ))}
              </div>
            )}

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
              <p className="text-xs text-muted-foreground ml-6">Bulk input is not yet supported.</p>
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                    Metrics
                  </label>
                  <MetricsDialog
                    availableMetrics={availableMetrics}
                    selectedMetrics={metricNames}
                    onSave={handleMetricsSave}
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
                </div>
                <div className="space-y-3">
                  {metricNames.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      No metrics selected. Click the gear icon to select metrics.
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {metricNames.map((metricName) => (
                      <div key={metricName} className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {metricName}
                        </label>
                        <Input
                          value={formData.metricValues[metricName] ?? ""}
                          onChange={(e) => handleMetricValueChange(metricName, e.target.value)}
                          placeholder="0"
                          className="h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
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

          <div className="flex flex-col gap-3">
            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}
            <Button
              className="w-full sm:w-auto sm:self-end"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
