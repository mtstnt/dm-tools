import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
} from "@/actions/master/tasks"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default async function TasksPage() {
  const result = await getTasks()

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Tasks</h1>
        <p className="text-destructive">
          {result.error ?? "Failed to load tasks"}
        </p>
      </div>
    )
  }

  const columns: DataTableColumnDef<Task, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: { sortMethod: "string" },
    },
  ]

  return (
    <MasterCrudPage
      title="Tasks"
      description="Manage tasks."
      resourceLabel="Task"
      columns={columns}
      data={result.data}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]}
      searchColumn="name"
      onCreateAction={createTask}
      onUpdateAction={updateTask}
      onDeleteAction={deleteTask}
    />
  )
}
