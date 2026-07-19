"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Search } from "lucide-react";
import {
  getUserRoleAssignments,
  updateUserRole,
  type UserRoleAssignment,
} from "@/actions/users/role-assignments";
import { getRoles, type Role } from "@/actions/users/roles";
import { useSessionUser } from "@/components/user-session-provider";
import { canAccess, ROLES } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function RoleAssignmentsPage() {
  const session = useSessionUser();
  const [users, setUsers] = useState<UserRoleAssignment[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [usersResult, rolesResult] = await Promise.all([
        getUserRoleAssignments(),
        getRoles(),
      ]);

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data);
      } else {
        setError(usersResult.error ?? "Failed to load users");
      }

      if (rolesResult.success && rolesResult.data) {
        setAllRoles(rolesResult.data);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleRoleChange(userId: number, newRoleId: string | null) {
    if (!newRoleId) return;
    const roleId = Number(newRoleId);
    const previousUsers = [...users];

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, roleId, roleName: allRoles.find((r) => r.id === roleId)?.name ?? u.roleName }
          : u,
      ),
    );
    const result = await updateUserRole(userId, roleId);

    if (!result.success) {
      setUsers(previousUsers);
      setError(result.error ?? "Failed to update role");
    }
  }

  const canManage = canAccess(session?.role, [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC]);
  const adminRoleId = allRoles.find((r) => r.name === "Admin")?.id;

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (q && !u.fullName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.nij.includes(q)) {
        return false;
      }
      if (roleFilter !== "all" && String(u.roleId) !== roleFilter) {
        return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Role Assignments</h1>
          <p className="mt-2 text-muted-foreground">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Role Assignments</h1>
          <p className="text-sm text-muted-foreground">
            Assign and update user roles. Sorted by role, team, then name.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or NIJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value ?? "all")}
        >
          <SelectTrigger className="w-48 shrink-0">
            <SelectValue placeholder="All roles">
              {roleFilter === "all" ? "All roles" : allRoles.find((r) => String(r.id) === roleFilter)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {allRoles.map((role) => (
              <SelectItem key={role.id} value={String(role.id)}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/80">
            <TableRow className="hover:bg-transparent">
              <TableHead>Full Name</TableHead>
              <TableHead>NIJ</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {users.length === 0 ? "No users found." : "No users match the filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user, index) => (
                <TableRow
                  key={user.id}
                  className={
                    index % 2 === 1
                      ? "bg-muted/12 hover:bg-primary/5"
                      : "hover:bg-primary/5"
                  }
                >
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{user.nij}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    {user.teamNumber !== null ? (
                      <Badge variant="secondary">Team {user.teamNumber}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(user.roleId)}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={user.roleId === adminRoleId || user.id === session?.id}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select role">
                          {allRoles.find((r) => r.id === user.roleId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map((role) => (
                          <SelectItem key={role.id} value={String(role.id)}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
