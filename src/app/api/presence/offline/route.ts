import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body as { userId: string };
    if (!userId) return NextResponse.json({ ok: false }, { status: 400 });
    await db.update(schema.users).set({ isOnline: false, lastSeen: null }).where(eq(schema.users.id, userId));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
