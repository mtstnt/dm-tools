import Link from "next/link";
import { notFound } from "next/navigation";

import { getRolePermissions } from "@/actions/users/roles";

import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { actionsEnum } from "@/db/schema";

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roleId = Number(id);

  if (!Number.isFinite(roleId)) {
    notFound();
  }

  const result = await getRolePermissions(roleId);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Role</h1>
          <p className="text-muted-foreground mt-2">Role details.</p>
        </div>
        <p className="text-destructive">
          {result.error ?? "Failed to load role"}
        </p>
      </div>
    );
  }

  const { role, matrix } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">{role.name}</h1>
          <p className="text-muted-foreground mt-2">Role permissions.</p>
        </div>
        <Link
          href="/my/users/roles"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to roles
        </Link>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resource Name
              </TableHead>
              {actionsEnum.map((action) => (
                <TableHead
                  key={action}
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={actionsEnum.length + 1}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              matrix.map((row, index) => (
                <TableRow
                  key={row.resource}
                  className={
                    index % 2 === 1
                      ? "bg-muted/12 hover:bg-primary/5"
                      : "hover:bg-primary/5"
                  }
                >
                  <TableCell>{row.displayResource}</TableCell>
                  {actionsEnum.map((action) => {
                    const status = row.actions[action];
                    return (
                      <TableCell key={action}>
                        {status?.exists ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-input"
                              checked={status.assigned}
                              disabled
                              aria-label={`${action} permission for ${row.resource}`}
                            />
                            {status.assigned && status.scope ? (
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {status.scope}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
