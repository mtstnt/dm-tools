"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Eye,
  ListFilter,
  Loader,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";

import type { MemberUser, TeamWithMembers } from "@/actions/users/members";
import {
  createUser,
  updateUser,
  deleteUser,
  getTeamMembers,
} from "@/actions/users/members";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type ViewModel = {
  teams: TeamWithMembers[];
  unassigned: MemberUser[];
  teamOptions: TeamOption[];
};

const emptyForm = {
  fullName: "",
  nij: "",
  email: "",
  password: "",
  teamId: "null",
};

export default function MembersPage() {
  const router = useRouter();

  const [viewModel, setViewModel] = useState<ViewModel | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MemberUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setDataLoading(true);
    setDataError(null);

    const result = await getTeamMembers();

    if (!result.success || !result.data) {
      setDataError(result.error ?? "Failed to load members");
      setDataLoading(false);
      return;
    }

    const teamOptions = result.data.teams.map((team) => ({
      id: team.id,
      number: team.number,
    }));

    setViewModel({
      teams: result.data.teams,
      unassigned: result.data.unassigned,
      teamOptions,
    });
    setDataLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(user: MemberUser) {
    setSelectedUser(user);
    setForm({
      fullName: user.fullName,
      nij: user.nij,
      email: user.email,
      password: "",
      teamId: String(user.teamId ?? "null"),
    });
    setError(null);
    setEditOpen(true);
  }

  function openDelete(user: MemberUser) {
    setSelectedUser(user);
    setError(null);
    setDeleteOpen(true);
  }

  function closeAll() {
    setCreateOpen(false);
    setEditOpen(false);
    setDeleteOpen(false);
    setSelectedUser(null);
    setError(null);
    setForm(emptyForm);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createUser(form);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create user");
      return;
    }

    closeAll();
    router.refresh();
    await loadData();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setError(null);

    const result = await updateUser(selectedUser.id, form);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to update user");
      return;
    }

    closeAll();
    router.refresh();
    await loadData();
  }

  async function handleDelete() {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);

    const result = await deleteUser(selectedUser.id);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to delete user");
      return;
    }

    closeAll();
    router.refresh();
    await loadData();
  }

  if (dataLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-2">View members by team.</p>
        </div>
        <p className="text-destructive">{dataError}</p>
      </div>
    );
  }

  const teams = viewModel?.teams ?? [];
  const unassigned = viewModel?.unassigned ?? [];
  const teamOptions = viewModel?.teamOptions ?? [];

  function renderFormFields() {
    return (
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
              setForm((prev) => ({ ...prev, fullName: e.target.value.trim() }))
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
              setForm((prev) => ({ ...prev, nij: e.target.value.trim() }))
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
              setForm((prev) => ({ ...prev, email: e.target.value.trim() }))
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
            placeholder={editOpen ? "Leave blank to keep current" : "Password"}
            required={!editOpen}
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Teams Directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of all active teams and unassigned members.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate} className="h-10 rounded-lg px-5">
            <UserPlus className="size-4" />
            Add Member
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <DirectoryCard
            key={team.id}
            title={`Team ${team.number}`}
            count={team.users.length}
            emptyMessage="No members assigned."
            users={team.users}
            openEdit={openEdit}
            openDelete={openDelete}
          />
        ))}
        <DirectoryCard
          title="Not Assigned"
          count={unassigned.length}
          emptyMessage="All members are assigned to a team."
          muted
          users={unassigned}
          openEdit={openEdit}
          openDelete={openDelete}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                Add a new member to the system.
              </DialogDescription>
            </DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>
                Update {selectedUser?.fullName ?? "user"} details.
              </DialogDescription>
            </DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {selectedUser?.fullName}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type DirectoryCardProps = {
  title: string;
  count: number;
  emptyMessage: string;
  users: MemberUser[];
  muted?: boolean;
  openEdit: (user: MemberUser) => void;
  openDelete: (user: MemberUser) => void;
};

function DirectoryCard({
  title,
  count,
  emptyMessage,
  users,
  muted = false,
  openEdit,
  openDelete,
}: Readonly<DirectoryCardProps>) {
  return (
    <Card className="overflow-hidden rounded-xl border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 px-6 pb-3 pt-6">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`size-2 rounded-full ${muted ? "bg-muted-foreground" : "bg-primary"}`}
            />
            {count} {count === 1 ? "Member" : "Members"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        {users.length === 0 ? (
          <EmptyRoster message={emptyMessage} />
        ) : (
          <div>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                openEdit={openEdit}
                openDelete={openDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyRoster({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 text-center">
      <p className="text-sm italic text-muted-foreground">{message}</p>
    </div>
  );
}

type UserRowProps = {
  user: MemberUser;
  openEdit: (user: MemberUser) => void;
  openDelete: (user: MemberUser) => void;
};

function UserRow({ user, openEdit, openDelete }: Readonly<UserRowProps>) {
  return (
    <div
      key={user.id}
      className="group/row flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground shadow-sm">
          {user.fullName.slice(0, 1)}
          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-emerald-500" />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">
              {user.fullName}
            </p>
            {user.isSpv && (
              <Crown className="size-3.5 shrink-0 text-amber-500" />
            )}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {user.isSpv ? "SPV" : "Member"} | {user.nij}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
        <Link
          href={`/my/users/members/${user.id}`}
          className={buttonVariants({ variant: "ghost", size: "icon-xs" })}
          aria-label={`View ${user.fullName}`}
        >
          <Eye className="size-3.5" />
        </Link>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => openEdit(user)}
          aria-label={`Edit ${user.fullName}`}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => openDelete(user)}
          aria-label={`Delete ${user.fullName}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
