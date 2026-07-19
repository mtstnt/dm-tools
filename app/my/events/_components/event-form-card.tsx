"use client";

import { type ReactNode } from "react";
import { Copy, Trash2, UsersRound } from "lucide-react";
import { type EventCreationOptions } from "@/actions/events";
import { Button } from "@/components/ui/button";
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

export type AssignmentMode = "teams" | "members" | "manual_apply";

export type EventFormCard = {
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

export function createEmptyCard(id: string, options?: EventCreationOptions): EventFormCard {
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

export interface EventFormCardProps {
  card: EventFormCard;
  index: number;
  options: EventCreationOptions;
  regionItems: Record<string, string>;
  eventTypeItems: Record<string, string>;
  isCustomEvent: boolean;
  teamOptions: MultiSelectOption[];
  memberOptions: MultiSelectOption[];
  onUpdate: (id: string, updates: Partial<EventFormCard>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function EventFormCardEditor({
  card,
  index,
  options,
  regionItems,
  eventTypeItems,
  isCustomEvent,
  teamOptions,
  memberOptions,
  onUpdate,
  onDuplicate,
  onRemove,
}: EventFormCardProps) {
  return (
    <Card className="overflow-hidden rounded-2xl py-0 shadow-sm">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
          </span>
          <div className="flex gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onDuplicate(card.id)}
              aria-label={`Duplicate event ${index + 1}`}
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={() => onRemove(card.id)}
              aria-label={`Remove event ${index + 1}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Region">
            <Select
              value={card.regionId}
              items={regionItems}
              onValueChange={(regionId) => {
                if (regionId) onUpdate(card.id, { regionId });
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
              value={card.date}
              onChange={(event) =>
                onUpdate(card.id, { date: event.target.value })
              }
            />
          </Field>

          <Field label="Event type">
            <Select
              value={card.eventTypeId}
              items={eventTypeItems}
              onValueChange={(eventTypeId) => {
                if (eventTypeId) onUpdate(card.id, { eventTypeId });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {options.eventTypes.map((eventType) => (
                  <SelectItem key={eventType.id} value={String(eventType.id)}>
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
                onUpdate(card.id, { mode: mode as AssignmentMode })
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

        {isCustomEvent ? (
          <Field label="Custom event name">
            <Input
              value={card.customName}
              onChange={(event) =>
                onUpdate(card.id, { customName: event.target.value })
              }
              placeholder="Example: Volunteer Appreciation Night"
            />
          </Field>
        ) : null}

        {card.mode === "teams" ? (
          <Field label="Assigned teams">
            <MultiSelect
              options={teamOptions}
              value={card.teams}
              onChange={(teams) => onUpdate(card.id, { teams })}
              placeholder="Search and select teams..."
            />
          </Field>
        ) : null}

        {card.mode === "members" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Assigned members">
              <MultiSelect
                options={memberOptions}
                value={card.members}
                onChange={(members) => onUpdate(card.id, { members })}
                placeholder="Search and select members..."
              />
            </Field>
            <Field label="Event PIC">
              <MultiSelect
                options={memberOptions}
                value={card.pics}
                onChange={(pics) => onUpdate(card.id, { pics })}
                placeholder="Pick one or more PIC..."
              />
            </Field>
          </div>
        ) : null}

        {card.mode === "manual_apply" ? (
          <div className="space-y-3">
            <Field label="Event PIC">
              <MultiSelect
                options={memberOptions}
                value={card.pics}
                onChange={(pics) => onUpdate(card.id, { pics })}
                placeholder="Pick one or more PIC..."
              />
            </Field>
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              <UsersRound className="size-3.5 shrink-0" />
              Members can apply later. Optionally select Event PICs now.
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
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
