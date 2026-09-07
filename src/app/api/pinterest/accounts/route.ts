import { NextResponse } from "next/server";
import { getStore, genId } from "@/lib/store";

export async function GET() {
  const store = getStore();
  return NextResponse.json({ accounts: store.accounts });
}

export async function POST(req: Request) {
  const body = await req.json();
  const store = getStore();
  const account = {
    id: genId("acc"),
    name: body.name,
    pinsPerBatch: body.pinsPerBatch ?? 30,
    pinsCompleted: 0,
    doneThisCycle: false,
    selected: false,
    cycle: 1,
    lastWorkedDate: null,
    orderIndex: store.accounts.length,
  };
  store.accounts.push(account);
  return NextResponse.json(account);
}
