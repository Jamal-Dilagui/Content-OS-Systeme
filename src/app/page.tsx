"use client";

import * as React from "react";
import { useNav } from "@/lib/nav-store";
import { Sidebar, MobileNavTrigger } from "@/components/biz/sidebar";
import { CommandCenterView } from "@/app/views/command-center";
import { TodayView } from "@/app/views/today";
import { PinterestView } from "@/app/views/pinterest";
import { BlogView } from "@/app/views/blog";
import { ProductsView } from "@/app/views/products";
import { FacebookView } from "@/app/views/facebook";
import { CalendarView } from "@/app/views/calendar";
import { TasksView } from "@/app/views/tasks";
import { ProgressView } from "@/app/views/progress";
import { SettingsView } from "@/app/views/settings";
import { Sparkles } from "lucide-react";

const VIEWS = {
  command: CommandCenterView,
  today: TodayView,
  pinterest: PinterestView,
  blog: BlogView,
  products: ProductsView,
  facebook: FacebookView,
  calendar: CalendarView,
  tasks: TasksView,
  progress: ProgressView,
  settings: SettingsView,
} as const;

export default function Home() {
  const { view } = useNav();
  const ViewComponent = VIEWS[view] ?? CommandCenterView;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <MobileNavTrigger />
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold">Content OS</span>
            </div>
            <div className="hidden lg:block text-sm text-muted-foreground">
              Content Operating System — process tracker for Pinterest, Blog, PDF Patterns & Facebook
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Live</span>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">
              <ViewComponent />
            </div>
          </main>

          <footer className="mt-auto border-t bg-muted/30 px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                <span>Content OS — built for solo content creators</span>
              </div>
              <div>Keep it simple. Ship every day.</div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
