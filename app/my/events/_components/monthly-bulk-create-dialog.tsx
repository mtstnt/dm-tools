"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { eachWeekendOfMonth } from "date-fns/eachWeekendOfMonth";
import { Layers } from "lucide-react";
import {
  MONTHS_ID,
  BULK_EVENT_TYPES,
  BULK_EVENT_TIME,
  BULK_EVENT_TARGET_DAY,
  DATETIME_LOCAL_FORMAT,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FULL_MONTHS = MONTHS_ID;

type GenerateCard = {
  id: string;
  regionId: string;
  eventTypeId: string;
  customName: string;
  date: string;
  mode: "teams" | "members" | "manual_apply";
  teams: { value: string; label: string }[];
  members: { value: string; label: string }[];
  pics: { value: string; label: string }[];
};

interface Region {
  id: number;
  name: string;
}

interface EventType {
  id: number;
  name: string;
}

interface MonthlyBulkCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: Region[];
  eventTypes: EventType[];
  nextCardId: () => string;
  onGenerate: (cards: GenerateCard[]) => void;
}

export default function MonthlyBulkCreateDialog({
  open,
  onOpenChange,
  regions,
  eventTypes,
  nextCardId,
  onGenerate,
}: MonthlyBulkCreateDialogProps) {
  const now = new Date();
  const [regionId, setRegionId] = useState("");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const current = new Date();
      setRegionId(regions[0] ? String(regions[0].id) : "");
      setMonth(current.getMonth());
      setYear(current.getFullYear());
      setError(null);
    }
  }, [open, regions]);

  const yearOptions = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i);

  function handleCancel() {
    onOpenChange(false);
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const eventTypeLookup = new Map(
      eventTypes.map((et) => [et.name.toUpperCase(), et]),
    );

    const types = BULK_EVENT_TYPES.map((name) => {
      const et = eventTypeLookup.get(name.toUpperCase());
      if (!et) {
        setError(
          `Missing required event type: ${name} must exist in the master data.`,
        );
        return null;
      }
      return { name, id: et.id, time: BULK_EVENT_TIME[name] };
    });

    if (types.some((t) => t === null)) return;

    if (!regionId) {
      setError("Please select a region.");
      return;
    }

    const allWeekends = eachWeekendOfMonth(new Date(year, month, 1));
    const saturdays = allWeekends.filter((d) => d.getDay() === BULK_EVENT_TARGET_DAY);

    if (saturdays.length === 0) {
      setError("No Saturdays found in the selected month.");
      return;
    }

    const cards: GenerateCard[] = [];

    for (const saturday of saturdays) {
      const day = saturday.getDate();

      for (const et of types) {
        const eventDate = new Date(year, month, day, et!.time.hour, et!.time.minute);

        cards.push({
          id: nextCardId(),
          regionId,
          eventTypeId: String(et!.id),
          customName: "",
          date: format(eventDate, DATETIME_LOCAL_FORMAT),
          mode: "teams",
          teams: [],
          members: [],
          pics: [],
        });
      }
    }

    onGenerate(cards);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleGenerate}>
          <DialogHeader>
            <DialogTitle>Monthly Bulk Create</DialogTitle>
            <DialogDescription>
              Generate {BULK_EVENT_TYPES.map((t) => `${t} (${String(BULK_EVENT_TIME[t].hour).padStart(2, "0")}:${String(BULK_EVENT_TIME[t].minute).padStart(2, "0")})`).join(" and ")} event cards for
              every Saturday in the selected month.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Region
              </label>
              <Select
                value={regionId}
                onValueChange={(v) => {
                  if (v) setRegionId(v);
                }}
                items={Object.fromEntries(
                  regions.map((r) => [String(r.id), r.name]),
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={String(region.id)}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Month
              </label>
              <Select
                value={String(month)}
                onValueChange={(v) => {
                  if (v !== null) setMonth(Number(v));
                }}
                items={Object.fromEntries(
                  FULL_MONTHS.map((m, i) => [String(i), m]),
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {FULL_MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Year
              </label>
              <Select
                value={String(year)}
                onValueChange={(v) => {
                  if (v !== null) setYear(Number(v));
                }}
                items={Object.fromEntries(
                  yearOptions.map((y) => [String(y), String(y)]),
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              <Layers className="size-4" />
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
