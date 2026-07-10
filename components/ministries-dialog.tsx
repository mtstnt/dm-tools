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
import { Pencil, Trash2, Plus } from "lucide-react";

interface MinistriesDialogProps {
  ministries: string[];
  onSave: (ministries: string[]) => void;
  trigger: React.ReactElement;
}

function sortMinistries(ministries: string[]) {
  return [...ministries].sort((a, b) =>
    a.localeCompare(b, "id", { sensitivity: "base" }),
  );
}

export function MinistriesDialog({
  ministries,
  onSave,
  trigger,
}: MinistriesDialogProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleOpen = () => {
    setItems(sortMinistries(ministries));
    setNewItem("");
    setEditIndex(null);
    setEditValue("");
  };

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) return;
    setItems((prev) => sortMinistries([...prev, trimmed]));
    setNewItem("");
  };

  const handleDelete = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editIndex === index) {
      setEditIndex(null);
      setEditValue("");
    }
  };

  const handleStartEdit = (index: number) => {
    setEditIndex(index);
    setEditValue(items[index]);
  };

  const handleConfirmEdit = () => {
    if (editIndex === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (items.includes(trimmed) && items[editIndex] !== trimmed) return;
    setItems((prev) => {
      const next = [...prev];
      next[editIndex] = trimmed;
      return sortMinistries(next);
    });
    setEditIndex(null);
    setEditValue("");
  };

  const handleSave = () => {
    onSave(sortMinistries(items));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} onClick={handleOpen} />
      <DialogContent className="sm:max-w-md p-8">
        <DialogHeader>
          <DialogTitle>Edit Ministries</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="max-h-[40vh] overflow-y-auto space-y-1">
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No ministries. Add one below.
              </p>
            )}
            {items.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex items-center gap-1.5 rounded-md border border-border/50 bg-card px-2 py-1.5"
              >
                {editIndex === index ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 flex-1 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmEdit();
                      if (e.key === "Escape") {
                        setEditIndex(null);
                        setEditValue("");
                      }
                    }}
                    onBlur={handleConfirmEdit}
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">{item}</span>
                )}

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    editIndex === index ? handleConfirmEdit() : handleStartEdit(index)
                  }
                  className="size-7 text-muted-foreground"
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(index)}
                  className="size-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="New ministry name"
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="shrink-0 h-8 px-2"
            >
              <Plus className="size-3.5" />
            </Button>
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
