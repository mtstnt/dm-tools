"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Copy,
  Check,
  CalendarIcon,
  ChevronUp,
  Plus,
  Trash2,
  Settings2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MinistriesDialog } from "@/components/ministries-dialog";

interface AltarCallEntry {
  text: string;
  count: string;
}

interface ReportData {
  volunteer_count: string;
  congregation_count: string;
  congregation_tc_count: string;
  altar_calls: AltarCallEntry[];
  volunteers: Record<string, string>;
}

const DEFAULT_MINISTRIES = [
  "DM",
  "Crowd",
  "Usher",
  "PAW",
  "Prayer",
  "MM",
  "SM",
  "MUA",
  "First Aid",
  "Photography",
  "Lighting",
  "Greeter",
  "Sosmed",
  "Baptisan",
  "Companion",
  "Stylist",
  "Hospitality",
  "GA",
  "Drama",
  "Konseptor",
  "WHL",
  "Sound",
  "Choir",
];

const defaultVolunteers: Record<string, string> = Object.fromEntries(
  DEFAULT_MINISTRIES.map((m) => [m, ""]),
);

const defaultData: ReportData = {
  volunteer_count: "",
  congregation_count: "",
  congregation_tc_count: "",
  altar_calls: [{ text: "", count: "" }],
  volunteers: { ...defaultVolunteers },
};

const serviceLabels: Record<string, string> = {
  teen: "AOG Teen South",
  youth: "AOG Youth South",
  event: "Event",
};

