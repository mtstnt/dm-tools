"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatISO, isValid, parse } from "date-fns";
import {
  ArrowLeft,
  CalendarPlus,
  Layers,
  Loader2,
  Plus,
} from "lucide-react";
import {
  createEvents,
  getEventCreationOptions,
  type EventCreationOptions,
} from "@/actions/events";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type MultiSelectOption } from "@/components/ui/multi-select";
import MonthlyBulkCreateDialog from "@/app/my/events/_components/monthly-bulk-create-dialog";
import {
  EventFormCardEditor,
  createEmptyCard,
  type EventFormCard,
} from "@/app/my/events/_components/event-form-card";

function toLocalDateTimeWithOffset(value: string) {
  if (!value) {
    return value;
  }

  const date = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
  return isValid(date) ? formatISO(date) : value;
}

export default function NewEventPage() {
  const router = useRouter();
  const [options, setOptions] = useState<EventCreationOptions | null>(null);
  const [cards, setCards] = useState<EventFormCard[]>([]);
  const nextCardId = useRef(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

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
        setCards([]);
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

  function duplicateCard(id: string) {
    setCards((currentCards) => {
      const index = currentCards.findIndex((card) => card.id === id);
      if (index === -1) return currentCards;
      const source = currentCards[index];
      const duplicate: EventFormCard = {
        ...source,
        id: String(nextCardId.current++),
        teams: [...source.teams],
        members: [...source.members],
        pics: [...source.pics],
      };
      const next = [...currentCards];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
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
          date: toLocalDateTimeWithOffset(card.date),
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

  function handleBulkGenerate(generatedCards: typeof cards) {
    setCards((currentCards) => [...currentCards, ...generatedCards]);
  }

  return (
    <div className="min-h-full rounded-[28px] bg-background text-foreground xl:max-w-[75%]">
      <div className="mb-6 space-y-3">
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

      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          {[0, 1].map((item) => (
            <Skeleton key={item} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : !options ? null : (
        <>
          <div className="grid gap-4 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full shadow-sm"
              onClick={() => setBulkDialogOpen(true)}
              disabled={isLoading || !options || isPending}
            >
              <Layers className="size-4" />
              Monthly Bulk Create
            </Button>
            {cards.map((card, index) => {
              const selectedEventType = eventTypeMap.get(card.eventTypeId);
              const isCustomEvent =
                selectedEventType?.name.trim().toUpperCase() === "CUSTOM";

              return (
                <EventFormCardEditor
                  key={card.id}
                  card={card}
                  index={index}
                  options={options}
                  regionItems={regionItems}
                  eventTypeItems={eventTypeItems}
                  isCustomEvent={isCustomEvent}
                  teamOptions={teamOptions}
                  memberOptions={memberOptions}
                  onUpdate={updateCard}
                  onDuplicate={duplicateCard}
                  onRemove={removeCard}
                />
              );
            })}

            <button
              type="button"
              onClick={addCard}
              disabled={isLoading || !options || isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              <Plus className="size-4" />
              Add another event
            </button>
          </div>

          <Button
            size="lg"
            className="w-full"
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
        </>
      )}

      <MonthlyBulkCreateDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        regions={options?.regions ?? []}
        eventTypes={options?.eventTypes ?? []}
        nextCardId={() => String(nextCardId.current++)}
        onGenerate={handleBulkGenerate}
      />
    </div>
  );
}

