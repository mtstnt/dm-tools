"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";

import { getUserDetail, type UserDetail } from "@/actions/users/members";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      if (ignore) {
        return;
      }

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
          <h1 className="font-display text-3xl tracking-tight">Member</h1>
          <p className="mt-2 text-muted-foreground">Member details.</p>
        </div>
        <p className="text-destructive">{error ?? "Failed to load user"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">
            {user.fullName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            User profile and schedule overview.
          </p>
          <Badge className="mt-3" variant={user.sourceId ? "secondary" : "outline"}>
            {user.sourceId
              ? `Connected with SC Web (ID: ${user.sourceId})`
              : "Not yet connected with SC Web"}
          </Badge>
        </div>
        <Link
          href="/my/users/members"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to members
        </Link>
      </div>

      <Tabs defaultValue="dashboard" className="w-full gap-4">
        <TabsList className="w-full flex flex-row">
          <TabsTrigger value="dashboard" className="w-full">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="schedules" className="w-full">
            Schedules
          </TabsTrigger>
          <TabsTrigger value="review" className="w-full">
            Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>User Data</CardTitle>
              <CardDescription>
                Read-only database fields for this user.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Full name" value={user.fullName} />
              <DetailField label="NIJ" value={user.nij} />
              <DetailField label="Email" value={user.email} />
              <DetailField label="Team" value={user.teamNumber ? `Team ${user.teamNumber}` : null} />
              <DetailField label="Role" value={user.roleName} />
              <DetailField label="Created at" value={formatDate(user.createdAt)} />
              <DetailField label="Updated at" value={formatDate(user.updatedAt)} />
              <DetailField label="Created by" value={user.createdBy} />
              <DetailField label="Updated by" value={user.updatedBy} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              Coming soon...
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
            </CardHeader>
            <CardContent>
              Coming soon...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
