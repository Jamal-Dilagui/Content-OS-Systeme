"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, SectionHeader, StatusBadge, EmptyState } from "@/components/biz/layout";
import { formatNumber, formatRelative, statusBadgeClass } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  Image as ImageIcon, Plus, MoreVertical, Play, Pause, SkipForward,
  ChevronRight, Trash2, ArrowRight, Layers, RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// The clean process states
const PIN_FLOW = ["IDEA", "BRIEF", "DESIGN", "READY", "SCHEDULED", "PUBLISHED"];
const PIN_EXTRA = ["FAILED", "REVISE"];

type Account = {
  id: string; name: string; status: string; priority: number; orderIndex: number;
  currentCycle: number; pinsPerBatch: number; pinsCompleted: number; pinsPublished: number;
  lastWorkedDate: string | null; nextWorkDate: string | null;
  niche?: { name: string } | null; website?: { name: string } | null;
};
type Pin = {
  id: string; title: string; status: string; accountId: string;
  account?: { name: string }; board?: { name: string } | null;
  scheduledDate: string | null; publishedDate: string | null;
  imageUrl: string | null;
};
type Stats = {
  accountOfDay: Account | null;
  nextAccount: Account | null;
  accounts: Account[];
  pins: Pin[];
  pinsCreated: number; pinsPublished: number; pinsScheduled: number; readyPins: number;
  totalImpressions: number; totalSaves: number; totalOutboundClicks: number; avgCtr: number;
  bestPin: Pin | null; bestAccount: { name: string } | null;
  niches: { id: string; name: string }[];
  websites: { id: string; name: string }[];
};

