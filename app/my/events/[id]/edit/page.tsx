"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, formatISO, isValid, parse } from "date-fns";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import {
  getEventForEdit,
  updateEvent,
  type EventCreationOptions,
  type EventForEditData,
} from "@/actions/events";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type MultiSelectOption } from "@/components/ui/multi-select";
import {
  EventFormCardEditor,
  type EventFormCard,
} from "@/app/my/events/_components/event-form-card";

function formatDateForInput(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function toLocalDateTimeWithOffset(value: string) {
  if (!value) {
    return value;
  }

  const d = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
  return isValid(d) ? formatISO(d) : value;
}

function buildCardFromEvent(
  event: EventForEditData,
  options: EventCreationOptions,
): EventFormCard {
  const eventType = options.eventTypes.find(
    (type) => type.id === event.eventTypeId,
  );
  const isCustomEvent =
    eventType?.name.trim().toUpperCase() === "CUSTOM";

  const teamMap = new Map(
    options.teams.map((team) => [
      team.id,
      { value: String(team.id), label: `Team ${team.number} - ${team.regionName}` },
    ]),
  );

  const memberMap = new Map(
    options.members.map((member) => [
      member.id,
      {
        value: String(member.id),
        label: `${member.fullName}${member.teamNumber ? ` - Team ${member.teamNumber}` : " - Not Assigned"}`,
      },
    ]),
  );

  return {
    id: "edit-card",
    regionId: String(event.regionId),
    eventTypeId: String(event.eventTypeId),
    customName: isCustomEvent ? event.name : "",
    date: formatDateForInput(new Date(event.date)),
    mode: event.mode,
    teams: event.teamIds
      .map((id) => teamMap.get(id))
      .filter((opt): opt is MultiSelectOption => !!opt),
    members: event.memberIds
      .map((id) => memberMap.get(id))
      .filter((opt): opt is MultiSelectOption => !!opt),
    pics: event.picIds
      .map((id) => memberMap.get(id))
      .filter((opt): opt is MultiSelectOption => !!opt),
  };
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.id);

  const [data, setData] = useState<EventForEditData | null>(null);
  const [card, setCard] = useState<EventFormCard | null>(null);
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
      } else {
        setError(null);
        setData(result.data);
        setCard(buildCardFromEvent(result.data, result.data.options));
      }

      setIsLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  const eventTypeMap = useMemo(() => {
    return new Map(
      data?.options.eventTypes.map((eventType) => [
        String(eventType.id),
        eventType,
      ]) ?? [],
    );
  }, [data?.options.eventTypes]);

  const teamOptions = useMemo<MultiSelectOption[]>(() => {
    return (
      data?.options.teams.map((team) => ({
        value: String(team.id),
        label: `Team ${team.number} - ${team.regionName}`,
      })) ?? []
    );
  }, [data?.options.teams]);

  const regionItems = useMemo(() => {
    return Object.fromEntries(
      data?.options.regions.map((region) => [
        String(region.id),
        region.name,
      ]) ?? [],
    );
  }, [data?.options.regions]);

  const eventTypeItems = useMemo(() => {
    return Object.fromEntries(
      data?.options.eventTypes.map((eventType) => [
        String(eventType.id),
        eventType.name,
      ]) ?? [],
    );
  }, [data?.options.eventTypes]);

  const memberOptions = useMemo<MultiSelectOption[]>(() => {
    return (
      data?.options.members.map((member) => ({
        value: String(member.id),
        label: `${member.fullName}${member.teamNumber ? ` - Team ${member.teamNumber}` : " - Not Assigned"}`,
      })) ?? []
    );
  }, [data?.options.members]);

  function updateCard(_id: string, updates: Partial<EventFormCard>) {
    setCard((current) => (current ? { ...current, ...updates } : null));
  }

  function submitEdit() {
    if (!card) return;

    setError(null);

    startTransition(async () => {
      const result = await updateEvent(eventId, {
        regionId: card.regionId,
        eventTypeId: card.eventTypeId,
        customName: card.customName,
        date: toLocalDateTimeWithOffset(card.date),
        mode: card.mode,
        teamIds: card.teams.map((team) => Number(team.value)),
        memberIds: card.members.map((member) => Number(member.value)),
        picIds: card.pics.map((pic) => Number(pic.value)),
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
      ) : !card || !data ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Event data could not be loaded.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <EventFormCardEditor
              card={card}
              index={0}
              options={data.options}
              regionItems={regionItems}
              eventTypeItems={eventTypeItems}
              isCustomEvent={
                eventTypeMap.get(card.eventTypeId)?.name.trim().toUpperCase() ===
                "CUSTOM"
              }
              teamOptions={teamOptions}
              memberOptions={memberOptions}
              onUpdate={updateCard}
              onDuplicate={() => {}}
              onRemove={() => {}}
            />
          </div>

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
