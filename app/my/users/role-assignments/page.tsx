"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import {
  getUserRoleAssignments,
  updateUserRole,
  type UserRoleAssignment,
} from "@/actions/users/role-assignments";
import { getRoles, type Role } from "@/actions/users/roles";
import { useSessionUser } from "@/components/user-session-provider";
import { canAccess, ROLES } from "@/lib/permissions";
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
      <div>
        <h1 className="font-display text-3xl tracking-tight">Role Assignments</h1>
        <p className="mt-2 text-muted-foreground">
          Assign and update user roles. Sorted by role then name.
        </p>
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
            {users.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, index) => (
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
                      items={Object.fromEntries(
                        allRoles.map((role) => [String(role.id), role.name]),
                      )}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select role" />
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
