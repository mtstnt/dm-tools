"use client"

import * as React from "react"
import { useState } from "react"
import { PencilIcon, TrashIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type DataTableColumnDef } from "./data-table"

export type FieldType = "text" | "textarea" | "select"

export type FieldConfig = {
  name: string
  label: string
  type?: FieldType
  required?: boolean
  options?: { value: string; label: string }[]
}

export type MutationResult<T> = {
  success: boolean
  data?: T
  error?: string
}

type MasterCrudPageProps<T extends { id: number }> = {
  title: string
  description: string
  resourceLabel: string
  columns: DataTableColumnDef<T, unknown>[]
  data: T[]
  fields: FieldConfig[]
  searchColumn?: string
  defaultSortColumn?: string
  defaultSortDirection?: "asc" | "desc"
  onCreateAction: (values: Record<string, string>) => Promise<MutationResult<T>>
  onUpdateAction: (id: number, values: Record<string, string>) => Promise<MutationResult<T>>
  onDeleteAction?: (id: number) => Promise<{ success: boolean; error?: string }>
}

export function MasterCrudPage<T extends { id: number }>({
  title,
  description,
  resourceLabel,
  columns,
  data,
  fields,
  searchColumn,
  defaultSortColumn,
  defaultSortDirection,
  onCreateAction: onCreate,
  onUpdateAction: onUpdate,
  onDeleteAction: onDelete,
}: MasterCrudPageProps<T>) {
  const [items, setItems] = useState<T[]>(data)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [deletingItem, setDeletingItem] = useState<T | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  function resetForm() {
    setFormValues({})
    setError(null)
  }

  function openEdit(item: T) {
    setEditingItem(item)
    const initialValues: Record<string, string> = {}
    for (const field of fields) {
      const value = (item as Record<string, unknown>)[field.name]
      initialValues[field.name] = value == null ? "" : String(value)
    }
    setFormValues(initialValues)
    setError(null)
  }

  function openDelete(item: T) {
    if (!onDelete) return
    setDeletingItem(item)
    setError(null)
  }

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await onCreate(formValues)
    setPending(false)

    if (!result.success) {
      setError(result.error ?? "Failed to create")
      return
    }

      if (result.data) {
      setItems((prev) => [...prev, result.data as T])
    }
    setIsCreateOpen(false)
    resetForm()
  }

  async function handleUpdateSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!editingItem) return

    setPending(true)
    setError(null)

    const result = await onUpdate(editingItem.id, formValues)
    setPending(false)

    if (!result.success) {
      setError(result.error ?? "Failed to update")
      return
    }

    if (result.data) {
      setItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? result.data! : item)),
      )
    }
    setEditingItem(null)
    resetForm()
  }

  async function handleDeleteConfirm() {
    if (!deletingItem || !onDelete) return

    setPending(true)
    setError(null)

    const result = await onDelete(deletingItem.id)
    setPending(false)

    if (!result.success) {
      setError(result.error ?? "Failed to delete")
      return
    }

    setItems((prev) => prev.filter((item) => item.id !== deletingItem.id))
    setDeletingItem(null)
  }

  async function handleBulkDeleteConfirm() {
    if (!onDelete) return

    const selectedIds = Object.keys(rowSelection)
      .map((key) => items.find((item) => String(item.id) === key)?.id)
      .filter((id): id is number => id !== undefined)

    if (selectedIds.length === 0) return

    setPending(true)
    setError(null)

    const results = await Promise.all(selectedIds.map((id) => onDelete(id)))
    setPending(false)

    const failed = results.filter((result) => !result.success)
    if (failed.length > 0) {
      setError(failed[0].error ?? `Failed to delete ${failed.length} item(s)`)
      return
    }

    setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)))
    setRowSelection({})
    setIsBulkDeleteOpen(false)
  }

  function updateField(name: string, value: string | null) {
    setFormValues((prev) => ({ ...prev, [name]: value ?? "" }))
  }

  function renderField(field: FieldConfig) {
    const value = formValues[field.name] ?? ""

    if (field.type === "textarea") {
      return (
        <Textarea
          id={field.name}
          value={value}
          onChange={(event) => updateField(field.name, event.target.value)}
          required={field.required}
          rows={3}
        />
      )
    }

    if (field.type === "select" && field.options) {
      const selectedOption = field.options.find((option) => option.value === value)
      return (
        <Select
          value={value}
          onValueChange={(newValue) => updateField(field.name, newValue)}
        >
          <SelectTrigger id={field.name} className="w-full">
            <SelectValue placeholder={`Select ${field.label}`}>
              {selectedOption?.label ?? `Select ${field.label}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Input
        id={field.name}
        value={value}
        onChange={(event) => updateField(field.name, event.target.value)}
        required={field.required}
      />
    )
  }

  function renderFormContent() {
    return (
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label
              htmlFor={field.name}
              className="text-sm font-medium block"
            >
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    )
  }

  const actionColumn: DataTableColumnDef<T, unknown> = {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => {
      const item = row.original
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEdit(item)}
          >
            <PencilIcon className="size-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={() => openDelete(item)}
            >
              <TrashIcon className="size-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      )
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            if (open) resetForm()
            setIsCreateOpen(open)
          }}
        >
          <DialogTrigger
            render={
              <Button>
                <PlusIcon className="size-4" />
                Add {resourceLabel}
              </Button>
            }
          />
          <DialogContent>
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>Add {resourceLabel}</DialogTitle>
                <DialogDescription>
                  Create a new {resourceLabel.toLowerCase()}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">{renderFormContent()}</div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={[...columns, actionColumn]}
        data={items}
        searchColumn={searchColumn}
        searchPlaceholder={`Search ${resourceLabel.toLowerCase()}...`}
        defaultSortColumn={defaultSortColumn}
        defaultSortDirection={defaultSortDirection}
        enableRowSelection={!!onDelete}
        rowSelection={rowSelection}
        onRowSelectionChangeAction={setRowSelection}
        toolbar={
          onDelete && Object.keys(rowSelection).length > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(true)}
            >
              <TrashIcon className="size-4" />
              Delete {Object.keys(rowSelection).length}
            </Button>
          ) : null
        }
      />

      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent>
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <DialogTitle>Edit {resourceLabel}</DialogTitle>
              <DialogDescription>
                Update the {resourceLabel.toLowerCase()} details.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">{renderFormContent()}</div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingItem !== null}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {resourceLabel}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {resourceLabel.toLowerCase()}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="py-2 text-sm text-destructive">{error}</div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingItem(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => !open && setIsBulkDeleteOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Delete {resourceLabel}s</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {Object.keys(rowSelection).length} selected{" "}
              {resourceLabel.toLowerCase()}s? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="py-2 text-sm text-destructive">{error}</div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