export function PinterestView() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["pinterest"],
    queryFn: async () => {
      const res = await fetch("/api/pinterest/stats");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [addOpen, setAddOpen] = React.useState(false);
  const [filterAccount, setFilterAccount] = React.useState<string>("all");

  const advance = useMutation({
    mutationFn: async (id: string) => fetch(`/api/pinterest/accounts/${id}/advance`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pinterest"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast({ title: "Advanced to next account" }); },
  });
  const updateAccount = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      fetch(`/api/pinterest/accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pinterest"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
  const deleteAccount = useMutation({
    mutationFn: async (id: string) => fetch(`/api/pinterest/accounts/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pinterest"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast({ title: "Account removed" }); },
  });
  const updatePin = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      fetch(`/api/pinterest/pins/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pinterest"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
  const deletePin = useMutation({
    mutationFn: async (id: string) => fetch(`/api/pinterest/pins/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pinterest"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast({ title: "Pin removed" }); },
  });
  const createPin = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      fetch(`/api/pinterest/pins`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pinterest"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast({ title: "Pin added" }); setAddOpen(false); },
  });

  const pins = data?.pins ?? [];
  const filteredPins = filterAccount === "all" ? pins : pins.filter((p) => p.accountId === filterAccount);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<ImageIcon className="h-5 w-5" />}
        title="Pinterest"
        description="Process tracker for your accounts. Move pins through clear states: Idea → Brief → Design → Ready → Scheduled → Published."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Pin
          </Button>
        }
      />

      {/* ACCOUNT OF THE DAY */}
      <Card className="p-5 gap-3 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account of the Day</span>
        </div>
        {isLoading ? <Skeleton className="h-20" /> : data?.accountOfDay ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">{data.accountOfDay.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Cycle #{data.accountOfDay.currentCycle}
                {data.accountOfDay.niche && ` · ${data.accountOfDay.niche.name}`}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:w-64">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Today's batch</span>
                <span className="font-bold">{data.accountOfDay.pinsCompleted} / {data.accountOfDay.pinsPerBatch}</span>
              </div>
              <Progress value={(data.accountOfDay.pinsCompleted / data.accountOfDay.pinsPerBatch) * 100} className="h-2.5" />
              <Button size="sm" className="mt-1" onClick={() => advance.mutate(data.accountOfDay.id)} disabled={advance.isPending}>
                <RotateCw className="h-3.5 w-3.5" /> Mark Done & Advance
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState title="No active account" description="Activate an account below to set the account of the day." />
        )}
      </Card>

      {/* ACCOUNT ROTATION */}
      <Card className="p-4 gap-3">
        <SectionHeader title="Account Rotation" description={`${data?.accounts.length ?? 0} accounts — order = work order`} icon={<Layers className="h-4 w-4" />} />
        {isLoading ? <Skeleton className="h-32" /> : (
          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {data?.accounts.map((a, i) => (
              <div key={a.id} className={cn("flex items-center gap-3 rounded-lg border p-2.5", a.status !== "ACTIVE" && "opacity-60")}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.pinsCompleted}/{a.pinsPerBatch} pins · cycle {a.currentCycle}
                    {a.lastWorkedDate && ` · last ${formatRelative(a.lastWorkedDate)}`}
                  </p>
                </div>
                <StatusBadge status={a.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {a.status === "ACTIVE" ? (
                      <DropdownMenuItem onSelect={() => updateAccount.mutate({ id: a.id, patch: { status: "PAUSED" } })}><Pause className="h-3.5 w-3.5" /> Pause</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => updateAccount.mutate({ id: a.id, patch: { status: "ACTIVE" } })}><Play className="h-3.5 w-3.5" /> Resume</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => updateAccount.mutate({ id: a.id, patch: { status: "SKIPPED" } })}><SkipForward className="h-3.5 w-3.5" /> Skip this cycle</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => updateAccount.mutate({ id: a.id, patch: { pinsCompleted: 0 } })}><RotateCw className="h-3.5 w-3.5" /> Reset batch</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => deleteAccount.mutate(a.id)} className="text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* PIN PROCESS TRACKER — the core board */}
      <Card className="p-4 gap-3">
        <SectionHeader
          title="Pin Process Tracker"
          description="Move pins forward through each state"
          icon={<Layers className="h-4 w-4" />}
          actions={
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {data?.accounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
              </SelectContent>
            </Select>
          }
        />
        {isLoading ? <Skeleton className="h-64" /> : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {PIN_FLOW.map((state) => {
              const statePins = filteredPins.filter((p) => p.status === state);
              return (
                <div key={state} className="flex w-60 shrink-0 flex-col gap-2 rounded-lg bg-muted/40 p-2">
                  <div className="flex items-center justify-between px-1">
                    <Badge variant="outline" className={cn("font-medium", statusBadgeClass(state))}>{state}</Badge>
                    <span className="text-xs font-bold text-muted-foreground">{statePins.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 min-h-[60px]">
                    {statePins.map((p) => (
                      <PinCard
                        key={p.id}
                        pin={p}
                        onNext={PIN_FLOW.indexOf(state) < PIN_FLOW.length - 1 ? () => updatePin.mutate({ id: p.id, patch: { status: PIN_FLOW[PIN_FLOW.indexOf(state) + 1] } }) : undefined}
                        onFail={() => updatePin.mutate({ id: p.id, patch: { status: "FAILED" } })}
                        onRevise={() => updatePin.mutate({ id: p.id, patch: { status: "REVISE" } })}
                        onReidea={() => updatePin.mutate({ id: p.id, patch: { status: "IDEA" } })}
                        onDelete={() => deletePin.mutate(p.id)}
                      />
                    ))}
                    {statePins.length === 0 && <p className="text-[10px] text-muted-foreground/60 text-center py-2">empty</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Failed / Revise row */}
        {filteredPins.some((p) => PIN_EXTRA.includes(p.status)) && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {PIN_EXTRA.map((state) => {
              const statePins = filteredPins.filter((p) => p.status === state);
              if (statePins.length === 0) return null;
              return (
                <div key={state} className="rounded-lg border border-dashed p-2">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <Badge variant="outline" className={cn("font-medium", statusBadgeClass(state))}>{state}</Badge>
                    <span className="text-xs font-bold text-muted-foreground">{statePins.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {statePins.map((p) => (
                      <PinCard
                        key={p.id}
                        pin={p}
                        onReidea={() => updatePin.mutate({ id: p.id, patch: { status: "IDEA" } })}
                        onDelete={() => deletePin.mutate(p.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ADD PIN DIALOG */}
      <AddPinDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        accounts={data?.accounts ?? []}
        onSubmit={(body) => createPin.mutate(body)}
      />
    </div>
  );
}

function PinCard({
  pin, onNext, onFail, onRevise, onReidea, onDelete,
}: {
  pin: Pin;
  onNext?: () => void;
  onFail?: () => void;
  onRevise?: () => void;
  onReidea?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-md border bg-card p-2 text-left shadow-sm">
      <p className="text-xs font-medium leading-snug line-clamp-2">{pin.title}</p>
      {pin.account && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{pin.account.name}</p>}
      <div className="flex items-center gap-1 mt-1.5">
        {onNext && (
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onNext}>
            Next <ChevronRight className="h-3 w-3" />
          </Button>
        )}
        {(onFail || onRevise || onReidea || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><MoreVertical className="h-3 w-3" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onReidea && <DropdownMenuItem onSelect={onReidea}>Back to Idea</DropdownMenuItem>}
              {onRevise && <DropdownMenuItem onSelect={onRevise}>Mark Revise</DropdownMenuItem>}
              {onFail && <DropdownMenuItem onSelect={onFail} className="text-rose-600">Mark Failed</DropdownMenuItem>}
              {onDelete && <DropdownMenuItem onSelect={onDelete} className="text-rose-600"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function AddPinDialog({
  open, onOpenChange, accounts, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [status, setStatus] = React.useState("IDEA");

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setAccountId(accounts[0]?.id ?? "");
      setStatus("IDEA");
    }
  }, [open, accounts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pin</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pin-title" className="text-xs">Title</Label>
            <Input id="pin-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pin title..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Start state</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIN_FLOW.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!title || !accountId} onClick={() => onSubmit({ title, accountId, status })}>
            Add Pin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
