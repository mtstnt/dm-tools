"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Copy, Check, CalendarIcon, ChevronDown, Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface AltarCallEntry {
  text: string
  count: string
}

interface VolunteerData {
  DM: string
  Crowd: string
  Usher: string
  PAW: string
  Prayer: string
  MM: string
  SM: string
  MUA: string
  "First Aid": string
  Sound: string
  Photography: string
  Lighting: string
  Greeter: string
  Sosmed: string
  Baptisan: string
  Companion: string
  Stylist: string
  Hospitality: string
  GA: string
  WHL: string
}

interface ReportData {
  volunteer_count: string
  congregation_count: string
  congregation_tc_count: string
  altar_calls: AltarCallEntry[]
  volunteers: VolunteerData
}

const volunteerMinistries: (keyof VolunteerData)[] = [
  "DM", "Crowd", "Usher", "PAW", "Prayer", "MM", "SM", "MUA",
  "First Aid", "Sound", "Photography", "Lighting", "Greeter",
  "Sosmed", "Baptisan", "Companion", "Stylist", "Hospitality",
  "GA", "WHL",
]

const defaultVolunteers: VolunteerData = {
  DM: "",
  Crowd: "",
  Usher: "",
  PAW: "",
  Prayer: "",
  MM: "",
  SM: "",
  MUA: "",
  "First Aid": "",
  Sound: "",
  Photography: "",
  Lighting: "",
  Greeter: "",
  Sosmed: "",
  Baptisan: "",
  Companion: "",
  Stylist: "",
  Hospitality: "",
  GA: "",
  WHL: "",
}

const defaultData: ReportData = {
  volunteer_count: "",
  congregation_count: "",
  congregation_tc_count: "",
  altar_calls: [{ text: "", count: "" }],
  volunteers: { ...defaultVolunteers },
}

const serviceLabels: Record<string, string> = {
  teen: "AOG Teen South",
  youth: "AOG Youth South",
  event: "Event",
}

function formatDateDisplay(date: Date) {
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ]
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`
}

function calculateVolunteerSum(volunteers: VolunteerData): number {
  return volunteerMinistries.reduce((sum, ministry) => {
    const value = parseInt(volunteers[ministry] || "0", 10)
    return sum + (isNaN(value) ? 0 : value)
  }, 0)
}

function formatAltarCalls(altarCalls: AltarCallEntry[]): string {
  const validEntries = altarCalls.filter((e) => e.text.trim() || e.count.trim())
  if (validEntries.length === 0) return ""
  return validEntries.map((e) => `${e.text}: ${e.count}`).join("; ")
}

export default function ReportsPage() {
  const [serviceType, setServiceType] = useState("teen")
  const [eventName, setEventName] = useState("")
  const [reportDate, setReportDate] = useState<Date>(new Date())
  const [dataMap, setDataMap] = useState<Record<string, ReportData>>({
    teen: { ...defaultData },
    youth: { ...defaultData },
    event: { ...defaultData },
  })
  const [copied, setCopied] = useState(false)
  const [showVolunteerSum, setShowVolunteerSum] = useState(false)
  const [useVolunteerMinistries, setUseVolunteerMinistries] = useState(false)

  const currentData = dataMap[serviceType]

  const handleChange = (field: keyof Omit<ReportData, "volunteers" | "altar_calls">, value: string) => {
    setDataMap((prev) => ({
      ...prev,
      [serviceType]: { ...prev[serviceType], [field]: value },
    }))
  }

  const handleVolunteerChange = (ministry: keyof VolunteerData, value: string) => {
    setDataMap((prev) => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        volunteers: {
          ...prev[serviceType].volunteers,
          [ministry]: value,
        },
      },
    }))
  }

  const addAltarCall = () => {
    setDataMap((prev) => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        altar_calls: [...prev[serviceType].altar_calls, { text: "", count: "" }],
      },
    }))
  }

  const removeAltarCall = (index: number) => {
    setDataMap((prev) => {
      const newCalls = prev[serviceType].altar_calls.filter((_, i) => i !== index)
      if (newCalls.length === 0) newCalls.push({ text: "", count: "" })
      return {
        ...prev,
        [serviceType]: { ...prev[serviceType], altar_calls: newCalls },
      }
    })
  }

  const updateAltarCall = (index: number, field: keyof AltarCallEntry, value: string) => {
    setDataMap((prev) => {
      const newCalls = [...prev[serviceType].altar_calls]
      newCalls[index] = { ...newCalls[index], [field]: value }
      return {
        ...prev,
        [serviceType]: { ...prev[serviceType], altar_calls: newCalls },
      }
    })
  }

  const volunteerSum = calculateVolunteerSum(currentData.volunteers)
  const effectiveVolunteerCount = useVolunteerMinistries
    ? String(volunteerSum)
    : currentData.volunteer_count

  const title = serviceType === "event" ? eventName || "Event" : serviceLabels[serviceType]
  const date = formatDateDisplay(reportDate)
  const altarCallText = formatAltarCalls(currentData.altar_calls)

  const generateReport = () => {
    return `**${title} (${date})**
