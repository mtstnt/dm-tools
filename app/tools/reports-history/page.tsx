"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  fetchReports,
  reportKeys,
  type Report,
} from "@/lib/queries/reports";

const typeLabels: Record<string, string> = {
  AOG_YOUTH: "AOG Youth",
  AOG_TEEN: "AOG Teen",
  EVENT: "Event",
};

const divisionKeys = [
  "Baptisan",
  "Companion",
  "Crowd",
  "DM",
  "GA",
  "Greeter",
  "Hospi",
  "Lighting",
  "MM",
  "MUA",
  "PAW",
  "Photography",
  "Prayer",
  "SM",
  "Sound",
  "Stylish",
  "Usher",
  "WHL",
];

export default function ReportsHistoryPage() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const {
    data: reports,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: reportKeys.all,
    queryFn: fetchReports,
  });

  return (
    <div className="flex flex-col gap-8 animate-stagger">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground leading-[1.1]">
            Reports History
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Browse all saved service reports.
          </p>
        </div>
        {isFetching && !isLoading && (
          <RefreshCw className="size-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="size-8 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Failed to load reports
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3.5 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !reports || reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No reports found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Volunteers</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  Jemaat
                </TableHead>
                <TableHead className="text-right hidden md:table-cell">
                  TC
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report: Report) => (
                <TableRow
                  key={report.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {report.title || "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">
                      {typeLabels[report.type || ""] || report.type || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>{report.date || "-"}</TableCell>
                  <TableCell className="text-right">
                    {report.totalVolunteer ?? "-"}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {report.jemaat || "-"}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    {report.tc || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Sheet
        open={!!selectedReport}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          {selectedReport && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedReport.title || "Untitled"}</SheetTitle>
                <SheetDescription>
                  {selectedReport.date}
                  {selectedReport.lastUpdated &&
                    ` · Updated ${selectedReport.lastUpdated}`}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-6 px-4 pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label="Type"
                    value={
                      typeLabels[selectedReport.type || ""] ||
                      selectedReport.type
                    }
                  />
                  <InfoItem label="Date" value={selectedReport.date} />
                  <InfoItem
                    label="Pastor / Speaker"
                    value={selectedReport.pastorSpeaker}
                  />
                  <InfoItem label="Guest" value={selectedReport.guest} />
                  <InfoItem
                    label="Event Name"
                    value={selectedReport.eventName}
                  />
                  <InfoItem
                    label="Total Volunteers"
                    value={selectedReport.totalVolunteer?.toString()}
                  />
                  <InfoItem label="Jemaat" value={selectedReport.jemaat} />
                  <InfoItem label="TC" value={selectedReport.tc} />
                  <InfoItem
                    label="Altar Call"
                    value={selectedReport.altarcallText}
                  />
                  <InfoItem
                    label="Altar Call #"
                    value={selectedReport.altarcallNumber}
                  />
                  <InfoItem
                    label="Baptisan"
                    value={selectedReport.baptisan}
                  />
                  <InfoItem label="WHL" value={selectedReport.whl} />
                  <InfoItem
                    label="Join CG"
                    value={selectedReport.bersediaJoinCg}
                  />
                  <InfoItem
                    label="Prayer Station"
                    value={selectedReport.prayerStation}
                  />
                  <InfoItem
                    label="One Minute Prayer"
                    value={selectedReport.oneMinutePrayer}
                  />
                </div>

                {selectedReport.divisions && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-medium tracking-[0.08em] uppercase text-muted-foreground/60 mb-3">
                        Divisions
                      </h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {divisionKeys.map((key) => {
                          const value = selectedReport.divisions?.[key];
                          if (value === undefined) return null;
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-muted-foreground">
                                {key}
                              </span>
                              <span className="text-sm font-medium">
                                {value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {selectedReport.reportText && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-medium tracking-[0.08em] uppercase text-muted-foreground/60 mb-3">
                        Report Text
                      </h3>
                      <pre className="bg-muted/50 rounded-lg p-4 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                        {selectedReport.reportText}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.06em] uppercase text-muted-foreground/60">
        {label}
      </p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}
