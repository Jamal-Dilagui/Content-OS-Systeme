"use client";

import * as React from "react";
import { useNav, type ViewId } from "@/lib/nav-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard, CalendarDays, Image, FileText, Package,
  Facebook, CalendarRange, ListTodo, TrendingUp, Settings,
  Menu, Sparkles,
} from "lucide-react";

interface NavItem {
  id: ViewId;
  label: string;
  num: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { id: "command", label: "Command Center", num: "01", icon: LayoutDashboard },
  { id: "today", label: "Today", num: "02", icon: CalendarDays },
  { id: "pinterest", label: "Pinterest", num: "03", icon: Image },
  { id: "blog", label: "Blog", num: "04", icon: FileText },
  { id: "products", label: "PDF Patterns", num: "05", icon: Package },
  { id: "facebook", label: "Facebook", num: "06", icon: Facebook },
  { id: "calendar", label: "Calendar", num: "07", icon: CalendarRange },
  { id: "tasks", label: "Tasks", num: "08", icon: ListTodo },
  { id: "progress", label: "Progress", num: "09", icon: TrendingUp },
  { id: "settings", label: "Settings", num: "10", icon: Settings },
];

function NavList() {
  const { view, setView } = useNav();
  return (
    <nav className="flex flex-col gap-1 px-3 py-4 overflow-y-auto h-full">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="flex-1 truncate">{item.label}</span>
            <span className={cn("text-[10px] font-mono", active ? "text-primary-foreground/60" : "text-muted-foreground/50")}>
              {item.num}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useNav();
  return (
    <>
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-sidebar/50 backdrop-blur-sm sticky top-0 h-screen">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold">Content OS</span>
            <span className="text-[10px] text-muted-foreground">Process Tracker</span>
          </div>
        </div>
        <NavList />
        <div className="border-t px-5 py-3 text-[10px] text-muted-foreground/70">
          Simple. Clear. Focused.
        </div>
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-5 py-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Content OS
            </SheetTitle>
          </SheetHeader>
          <NavList />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function MobileNavTrigger() {
  const { setSidebarOpen } = useNav();
  return (
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
      <Menu className="h-5 w-5" />
    </Button>
  );
}
