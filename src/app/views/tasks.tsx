"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, SectionHeader, EmptyState, PriorityBadge } from "@/components/biz/layout";
import { formatRelative, statusBadgeClass } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { ListTodo, Plus, CheckCircle2, Circle, Trash2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string; title: string; description: string | null; status: string;
  priority: string; category: string | null; dueDate: string | null; createdAt: string;
};

const CATEGORIES = ["PINTEREST", "BLOG", "PRODUCT", "FACEBOOK", "ADMIN", "OTHER"];
const PRIORITIES = ["P0", "P1", "P2", "P3"];

export function TasksView() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [addOpen, setAddOpen] = React.useState(false);

  const { data, isLoading } = useQuery<{ tasks: Task[] }>({
    queryKey: ["tasks", statusFilter],
    queryFn: async () => {
      const q = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/tasks${q}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const toggle = useMutation({
    mutationFn: async (id: string) => fetch(`/api/tasks/${id}/toggle`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => fetch(`/api/tasks/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast({ title: "Task deleted" }); },
  });
  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) => fetch(`/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast({ title: "Task added" }); setAddOpen(false); },
  });

  const tasks = data?.tasks ?? [];
  const counts = {
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
    overdue: tasks.filter((t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < new Date()).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<ListTodo className="h-5 w-5" />}
        title="Tasks"
        description="A simple, focused task list. Every task has a priority and a clear status."
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Task</Button>}
      />

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryPill label="To Do" value={counts.todo} color="zinc" />
        <SummaryPill label="In Progress" value={counts.inProgress} color="sky" />
        <SummaryPill label="Done" value={counts.done} color="emerald" />
        <SummaryPill label="Overdue" value={counts.overdue} color="rose" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      <Card className="p-4 gap-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="No tasks here" description="Add a task to get started." />
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto">
            {tasks.map((t) => {
              const done = t.status === "DONE";
              const overdue = !done && t.dueDate && new Date(t.dueDate) < new Date();
              return (
                <div key={t.id} className={cn("flex items-center gap-3 rounded-lg border p-3 transition-colors", done && "opacity-60")}>
                  <button onClick={() => toggle.mutate(t.id)} className="shrink-0">
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", done && "line-through")}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <PriorityBadge priority={t.priority} />
                      {t.category && <span className="text-[10px] text-muted-foreground uppercase">{t.category}</span>}
                      {t.dueDate && (
                        <span className={cn("text-[10px]", overdue ? "text-rose-600 font-medium" : "text-muted-foreground")}>
                          {formatRelative(t.dueDate)}
                        </span>
                      )}
                      {t.status === "IN_PROGRESS" && <Badge variant="outline" className="text-sky-600 border-sky-200 text-[10px]">In Progress</Badge>}
                      {t.status === "BLOCKED" && <Badge variant="outline" className="text-rose-600 border-rose-200 text-[10px]">Blocked</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600" onClick={() => remove.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AddTaskDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={(b) => create.mutate(b)} />
    </div>
  );
}

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  const map: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
    sky: "text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30",
    rose: "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
    zinc: "text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30",
  };
  return (
    <div className={cn("rounded-lg border p-3", map[color])}>
      <p className="text-xs font-medium uppercase">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function AddTaskDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState("P2");
  const [category, setCategory] = React.useState("PINTEREST");
  const [dueDate, setDueDate] = React.useState("");

  React.useEffect(() => {
    if (open) { setTitle(""); setPriority("P2"); setCategory("PINTEREST"); setDueDate(""); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Due date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!title} onClick={() => onSubmit({ title, priority, category, dueDate: dueDate || undefined })}>Add Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
