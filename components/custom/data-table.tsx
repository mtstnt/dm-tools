"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DataTableColumnDef<TData, TValue = unknown> = ColumnDef<
  TData,
  TValue
> & {
  meta?: {
    sortMethod?: "string" | "numeric";
  };
};

export type DataTableProps<TData, TValue> = {
  columns: DataTableColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchColumn?: string;
  pageSize?: number;
  defaultSortColumn?: string;
  defaultSortDirection?: "asc" | "desc";
  enableRowSelection?: boolean;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChangeAction?: (
    value:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void;
  toolbar?: React.ReactNode;
  loading?: boolean;
};

function applySortMethod<TData, TValue>(
  columns: DataTableColumnDef<TData, TValue>[],
): ColumnDef<TData, TValue>[] {
  return columns.map((column) => {
    if (column.meta?.sortMethod === "numeric") {
      return {
        ...column,
        sortingFn: (rowA, rowB, columnId) => {
          const a = Number(rowA.getValue(columnId));
          const b = Number(rowB.getValue(columnId));
          if (Number.isNaN(a) || Number.isNaN(b)) return 0;
          return a < b ? -1 : a > b ? 1 : 0;
        },
      };
    }
    return column;
  });
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchColumn,
  pageSize = 10,
  defaultSortColumn,
  defaultSortDirection = "asc",
  enableRowSelection = false,
  rowSelection: controlledRowSelection,
  onRowSelectionChangeAction: onRowSelectionChange,
  toolbar,
  loading = false,
}: DataTableProps<TData, TValue>) {
  const initialSorting = React.useMemo<SortingState>(() => {
    if (!defaultSortColumn) return [];
    return [{ id: defaultSortColumn, desc: defaultSortDirection === "desc" }];
  }, [defaultSortColumn, defaultSortDirection]);

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = React.useState({});

  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const setRowSelection = onRowSelectionChange ?? setInternalRowSelection;
  const showSearch = Boolean(searchColumn);

  const checkboxColumn = React.useMemo<DataTableColumnDef<TData, unknown>>(
    () => ({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="size-4 rounded border-input cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          ref={(input) => {
            if (input) {
              input.indeterminate = table.getIsSomePageRowsSelected();
            }
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="size-4 rounded border-input cursor-pointer"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    [],
  );

  const processedColumns = React.useMemo(
    () =>
      applySortMethod(
        enableRowSelection ? [checkboxColumn, ...columns] : columns,
      ),
    [columns, enableRowSelection, checkboxColumn],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: processedColumns,
    initialState: {
      pagination: {
        pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
    sortingFns: {
      numeric: (rowA, rowB, columnId) => {
        const a = Number(rowA.getValue(columnId));
        const b = Number(rowB.getValue(columnId));
        if (Number.isNaN(a) || Number.isNaN(b)) return 0;
        return a < b ? -1 : a > b ? 1 : 0;
      },
    },
    enableRowSelection,
  });

  return (
    <div className="w-full space-y-3">
      {(showSearch || toolbar) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchColumn && (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) => {
                table.getColumn(searchColumn)?.setFilterValue(event.target.value);
              }}
              className="max-w-sm"
            />
          )}
          {toolbar}
        </div>
      )}
      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="text-xs font-bold text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-ml-2 h-8 data-[state=open]:bg-accent font-bold"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getIsSorted() === "desc" ? (
                            <ArrowDownIcon className="ml-1 size-4" />
                          ) : header.column.getIsSorted() === "asc" ? (
                            <ArrowUpIcon className="ml-1 size-4" />
                          ) : (
                            <ArrowUpDownIcon className="ml-1 size-4" />
                          )}
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={processedColumns.length}
                  className="h-48 text-center"
                >
                  <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  <span className="mt-2 block text-sm text-muted-foreground">
                    Loading...
                  </span>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="bg-muted/12 hover:bg-primary/5"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={processedColumns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-1">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <>
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(table.getPageCount(), 1)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
