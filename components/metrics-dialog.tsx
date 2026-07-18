"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Metric } from "@/actions/master/metrics";

interface MetricsDialogProps {
  availableMetrics: Metric[];
  selectedMetrics: string[];
  onSave: (selected: string[]) => void;
  trigger: React.ReactElement;
}

export function MetricsDialog({
  availableMetrics,
  selectedMetrics,
  onSave,
  trigger,
}: MetricsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const handleOpen = () => {
    setSelected(new Set(selectedMetrics));
    setSearch("");
  };

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave([...selected]);
    setOpen(false);
  };

  const filtered = availableMetrics.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} onClick={handleOpen} />
      <DialogContent className="sm:max-w-md p-8">
        <DialogHeader>
          <DialogTitle>Select Metrics</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search metrics..."
            className="h-8"
          />

          <div className="max-h-[40vh] overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No metrics found.
              </p>
            )}
            {filtered.map((metric) => (
              <label
                key={metric.id}
                className="flex items-center gap-2.5 rounded-md border border-border/50 bg-card px-3 py-2 cursor-pointer hover:bg-accent/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(metric.name)}
                  onChange={() => toggle(metric.name)}
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="flex-1 text-sm truncate">{metric.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
