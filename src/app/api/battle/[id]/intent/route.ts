import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { submitIntent } from "@/lib/battle/session";

const intentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("move"),
    playerId: z.string(),
    moveIndex: z.number().int().min(0).max(3),
  }),
  z.object({
    kind: z.literal("switch"),
    playerId: z.string(),
    switchTo: z.number().int().min(0).max(5),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id: battleId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = intentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid intent", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await submitIntent(battleId, session.user.id, parsed.data);
  if (result.status === "rejected") {
    return NextResponse.json({ error: result.reason }, { status: 403 });
  }
  return NextResponse.json({ status: result.status });
}
