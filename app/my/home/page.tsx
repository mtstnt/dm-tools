"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDashboardFilterOptions,
  getSeatCounterData,
  type SeatCounterDataPoint,
  type DashboardFilterOption,
} from "@/actions/dashboard";
import { dashboardKeys } from "@/lib/queries/dashboard";

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return format(date, "MMM yyyy");
}

export default function DashboardPage() {
  const [filterOptions, setFilterOptions] = useState<{
    regions: DashboardFilterOption[];
    eventTypes: DashboardFilterOption[];
  } | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [selectedRegions, setSelectedRegions] = useState<MultiSelectOption[]>(
    [],
  );
  const [selectedEventTypes, setSelectedEventTypes] = useState<
    MultiSelectOption[]
  >([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [queryEnabled, setQueryEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      const result = await getDashboardFilterOptions();

      if (!mounted) return;

      if (!result.success || !result.data) {
        setOptionsError(result.error ?? "Failed to load filter options");
        setOptionsLoading(false);
        return;
      }

      setFilterOptions(result.data);

      const defaultRegions = result.data.regions
        .filter((r) => r.name === "GMS Surabaya Selatan")
        .map((r) => ({ label: r.name, value: String(r.id) }));

      const defaultEventTypes = result.data.eventTypes
        .filter((et) => et.name === "AOG TEEN" || et.name === "AOG YOUTH")
        .map((et) => ({ label: et.name, value: String(et.id) }));

      setSelectedRegions(defaultRegions);
      setSelectedEventTypes(defaultEventTypes);
      setOptionsLoading(false);
    }

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const regionIds = useMemo(
    () => selectedRegions.map((r) => Number(r.value)),
    [selectedRegions],
  );

  const eventTypeIds = useMemo(
    () => selectedEventTypes.map((et) => Number(et.value)),
    [selectedEventTypes],
  );

  const {
    data: chartData,
    isLoading: chartLoading,
    isError: chartError,
    error: chartErrorMessage,
  } = useQuery({
    queryKey: dashboardKeys.seatCounter({ regionIds, eventTypeIds }),
    queryFn: () => getSeatCounterData({ regionIds, eventTypeIds }).then((res) => {
      if (!res.success) throw new Error(res.error ?? "Failed to load data");
      return res.data as SeatCounterDataPoint[];
    }),
    enabled: queryEnabled,
  });

  const handleLoadData = useCallback(() => {
    setHasLoaded(true);
    setQueryEnabled(true);
  }, []);

  useEffect(() => {
    if (hasLoaded) {
      setQueryEnabled(true);
    }
  }, [regionIds, eventTypeIds, hasLoaded]);

  const regionOptions: MultiSelectOption[] = useMemo(
    () =>
      (filterOptions?.regions ?? []).map((r) => ({
        label: r.name,
        value: String(r.id),
      })),
    [filterOptions],
  );

  const eventTypeOptions: MultiSelectOption[] = useMemo(
    () =>
      (filterOptions?.eventTypes ?? []).map((et) => ({
        label: et.name,
        value: String(et.id),
      })),
    [filterOptions],
  );

  const canLoad =
    selectedRegions.length > 0 && selectedEventTypes.length > 0 && !optionsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          View congregation attendance trends across events.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Seat Counter Trend</CardTitle>
          <CardDescription>
            Monthly{" "}
            {"Seat Counter"} aggregation across selected event types and
            locations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {optionsLoading ? (
            <FiltersSkeleton />
          ) : optionsError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {optionsError}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-1 w-full sm:w-auto space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Event Types
                </label>
                <MultiSelect
                  options={eventTypeOptions}
                  value={selectedEventTypes}
                  onChange={setSelectedEventTypes}
                  placeholder="Select event types..."
                />
              </div>
              <div className="flex-1 w-full sm:w-auto space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Locations
                </label>
                <MultiSelect
                  options={regionOptions}
                  value={selectedRegions}
                  onChange={setSelectedRegions}
                  placeholder="Select locations..."
                />
              </div>
              <Button
                onClick={handleLoadData}
                disabled={!canLoad || chartLoading}
                className="shrink-0"
              >
                {chartLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load Data"
                )}
              </Button>
            </div>
          )}

          {!hasLoaded && !optionsLoading && !optionsError ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-12">
              <p className="text-sm text-muted-foreground">
                Select filters and click &ldquo;Load Data&rdquo; to view the
                chart.
              </p>
            </div>
          ) : chartLoading ? (
            <ChartSkeleton />
          ) : chartError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {chartErrorMessage instanceof Error
                ? chartErrorMessage.message
                : "Failed to load chart data."}
            </div>
          ) : chartData && chartData.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthLabel}
                    className="text-xs"
                    tick={{ fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    className="text-xs"
                    tick={{ fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.875rem",
                    }}
                    labelStyle={{ color: "var(--muted-foreground)" }}
                    formatter={(value) => [
                      Number(value).toLocaleString(),
                      "Seat Counter",
                    ]}
                    labelFormatter={(label) =>
                      formatMonthLabel(String(label))
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ fill: "var(--chart-1)", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-12">
              <p className="text-sm text-muted-foreground">
                No seat counter data found for the selected filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
      <Skeleton className="h-[44px] w-full sm:flex-1 rounded-md" />
      <Skeleton className="h-[44px] w-full sm:flex-1 rounded-md" />
      <Skeleton className="h-9 w-24 rounded-md shrink-0" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-[350px] w-full rounded-lg" />
    </div>
  );
}
