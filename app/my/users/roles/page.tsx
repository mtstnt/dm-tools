"use client";

import { useEffect, useState } from "react";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  type Role,
} from "@/actions/users/roles";
import { MasterCrudPage, type MutationResult } from "@/components/custom/master-crud-page";
import type { DataTableColumnDef } from "@/components/custom/data-table";
import { AlertTriangle } from "lucide-react";

const columns: DataTableColumnDef<Role, unknown>[] = [
  {
    header: "Name",
    accessorKey: "name",
    enableSorting: true,
  },
];

export default function RolesMasterPage() {
  const [data, setData] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getRoles();
      if (result.success && result.data) {
        setData(result.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function onCreate(values: Record<string, string>): Promise<MutationResult<Role>> {
    return createRole(values);
  }

  async function onUpdate(id: number, values: Record<string, string>): Promise<MutationResult<Role>> {
    return updateRole(id, values);
  }

  async function onDelete(id: number) {
    return deleteRole(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-semibold">Hardcoded Roles</p>
          <p>
            Roles are defined in{" "}
            <code className="rounded bg-amber-500/20 px-1 py-0.5 text-xs font-mono">
              lib/permissions.ts
            </code>
            . Adding or renaming a role here does <strong>not</strong> grant it any
            system access. Contact a Developer to update the source code if you need
            a new system role.
          </p>
        </div>
      </div>

      <MasterCrudPage
        title="Roles"
        description="Manage role entries in the database."
        resourceLabel="Role"
        columns={columns}
        data={data}
        fields={[{ name: "name", label: "Name", required: true }]}
        searchColumn="name"
        defaultSortColumn="name"
        defaultSortDirection="asc"
        onCreateAction={onCreate}
        onUpdateAction={onUpdate}
        onDeleteAction={onDelete}
        loading={loading}
      />
    </div>
  );
}
