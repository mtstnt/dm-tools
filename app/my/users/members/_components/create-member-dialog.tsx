"use client";

import { useState } from "react";
import { createUser } from "@/actions/users/members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TeamOption = {
  id: number;
  number: number;
};

type CreateMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamOptions: TeamOption[];
  onComplete: () => void;
};

const emptyForm = {
  fullName: "",
  nij: "",
  email: "",
  password: "",
  teamId: "null",
};

export function CreateMemberDialog({
  open,
  onOpenChange,
  teamOptions,
  onComplete,
}: CreateMemberDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setForm(emptyForm);
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createUser(form);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create user");
      return;
    }

    handleOpenChange(false);
    onComplete();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>
              Add a new member to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fullName: e.target.value.toUpperCase(),
                  }))
                }
                onBlur={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fullName: e.target.value.trim(),
                  }))
                }
                placeholder="Full name"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="nij" className="text-sm font-medium">
                NIJ
              </label>
              <Input
                id="nij"
                value={form.nij}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    nij: e.target.value,
                  }))
                }
                onBlur={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    nij: e.target.value.trim(),
                  }))
                }
                placeholder="NIJ"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value.toLowerCase(),
                  }))
                }
                onBlur={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value.trim(),
                  }))
                }
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Password"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="teamId" className="text-sm font-medium">
                Team
              </label>
              <Select
                value={form.teamId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, teamId: value ?? "null" }))
                }
                items={{
                  null: "Not assigned",
                  ...Object.fromEntries(
                    teamOptions.map((team) => [
                      String(team.id),
                      `Team ${team.number}`,
                    ]),
                  ),
                }}
              >
                <SelectTrigger id="teamId" className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Not assigned</SelectItem>
                  {teamOptions.map((team) => (
                    <SelectItem key={team.id} value={String(team.id)}>
                      Team {team.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
