"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, List, Loader } from "lucide-react";

import {
  getUserDetail,
  getUserSchedules,
  type UserDetail,
  type ScheduleItem,
} from "@/actions/users/members";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value ?? "-"} readOnly />
    </div>
  );
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <span className="truncate font-medium">{item.eventName}</span>
      <span className="shrink-0 text-muted-foreground">
        {formatDate(item.eventDate)}
      </span>
    </li>
  );
}

function EmptySchedule({ message }: { message: string }) {
  return (
    <p className="py-4 text-center text-sm text-muted-foreground">{message}</p>
  );
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [schedules, setSchedules] = useState<{
    past: ScheduleItem[];
    upcoming: ScheduleItem[];
    all: ScheduleItem[];
  } | null>(null);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      if (!Number.isFinite(userId)) {
        setError("Invalid user ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result = await getUserDetail(userId);

      if (ignore) return;

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load user");
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(result.data);
      setLoading(false);
    }

    loadUser();

    return () => {
      ignore = true;
    };
  }, [userId]);

  useEffect(() => {
    let ignore = false;

    async function loadSchedules() {
      if (!Number.isFinite(userId)) return;

      setSchedulesLoading(true);
      const result = await getUserSchedules(userId);

      if (ignore) return;

      if (result.success && result.data) {
        setSchedules(result.data);
      }
      setSchedulesLoading(false);
    }

    loadSchedules();

    return () => {
      ignore = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Member</h1>
          <p className="text-sm text-muted-foreground">Member details.</p>
        </div>
        <p className="text-destructive">{error ?? "Failed to load user"}</p>
      </div>
    );
  }

  const hasPast = (schedules?.past.length ?? 0) > 0;
  const hasUpcoming = (schedules?.upcoming.length ?? 0) > 0;
  const hasAny = hasPast || hasUpcoming;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/my/users/members"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0 mb-3",
          )}
        >
          <ArrowLeft className="size-4" />
          Back to members
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
              {user.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              User profile and schedule overview.
            </p>
            <Badge
              className="mt-3"
              variant={user.sourceId ? "secondary" : "outline"}
            >
              {user.sourceId
                ? `Connected with SC Web (ID: ${user.sourceId})`
                : "Not yet connected with SC Web"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>
              Read-only database fields for this user.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DetailField label="Full name" value={user.fullName} />
            <DetailField label="NIJ" value={user.nij} />
            <DetailField label="Email" value={user.email} />
            <DetailField
              label="Team"
              value={user.teamNumber ? `Team ${user.teamNumber}` : null}
            />
            <DetailField label="Role" value={user.roleName} />
            <DetailField label="Created at" value={formatDate(user.createdAt)} />
            <DetailField label="Updated at" value={formatDate(user.updatedAt)} />
            <DetailField label="Created by" value={user.createdBy} />
            <DetailField label="Updated by" value={user.updatedBy} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedules</CardTitle>
            <CardDescription>
              Recent and upcoming event assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {schedulesLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {hasPast && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Past</h3>
                    <ul className="space-y-2">
                      {schedules!.past.map((item) => (
                        <ScheduleRow key={item.eventId} item={item} />
                      ))}
                    </ul>
                  </div>
                )}

                {hasUpcoming && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Upcoming</h3>
                    <ul className="space-y-2">
                      {schedules!.upcoming.map((item) => (
                        <ScheduleRow key={item.eventId} item={item} />
                      ))}
                    </ul>
                  </div>
                )}

                {!hasAny && <EmptySchedule message="No schedules found." />}
              </>
            )}
          </CardContent>
          {!schedulesLoading && hasAny && (
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDialogOpen(true)}
              >
                <List className="mr-2 size-4" />
                View More
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
            <CardDescription>
              Performance reviews and feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">
              Coming soon...
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>All Schedules</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Event Name</TableHead>
                <TableHead>Date &amp; Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules?.all.map((item, index) => (
                <TableRow key={item.eventId}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.eventName}
                  </TableCell>
                  <TableCell>{formatDate(item.eventDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(!schedules || schedules.all.length === 0) && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No schedules found.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
