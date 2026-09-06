"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader, SectionHeader, InfoLine } from "@/components/biz/layout";
import { Database, RefreshCw, Trash2, Image, FileText, Package, Facebook, Layers } from "lucide-react";

export function SettingsView() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const reseed = async () => {
    toast({ title: "Reseeding database...", description: "This will reset all demo data." });
    try {
      const res = await fetch("/api/settings/reseed", { method: "POST" });
      if (res.ok) {
        toast({ title: "Database reseeded", description: "Demo data restored." });
        qc.invalidateQueries();
      } else {
        toast({ title: "Reseed failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Reseed failed", variant: "destructive" });
    }
  };

  const wipe = async () => {
    if (!confirm("Wipe ALL data? This cannot be undone.")) return;
    const res = await fetch("/api/settings/wipe", { method: "POST" });
    if (res.ok) {
      toast({ title: "All data wiped", description: "Start fresh." });
      qc.invalidateQueries();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Database className="h-5 w-5" />}
        title="Settings"
        description="Manage your data and system preferences."
      />

      <Card className="p-5 gap-3">
        <SectionHeader title="System" description="About this tool" icon={<Layers className="h-4 w-4" />} />
        <div className="grid sm:grid-cols-2 gap-3">
          <InfoLine label="System" value="Content OS" />
          <InfoLine label="Mode" value="Solo content creator" />
          <InfoLine label="Channels" value="Pinterest · Blog · PDF Patterns · Facebook" />
          <InfoLine label="Data" value="Stored locally (SQLite)" />
        </div>
      </Card>

      <Card className="p-5 gap-3">
        <SectionHeader title="Channel States" description="The process each channel tracks" icon={<Image className="h-4 w-4" />} />
        <div className="grid sm:grid-cols-2 gap-3">
          <StateRow icon={<Image className="h-3.5 w-3.5" />} label="Pinterest Pins" states="IDEA → BRIEF → DESIGN → READY → SCHEDULED → PUBLISHED" />
          <StateRow icon={<FileText className="h-3.5 w-3.5" />} label="Blog Articles" states="IDEA → KEYWORD → BRIEF → OUTLINE → WRITING → SEO → REVIEW → READY → PUBLISHED → PROMOTED" />
          <StateRow icon={<Package className="h-3.5 w-3.5" />} label="PDF Patterns" states="IDEA → VALIDATION → CREATION → DESIGN → PDF → LISTING → SEO → PUBLISH → LIVE → OPTIMIZATION" />
          <StateRow icon={<Facebook className="h-3.5 w-3.5" />} label="Facebook Posts" states="IDEA → SCHEDULED → PUBLISHED" />
        </div>
      </Card>

      <Card className="p-5 gap-3">
        <SectionHeader title="Data Management" description="Reset or clear your data" icon={<Database className="h-4 w-4" />} />
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Reseed demo data</p>
              <p className="text-xs text-muted-foreground">Reset all data back to the sample demo content</p>
            </div>
            <Button variant="outline" onClick={reseed}><RefreshCw className="h-4 w-4" /> Reseed</Button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 dark:border-rose-500/30 p-3">
            <div>
              <p className="text-sm font-medium text-rose-600">Wipe all data</p>
              <p className="text-xs text-muted-foreground">Delete everything and start from zero</p>
            </div>
            <Button variant="outline" className="text-rose-600 border-rose-200" onClick={wipe}><Trash2 className="h-4 w-4" /> Wipe</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StateRow({ icon, label, states }: { icon: React.ReactNode; label: string; states: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{states}</p>
    </div>
  );
}