1. Pastor and Speaker:
2. Guest:
3. Volunteer: ${effectiveVolunteerCount}
4. Jemaat: ${currentData.congregation_count} ; TC: ${currentData.congregation_tc_count} (Altarcall ${altarCallText})
5. Baptisan:
6. WHL:   (Bersedia Join CG: )
7. Prayer Station:
8. One Minute Prayer: `
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateReport())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">DM Service Report</h1>
        <Select value={serviceLabels[serviceType]} onValueChange={(value) => value && setServiceType(value)}>
          <SelectTrigger className="min-w-[240px]">
            <SelectValue placeholder={serviceLabels[serviceType]} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="teen">AOG Teen South</SelectItem>
            <SelectItem value="youth">AOG Youth South</SelectItem>
            <SelectItem value="event">Event</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Input Fields</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {formatDateDisplay(reportDate)}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={reportDate}
                  onSelect={(date) => date && setReportDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {serviceType === "event" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Name</label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event name"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Volunteer</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {useVolunteerMinistries ? "Ministries" : "Total"}
                  </span>
                  <Switch
                    checked={useVolunteerMinistries}
                    onCheckedChange={setUseVolunteerMinistries}
                  />
                </div>
              </div>

              {useVolunteerMinistries ? (
                <Collapsible>
                  <CollapsibleTrigger
                    render={
                      <Button variant="outline" className="w-full justify-between">
                        <span>Volunteer Ministries</span>
                        <div className="flex items-center gap-2">
                          {volunteerSum > 0 && (
                            <span className="text-xs text-muted-foreground">Sum: {volunteerSum}</span>
                          )}
                          <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </div>
                      </Button>
                    }
                  />
                  <CollapsibleContent className="space-y-2 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      {volunteerMinistries.map((ministry) => (
                        <div key={ministry} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{ministry}</label>
                          <Input
                            value={currentData.volunteers[ministry]}
                            onChange={(e) => handleVolunteerChange(ministry, e.target.value)}
                            placeholder="0"
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowVolunteerSum(!showVolunteerSum)}
                    >
                      {showVolunteerSum ? "Hide" : "Show"} Volunteer Sum
                    </Button>
                    {showVolunteerSum && (
                      <div className="text-center text-sm font-medium text-muted-foreground">
                        Total Volunteers: {volunteerSum}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Input
                  value={currentData.volunteer_count}
                  onChange={(e) => handleChange("volunteer_count", e.target.value)}
                  placeholder="e.g. 18"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jemaat</label>
              <Input
                value={currentData.congregation_count}
                onChange={(e) => handleChange("congregation_count", e.target.value)}
                placeholder="e.g. 11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">TC</label>
              <Input
                value={currentData.congregation_tc_count}
                onChange={(e) => handleChange("congregation_tc_count", e.target.value)}
                placeholder="e.g. 11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Altar Calls</label>
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
                {currentData.altar_calls.map((entry, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Textarea
                      value={entry.text}
                      onChange={(e) => updateAltarCall(index, "text", e.target.value)}
                      placeholder="Text"
                      className="flex-1 min-h-[2.5rem]"
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

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
            {generateReport()}
          </pre>
        </div>
      </div>
    </div>
  )
}
