"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, formatISO, isValid, parse } from "date-fns";
import { ArrowLeft, Loader2, Save, UsersRound } from "lucide-react";
import {
  getEventForEdit,
  updateEvent,
  type EventCreationOptions,
} from "@/actions/events";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AssignmentMode = "teams" | "members" | "manual_apply";

function formatDateForInput(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function toLocalDateTimeWithOffset(value: string) {
  if (!value) return value;
  const d = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
  return isValid(d) ? formatISO(d) : value;
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.id);

  const [options, setOptions] = useState<EventCreationOptions | null>(null);
  const [regionId, setRegionId] = useState("");
  const [eventTypeId, setEventTypeId] = useState("");
  const [customName, setCustomName] = useState("");
  const [date, setDate] = useState("");
  const [mode, setMode] = useState<AssignmentMode>("teams");
  const [teams, setTeams] = useState<MultiSelectOption[]>([]);
  const [members, setMembers] = useState<MultiSelectOption[]>([]);
  const [pics, setPics] = useState<MultiSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!Number.isInteger(eventId) || eventId <= 0) {
        setError("Event not found");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await getEventForEdit(eventId);

      if (!mounted) return;

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load event");
        setIsLoading(false);
        return;
      }

      const { options: eventOptions, ...event } = result.data;
      setOptions(eventOptions);

      const eventType = eventOptions.eventTypes.find(
        (type) => type.id === event.eventTypeId,
      );
      const isCustomEvent =
        eventType?.name.trim().toUpperCase() === "CUSTOM";

      const teamMap = new Map(
        eventOptions.teams.map((team) => [
          team.id,
          {
            value: String(team.id),
            label: `Team ${team.number} - ${team.regionName}`,
          },
        ]),
      );

      const memberMap = new Map(
        eventOptions.members.map((member) => [
          member.id,
          {
            value: String(member.id),
            label: `${member.fullName}${member.teamNumber ? ` - Team ${member.teamNumber}` : " - Not Assigned"}`,
          },
        ]),
      );

      setRegionId(String(event.regionId));
      setEventTypeId(String(event.eventTypeId));
      setCustomName(isCustomEvent ? event.name : "");
      setDate(formatDateForInput(new Date(event.date)));
      setMode(event.mode as AssignmentMode);
      setTeams(
        event.teamIds
          .map((id) => teamMap.get(id))
          .filter((opt): opt is MultiSelectOption => !!opt),
      );
      setMembers(
        event.memberIds
          .map((id) => memberMap.get(id))
          .filter((opt): opt is MultiSelectOption => !!opt),
      );
      setPics(
        event.picIds
          .map((id) => memberMap.get(id))
          .filter((opt): opt is MultiSelectOption => !!opt),
      );

      setError(null);
      setIsLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  const eventTypeMap = useMemo(() => {
    return new Map(
      options?.eventTypes.map((type) => [String(type.id), type]) ?? [],
    );
  }, [options?.eventTypes]);

  const isCustomEvent = useMemo(() => {
    return (
      eventTypeMap.get(eventTypeId)?.name.trim().toUpperCase() === "CUSTOM"
    );
  }, [eventTypeMap, eventTypeId]);

  const teamOptions = useMemo<MultiSelectOption[]>(() => {
    return (
      options?.teams.map((team) => ({
        value: String(team.id),
        label: `Team ${team.number} - ${team.regionName}`,
      })) ?? []
    );
  }, [options?.teams]);

  const regionItems = useMemo(() => {
    return Object.fromEntries(
      options?.regions.map((region) => [String(region.id), region.name]) ?? [],
    );
  }, [options?.regions]);

  const eventTypeItems = useMemo(() => {
    return Object.fromEntries(
      options?.eventTypes.map((type) => [String(type.id), type.name]) ?? [],
    );
  }, [options?.eventTypes]);

  const memberOptions = useMemo<MultiSelectOption[]>(() => {
    return (
      options?.members.map((member) => ({
        value: String(member.id),
        label: `${member.fullName}${member.teamNumber ? ` - Team ${member.teamNumber}` : " - Not Assigned"}`,
      })) ?? []
    );
  }, [options?.members]);

  function submitEdit() {
    setError(null);

    startTransition(async () => {
      const result = await updateEvent(eventId, {
        regionId,
        eventTypeId,
        customName,
        date: toLocalDateTimeWithOffset(date),
        mode,
        teamIds: teams.map((team) => Number(team.value)),
        memberIds: members.map((member) => Number(member.value)),
        picIds: pics.map((pic) => Number(pic.value)),
      });

      if (!result.success) {
        setError(result.error ?? "Failed to update event");
        return;
      }

      router.push(`/my/events/${eventId}`);
    });
  }

  return (
    <div className="min-h-full rounded-[28px] bg-background text-foreground xl:max-w-[75%]">
      <div className="mb-6 space-y-3">
        <Link
          href={`/my/events/${eventId}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0",
          )}
        >
          <ArrowLeft className="size-4" />
          Back to event
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Edit event
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Update event details and assignment configuration.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : !options ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Event data could not be loaded.
        </div>
      ) : (
        <>
          <Card className="mb-4 overflow-hidden rounded-2xl py-0 shadow-sm">
            <CardContent className="space-y-2 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Region">
                  <Select
                    value={regionId}
                    items={regionItems}
                    onValueChange={(value) => {
                      if (value) setRegionId(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.regions.map((region) => (
                        <SelectItem key={region.id} value={String(region.id)}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Event date">
                  <Input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>

                <Field label="Event type">
                  <Select
                    value={eventTypeId}
                    items={eventTypeItems}
                    onValueChange={(value) => {
                      if (value) setEventTypeId(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.eventTypes.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Assignment mode">
                  <Select
                    value={mode}
                    items={{
                      teams: "Teams",
                      members: "Members",
                      manual_apply: "Manual Apply",
                    }}
                    onValueChange={(value) =>
                      setMode(value as AssignmentMode)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teams">Teams</SelectItem>
                      <SelectItem value="members">Members</SelectItem>
                      <SelectItem value="manual_apply">Manual Apply</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {isCustomEvent && (
                <Field label="Custom event name">
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Example: Volunteer Appreciation Night"
                  />
                </Field>
              )}

              {mode === "teams" && (
                <Field label="Assigned teams">
                  <MultiSelect
                    options={teamOptions}
                    value={teams}
                    onChange={setTeams}
                    placeholder="Search and select teams..."
                  />
                </Field>
              )}

              {mode === "members" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Assigned members">
                    <MultiSelect
                      options={memberOptions}
                      value={members}
                      onChange={setMembers}
                      placeholder="Search and select members..."
                    />
                  </Field>
                  <Field label="Event PIC">
                    <MultiSelect
                      options={memberOptions}
                      value={pics}
                      onChange={setPics}
                      placeholder="Pick one or more PIC..."
                    />
                  </Field>
                </div>
              )}

              {mode === "manual_apply" && (
                <div className="space-y-3">
                  <Field label="Event PIC">
                    <MultiSelect
                      options={memberOptions}
                      value={pics}
                      onChange={setPics}
                      placeholder="Pick one or more PIC..."
                    />
                  </Field>
                  <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                    <UsersRound className="size-3.5 shrink-0" />
                    Members can apply later. Optionally select Event PICs now.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full"
            onClick={submitEdit}
            disabled={isLoading || isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save changes
          </Button>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
