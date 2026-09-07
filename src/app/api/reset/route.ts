import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// Re-seed / initialize fresh data
export async function POST() {
  // Reset the global store to undefined so getStore re-seeds
  const globalStore = globalThis as unknown as { __contentOSStore?: unknown };
  globalStore.__contentOSStore = undefined;
  getStore(); // re-seeds
  return NextResponse.json({ ok: true });
}
