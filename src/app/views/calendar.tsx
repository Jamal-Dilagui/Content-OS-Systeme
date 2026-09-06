"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/biz/layout";
import { statusBadgeClass } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, Plus, ChevronLeft, ChevronRight, Trash2, Image, FileText, Package, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";

type Event = { id: string; title: string; type: string; date: string; status: string; notes: string | null };
const TYPES = ["PIN", "ARTICLE", "PRODUCT", "POST"];
const TYPE_ICON: Record<string, React.ReactNode> = {
  PIN: <Image className="h-3 w-3" />,
  ARTICLE: <FileText className="h-3 w-3" />,
  PRODUCT: <Package className="h-3 w-3" />,
  POST: <Facebook className="h-3 w-3" />,
};

export function CalendarView() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cursor, setCursor] = React.useState(() => new Date());
  const [addOpen, setAddOpen] = React.useState(false);
  const [addDate, setAddDate] = React.useState<string>("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const { data, isLoading } = useQuery<{ events: Event[] }>({
    queryKey: ["calendar", year, month],
    queryFn: async () => {
      const from = monthStart.toISOString();
      const to = monthEnd.toISOString();
      const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) => fetch(`/api/calendar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast({ title: "Event added" }); setAddOpen(false); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => fetch(`/api/calendar?id=${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calendar"] }); toast({ title: "Event removed" }); },
  });

  const events = data?.events ?? [];
  const eventsByDay = React.useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const e of events) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (map[key] ??= []).push(e);
    }
    return map;
  }, [events]);

  // Build calendar grid
  const firstDayOfWeek = monthStart.getDay(); // 0 = Sun
  const daysInMonth = monthEnd.getDate();
  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, key: `pad-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: `${year}-${month}-${d}` });
  }

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<CalendarRange className="h-5 w-5" />}
        title="Calendar"
        description="Plan your content production across the month."
        actions={<Button onClick={() => { setAddDate(new Date().toISOString().slice(0, 10)); setAddOpen(true); }}><Plus className="h-4 w-4" /> Add Event</Button>}
      />

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <h2 className="text-lg font-bold">{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <Card className="p-3 gap-2">
        {isLoading ? <Skeleton className="h-96" /> : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-[10px] font-bold uppercase text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => (
                <div
                  key={cell.key}
                  className={cn(
                    "min-h-[80px] rounded-md border p-1 text-left flex flex-col gap-0.5",
                    cell.day === null ? "bg-muted/20 border-transparent" : "bg-card hover:bg-accent/30",
                    cell.day !== null && isToday(cell.day) && "border-primary border-2"
                  )}
                >
                  {cell.day !== null && (
                    <>
                      <span className={cn("text-[10px] font-bold", isToday(cell.day) ? "text-primary" : "text-muted-foreground")}>{cell.day}</span>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {(eventsByDay[cell.key] ?? []).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => remove.mutate(e.id)}
                            className="group flex items-center gap-1 rounded bg-muted/60 px-1 py-0.5 text-left hover:bg-rose-100 dark:hover:bg-rose-500/20"
                            title={`${e.title} — click to delete`}
                          >
                            <span className="text-muted-foreground shrink-0">{TYPE_ICON[e.type] ?? <CalendarRange className="h-3 w-3" />}</span>
                            <span className="text-[9px] font-medium truncate flex-1">{e.title}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><Image className="h-3 w-3" /> Pin</span>
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Article</span>
        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> Product</span>
        <span className="flex items-center gap-1"><Facebook className="h-3 w-3" /> Post</span>
        <span className="ml-auto">Click an event to delete it</span>
      </div>

      <AddEventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultDate={addDate}
        onSubmit={(b) => create.mutate(b)}
      />
    </div>
  );
}

function AddEventDialog({ open, onOpenChange, defaultDate, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; defaultDate: string; onSubmit: (b: Record<string, unknown>) => void }) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("PIN");
  const [date, setDate] = React.useState(defaultDate);

  React.useEffect(() => {
    if (open) { setTitle(""); setType("PIN"); setDate(defaultDate); }
  }, [open, defaultDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's planned?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!title || !date} onClick={() => onSubmit({ title, type, date })}>Add Event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
