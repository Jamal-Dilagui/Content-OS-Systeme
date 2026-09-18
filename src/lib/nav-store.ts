"use client";

import { create } from "zustand";

export type ViewId =
  | "command"
  | "today"
  | "pinterest"
  | "blog"
  | "products"
  | "facebook"
  | "calendar"
  | "tasks"
  | "progress"
  | "settings";

interface NavState {
  view: ViewId;
  setView: (v: ViewId) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useNav = create<NavState>((set) => ({
  view: "command",
  setView: (view) => set({ view, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
