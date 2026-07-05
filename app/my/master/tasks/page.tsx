"use client"

import { useEffect, useState } from "react"
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
} from "@/actions/master/tasks"
import { MasterCrudPage } from "@/components/custom/master-crud-page"
import { type DataTableColumnDef } from "@/components/custom/data-table"

export default function TasksPage() {
  const [items, setItems] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const result = await getTasks()

      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load tasks")
        setLoading(false)
        return
      }

      setItems(result.data)
      setLoading(false)
    }

    load()
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl tracking-tight">Tasks</h1>
        <p className="text-destructive">{error}</p>
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
      data={items}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]}
      searchColumn="name"
      loading={loading}
      onCreateAction={createTask}
      onUpdateAction={updateTask}
      onDeleteAction={deleteTask}
    />
  )
}
