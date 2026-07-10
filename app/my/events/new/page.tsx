"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarPlus,
  Loader2,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  createEvents,
  getEventCreationOptions,
  type EventCreationOptions,
} from "@/actions/events";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type EventFormCard = {
  id: string;
  regionId: string;
  eventTypeId: string;
  customName: string;
  date: string;
  mode: AssignmentMode;
  teams: MultiSelectOption[];
  members: MultiSelectOption[];
  pics: MultiSelectOption[];
};

function createEmptyCard(id: string, options?: EventCreationOptions): EventFormCard {
  return {
    id,
    regionId: options?.regions[0] ? String(options.regions[0].id) : "",
    eventTypeId: options?.eventTypes[0] ? String(options.eventTypes[0].id) : "",
    customName: "",
    date: "",
    mode: "teams",
    teams: [],
    members: [],
    pics: [],
  };
}

export default function NewEventPage() {
  const router = useRouter();
  const [options, setOptions] = useState<EventCreationOptions | null>(null);
  const [cards, setCards] = useState<EventFormCard[]>(() => [
    createEmptyCard("0"),
  ]);
  const nextCardId = useRef(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      setIsLoading(true);
      const result = await getEventCreationOptions();

      if (!mounted) {
        return;
      }

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load event creation options");
        setOptions(null);
      } else {
        setError(null);
        setOptions(result.data);
        setCards([createEmptyCard("0", result.data)]);
        nextCardId.current = 1;
      }

      setIsLoading(false);
    }

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const eventTypeMap = useMemo(() => {
    return new Map(
      options?.eventTypes.map((eventType) => [
        String(eventType.id),
        eventType,
      ]) ?? [],
    );
  }, [options?.eventTypes]);

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
      options?.eventTypes.map((eventType) => [
        String(eventType.id),
        eventType.name,
      ]) ?? [],
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

  function updateCard(id: string, updates: Partial<EventFormCard>) {
    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === id ? { ...card, ...updates } : card,
      ),
    );
  }

  function addCard() {
    setCards((currentCards) => [
      ...currentCards,
      createEmptyCard(String(nextCardId.current++), options ?? undefined),
    ]);
  }

  function removeCard(id: string) {
    setCards((currentCards) => currentCards.filter((card) => card.id !== id));
  }

  function submitEvents() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await createEvents({
        events: cards.map((card) => ({
          regionId: card.regionId,
          eventTypeId: card.eventTypeId,
          customName: card.customName,
          date: card.date,
          mode: card.mode,
          teamIds: card.teams.map((team) => Number(team.value)),
          memberIds: card.members.map((member) => Number(member.value)),
          picIds: card.pics.map((pic) => Number(pic.value)),
        })),
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create events");
        return;
      }

      setSuccessMessage(
        `Created ${result.createdCount ?? cards.length} event(s).`,
      );
      router.push("/my/events");
    });
  }

  return (
    <div className="min-h-full rounded-[28px] bg-background p-4 text-foreground md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link
            href="/my/events"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-fit px-0",
            )}
          >
            <ArrowLeft className="size-4" />
            Back to events
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Create events
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Stack multiple event cards, choose how each one receives
              assignments, and submit them together.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={addCard}
            disabled={isLoading || !options || isPending}
          >
            <Plus className="size-4" />
            Add another event
          </Button>
          <Button
            onClick={submitEvents}
            disabled={isLoading || !options || isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            Submit {cards.length} event{cards.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          {successMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-[34rem] rounded-2xl" />
          ))}
        </div>
      ) : !options ? null : (
        <div className="grid gap-4 xl:grid-cols-2">
          {cards.map((card, index) => {
            const selectedEventType = eventTypeMap.get(card.eventTypeId);
            const isCustomEvent =
              selectedEventType?.name.trim().toUpperCase() === "CUSTOM";

            return (
              <Card
                key={card.id}
                className="overflow-hidden rounded-2xl py-0 shadow-sm"
              >
                <CardHeader className="border-b bg-muted/30 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {index + 1}
                        </span>
                        Event card
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Region, date, type, and assignment mode for one event.
                      </CardDescription>
                    </div>
                    {cards.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeCard(card.id)}
                        aria-label={`Remove event ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Region">
                      <Select
                        value={card.regionId}
                        items={regionItems}
                        onValueChange={(regionId) => {
                          if (regionId) updateCard(card.id, { regionId });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.regions.map((region) => (
                            <SelectItem
                              key={region.id}
                              value={String(region.id)}
                            >
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Event date">
                      <Input
                        type="datetime-local"
                        value={card.date}
                        onChange={(event) =>
                          updateCard(card.id, { date: event.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Event type">
                      <Select
                        value={card.eventTypeId}
                        items={eventTypeItems}
                        onValueChange={(eventTypeId) => {
                          if (eventTypeId) updateCard(card.id, { eventTypeId });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.eventTypes.map((eventType) => (
                            <SelectItem
                              key={eventType.id}
                              value={String(eventType.id)}
                            >
                              {eventType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Assignment mode">
                      <Select
                        value={card.mode}
                        items={{
                          teams: "Teams",
                          members: "Members",
                          manual_apply: "Manual Apply",
                        }}
                        onValueChange={(mode) =>
                          updateCard(card.id, { mode: mode as AssignmentMode })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teams">Teams</SelectItem>
                          <SelectItem value="members">Members</SelectItem>
                          <SelectItem value="manual_apply">
                            Manual Apply
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {isCustomEvent ? (
                    <Field label="Custom event name">
                      <Input
                        value={card.customName}
                        onChange={(event) =>
                          updateCard(card.id, {
                            customName: event.target.value,
                          })
                        }
                        placeholder="Example: Volunteer Appreciation Night"
                      />
                    </Field>
                  ) : null}

                  <div className="rounded-xl border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Assignments</p>
                        <p className="text-xs text-muted-foreground">
                          {getModeDescription(card.mode)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {card.mode.replace("_", " ")}
                      </Badge>
                    </div>

                    {card.mode === "teams" ? (
                      <Field label="Assigned teams">
                        <MultiSelect
                          options={teamOptions}
                          value={card.teams}
                          onChange={(teams) => updateCard(card.id, { teams })}
                          placeholder="Search and select teams..."
                        />
                      </Field>
                    ) : null}

                    {card.mode === "members" ? (
                      <div className="space-y-4">
                        <Field label="Assigned members">
                          <MultiSelect
                            options={memberOptions}
                            value={card.members}
                            onChange={(members) =>
                              updateCard(card.id, { members })
                            }
                            placeholder="Search and select members..."
                          />
                        </Field>
                        <Field label="Event PIC">
                          <MultiSelect
                            options={memberOptions}
                            value={card.pics}
                            onChange={(pics) => updateCard(card.id, { pics })}
                            placeholder="Pick one or more PIC..."
                          />
                        </Field>
                      </div>
                    ) : null}

                    {card.mode === "manual_apply" ? (
                      <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        <UsersRound className="mt-0.5 size-4 shrink-0" />
                        <p>
                          No assignment input is needed now. Members can apply
                          later and will be added to event assignments
                          automatically by the apply flow.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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

function getModeDescription(mode: AssignmentMode) {
  if (mode === "teams") {
    return "Assign one or more teams to this event.";
  }

  if (mode === "members") {
    return "Assign members directly and mark PICs with the Event PIC task.";
  }

  return "Leave assignments open for manual application.";
}
