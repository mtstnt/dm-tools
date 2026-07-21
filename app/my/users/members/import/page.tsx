"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader } from "lucide-react";

import type {
  CsvValidationError,
  CsvRowPreview,
} from "@/actions/users/members-import";
import {
  validateMembersCsv,
  importMembers,
} from "@/actions/users/members-import";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MembersImportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<CsvValidationError[]>([]);
  const [preview, setPreview] = useState<CsvRowPreview[] | null>(null);
  const [done, setDone] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrors([]);
    setPreview(null);
    setDone(false);
    setLoading(true);

    try {
      const text = await file.text();
      const result = await validateMembersCsv(text);

      if (!result.success) {
        setErrors([
          { row: 0, column: "-", message: result.error ?? "Validation failed" },
        ]);
      } else if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
      } else if (result.preview) {
        setPreview(result.preview);
      }
    } catch {
      setErrors([{ row: 0, column: "-", message: "Failed to read file" }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setDone(false);
    setLoading(true);

    try {
      const fileInput = document.getElementById(
        "import-file-input",
      ) as HTMLInputElement;
      const file = fileInput?.files?.[0];
      if (!file) {
        setErrors([{ row: 0, column: "-", message: "No file selected" }]);
        setLoading(false);
        return;
      }

      const text = await file.text();
      const result = await importMembers(text);

      if (!result.success) {
        setErrors([
          { row: 0, column: "-", message: result.error ?? "Import failed" },
        ]);
      } else {
        setDone(true);
        setPreview(null);
        setErrors([]);
        router.refresh();
      }
    } catch {
      setErrors([{ row: 0, column: "-", message: "Failed to import" }]);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !loading && errors.length === 0 && preview && preview.length > 0 && !done;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/my/users/members"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Import Members
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a CSV file to import members. NIJ is used as the unique key
            for upsert.
          </p>
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="import-file-input" className="text-sm font-medium">
          CSV File
        </label>
        <Input
          id="import-file-input"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={loading}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader className="size-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">
            Processing...
          </span>
        </div>
      )}

      {!loading && errors.length > 0 && (
        <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <p className="mb-2 text-sm font-medium text-destructive">
            Validation Errors
          </p>
          <div className="max-h-60 overflow-y-auto">
            <Table className="min-w-[360px] text-xs">
              <TableHeader>
                <TableRow className="border-destructive/20 hover:bg-transparent">
                  <TableHead className="text-destructive">Row</TableHead>
                  <TableHead className="text-destructive">Column</TableHead>
                  <TableHead className="text-destructive">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((err, i) => (
                  <TableRow
                    key={i}
                    className="border-destructive/10 hover:bg-transparent"
                  >
                    <TableCell className="tabular-nums">{err.row}</TableCell>
                    <TableCell>{err.column}</TableCell>
                    <TableCell>{err.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!loading && preview && preview.length > 0 && (
        <div className="max-h-96 overflow-y-auto rounded-lg border">
          <Table className="min-w-[640px] text-xs">
            <TableHeader>
              <TableRow className="sticky top-0 bg-muted/50 hover:bg-muted/50">
                <TableHead>Status</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>CG</TableHead>
                <TableHead>NIJ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row, i) => (
                <TableRow
                  key={i}
                  className={
                    row.status === "NEW"
                      ? "bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30"
                      : row.status === "UPDATED"
                        ? "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30"
                        : ""
                  }
                >
                  <TableCell>
                    <span
                      className={
                        row.status === "NEW"
                          ? "font-semibold text-green-700 dark:text-green-400"
                          : row.status === "UPDATED"
                            ? "font-semibold text-yellow-700 dark:text-yellow-400"
                            : ""
                      }
                    >
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell
                    className={row.changedFields.includes("Team") ? "text-yellow-600 dark:text-yellow-400" : ""}
                  >
                    {row.teamNumber != null
                      ? `Team ${row.teamNumber}`
                      : "Not assigned"}
                  </TableCell>
                  <TableCell
                    className={row.changedFields.includes("Full Name") ? "text-yellow-600 dark:text-yellow-400" : ""}
                  >
                    {row.fullName}
                  </TableCell>
                  <TableCell
                    className={row.changedFields.includes("CG") ? "text-yellow-600 dark:text-yellow-400" : ""}
                  >
                    {row.cgCode}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.nij}</TableCell>
                  <TableCell
                    className={row.changedFields.includes("Email") ? "text-yellow-600 dark:text-yellow-400" : ""}
                  >
                    {row.email}
                  </TableCell>
                  <TableCell
                    className={row.changedFields.includes("Role") ? "text-yellow-600 dark:text-yellow-400" : ""}
                  >
                    {row.roleName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && done && (
        <div className="rounded-lg border border-green-500/30 bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400">
          Import completed successfully.
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/my/users/members")}
        >
          Back
        </Button>
        <Button type="button" onClick={handleImport} disabled={!canSubmit}>
          {loading ? "Importing..." : "Import"}
        </Button>
      </div>
    </div>
  );
}