function formatDateDisplay(date: Date) {
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function calculateVolunteerSum(
  volunteers: Record<string, string>,
  ministries: string[],
): number {
  return ministries.reduce((sum, ministry) => {
    const value = parseInt(volunteers[ministry] || "0", 10);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
}

function formatAltarCalls(altarCalls: AltarCallEntry[]): string {
  const validEntries = altarCalls.filter(
    (e) => e.text.trim() || e.count.trim(),
  );
  if (validEntries.length === 0) return "";
  return validEntries.map((e) => `${e.text}: ${e.count}`).join("; ");
}

export default function ReportsPage() {
  const [serviceType, setServiceType] = useState("teen");
  const [eventName, setEventName] = useState("");
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [dataMap, setDataMap] = useState<Record<string, ReportData>>({
    teen: { ...defaultData },
    youth: { ...defaultData },
    event: { ...defaultData },
  });
  const [copied, setCopied] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(true);
  const [useVolunteerMinistries, setUseVolunteerMinistries] = useState(true);
  const [ministries, setMinistries] = useState<string[]>(DEFAULT_MINISTRIES);

  const currentData = dataMap[serviceType];

  const handleChange = (
    field: keyof Omit<ReportData, "volunteers" | "altar_calls">,
    value: string,
  ) => {
    setDataMap((prev) => ({
      ...prev,
      [serviceType]: { ...prev[serviceType], [field]: value },
    }));
  };

  const handleVolunteerChange = (
    ministry: string,
    value: string,
  ) => {
    setDataMap((prev) => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        volunteers: {
          ...prev[serviceType].volunteers,
          [ministry]: value,
        },
      },
    }));
  };

  const addAltarCall = () => {
    setDataMap((prev) => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        altar_calls: [
          ...prev[serviceType].altar_calls,
          { text: "", count: "" },
        ],
      },
    }));
  };

  const removeAltarCall = (index: number) => {
    setDataMap((prev) => {
      const newCalls = prev[serviceType].altar_calls.filter(
        (_, i) => i !== index,
      );
      if (newCalls.length === 0) newCalls.push({ text: "", count: "" });
      return {
        ...prev,
        [serviceType]: { ...prev[serviceType], altar_calls: newCalls },
      };
    });
  };

  const updateAltarCall = (
    index: number,
    field: keyof AltarCallEntry,
    value: string,
  ) => {
    setDataMap((prev) => {
      const newCalls = [...prev[serviceType].altar_calls];
      newCalls[index] = { ...newCalls[index], [field]: value };
      return {
        ...prev,
        [serviceType]: { ...prev[serviceType], altar_calls: newCalls },
      };
    });
  };

  const volunteerSum = calculateVolunteerSum(currentData.volunteers, ministries);
  const effectiveVolunteerCount = useVolunteerMinistries
    ? String(volunteerSum)
    : currentData.volunteer_count;

  const title =
    serviceType === "event" ? eventName || "Event" : serviceLabels[serviceType];
  const date = formatDateDisplay(reportDate);
  const altarCallText = formatAltarCalls(currentData.altar_calls);

  const generateReport = () => {
    const altarCallLine = altarCallText ? ` (Altarcall ${altarCallText})` : "";
    return `*${title} ${date}*
1. Pastor and Speaker:
2. Guest:
3. Volunteer: ${effectiveVolunteerCount}
4. Jemaat: ${currentData.congregation_count} ; TC: ${currentData.congregation_tc_count}${altarCallLine}
5. Baptisan:
6. WHL:   (Bersedia Join CG: )
7. Prayer Station:
8. One Minute Prayer: `;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
    <div className="flex flex-col gap-8 animate-stagger pb-24 lg:pb-0">
      <div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.1]">
          Service Report
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Fill in the details below to generate your report.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-muted-foreground/60">
            Input Fields
          </h2>

          <div className="rounded-xl border border-border/60 bg-card p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                Service Type
              </label>
              <Select
                value={serviceLabels[serviceType]}
                onValueChange={(value) => {
                  const key = Object.entries(serviceLabels).find(([, v]) => v === value)?.[0];
                  if (key) setServiceType(key);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AOG Teen South">AOG Teen South</SelectItem>
                  <SelectItem value="AOG Youth South">AOG Youth South</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                Date
              </label>
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
                <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                  Event Name
                </label>
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
                  <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                    Volunteer
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {useVolunteerMinistries ? "Ministries" : "Total"}
                    </span>
                    <Switch
                      checked={useVolunteerMinistries}
                      onCheckedChange={setUseVolunteerMinistries}
                    />
                    {useVolunteerMinistries && (
                      <MinistriesDialog
                        ministries={ministries}
                        onSave={setMinistries}
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

                {useVolunteerMinistries ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ministries.map((ministry) => (
                        <div key={ministry} className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            {ministry}
                          </label>
                          <Input
                            value={currentData.volunteers[ministry]}
                            onChange={(e) =>
                              handleVolunteerChange(ministry, e.target.value)
                            }
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
                    value={currentData.volunteer_count}
                    onChange={(e) =>
                      handleChange("volunteer_count", e.target.value)
                    }
                    placeholder="e.g. 18"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                  Jemaat
                </label>
                <Input
                  value={currentData.congregation_count}
                  onChange={(e) =>
                    handleChange("congregation_count", e.target.value)
                  }
                  placeholder="e.g. 11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground/70">
                  TC
                </label>
                <Input
                  value={currentData.congregation_tc_count}
                  onChange={(e) =>
                    handleChange("congregation_tc_count", e.target.value)
                  }
                  placeholder="e.g. 11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                  {currentData.altar_calls.map((entry, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Textarea
                        value={entry.text}
                        onChange={(e) =>
                          updateAltarCall(index, "text", e.target.value)
                        }
                        placeholder="Text"
                        className="flex-1 min-h-[2.5rem]"
                        rows={1}
                      />
                      <Input
                        value={entry.count}
                        onChange={(e) =>
                          updateAltarCall(index, "count", e.target.value)
                        }
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
      </div>

      {/* Mobile spacer so TC/Altar Calls aren't hidden behind expanded preview */}
      <div className="h-[20vh] lg:hidden" aria-hidden="true" />

        <div className="hidden lg:flex flex-col gap-4 lg:col-span-2">
          <div className="sticky top-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-muted-foreground/60">
                Preview
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
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
      </div>
    </div>

    {/* Mobile fixed preview bar */}
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div
        className={`bg-card border-t border-border/70 shadow-lg transition-all duration-300 cursor-pointer ${mobilePreviewOpen ? "max-h-[70vh]" : "max-h-none"}`}
        onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
      >
        {mobilePreviewOpen && (
          <div
            className="overflow-y-auto max-h-[calc(70vh-3.5rem)] p-4 border-b border-border/40"
            onClick={(e) => e.stopPropagation()}
          >
            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
              {generateReport()}
            </pre>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <ChevronUp
              className={`size-4 transition-transform duration-300 ${mobilePreviewOpen ? "" : "rotate-180"}`}
            />
            <span>Preview</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate font-mono">
              {title} {date}
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="gap-1.5 text-xs h-8 shrink-0"
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
    </div>
    </>
  );
}
