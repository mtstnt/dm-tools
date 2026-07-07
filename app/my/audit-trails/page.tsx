import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import { getAuditTrails } from "@/actions/audit-trails";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

function parsePageParam(raw: string | undefined): number {
  const parsed = Number(raw ?? "1");
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

function formatChangedAt(date: Date): string {
  return format(date, "dd MMM yyyy HH:mm", { locale: idLocale });
}

function JsonPreview({ value }: { value: string }) {
  return (
    <code
      className="block max-w-[220px] text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap break-all"
      title={value}
    >
      {value}
    </code>
  );
}

export default async function AuditTrailsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const result = await getAuditTrails(page);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Audit Trails</h1>
          <p className="text-muted-foreground mt-2">
            Read-only system activity log.
          </p>
        </div>
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  const { data, totalCount, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Audit Trails</h1>
        <p className="text-muted-foreground mt-2">
          Read-only system activity log.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-bold text-muted-foreground w-16">
                ID
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">
                Changed At
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">
                User
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">
                Resource
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground w-24">
                Action
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground w-20">
                Record
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">
                Old Data
              </TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">
                New Data
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  className="bg-muted/12 hover:bg-primary/5"
                >
                  <TableCell className="tabular-nums">{row.id}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatChangedAt(row.changedAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.userName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap capitalize">
                    {row.resource}
                  </TableCell>
                  <TableCell className="whitespace-nowrap capitalize">
                    {row.action}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.recordId}</TableCell>
                  <TableCell>
                    <JsonPreview value={row.oldData} />
                  </TableCell>
                  <TableCell>
                    <JsonPreview value={row.newData} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No audit trails found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {totalCount > 0 ? (
            <>
              Showing {startRow}–{endRow} of {totalCount} entries
            </>
          ) : (
            <>No entries</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PaginationButton
            page={page - 1}
            label="Previous"
            disabled={page <= 1}
          />
          <div className="text-sm">
            Page {page} of {totalPages}
          </div>
          <PaginationButton
            page={page + 1}
            label="Next"
            disabled={page >= totalPages}
          />
        </div>
      </div>
    </div>
  );
}

function PaginationButton({
  page,
  label,
  disabled,
}: {
  page: number;
  label: string;
  disabled: boolean;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {label}
      </Button>
    );
  }

  return (
    <Link
      href={`/my/audit-trails?page=${page}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      {label}
    </Link>
  );
}
