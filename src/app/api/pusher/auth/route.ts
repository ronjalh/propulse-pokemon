import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { battleChannelName } from "@/lib/realtime/events";
import { isBattleParticipant } from "@/lib/realtime/participants";
import "@/lib/realtime/register-participants";
import { authorizePrivateChannel } from "@/lib/realtime/server";

// Pusher sends `socket_id` + `channel_name` in an application/x-www-form-urlencoded body.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const socketId = form.get("socket_id");
  const channelName = form.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  if (!channelName.startsWith("private-battle-")) {
    return NextResponse.json({ error: "unsupported channel" }, { status: 400 });
  }
  const battleId = channelName.slice("private-battle-".length);
  const expectedName = battleChannelName(battleId);
  if (expectedName !== channelName) {
    return NextResponse.json({ error: "invalid channel name" }, { status: 400 });
  }

  const allowed = await isBattleParticipant(battleId, session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "not a participant" }, { status: 403 });
  }

  const authToken = authorizePrivateChannel(socketId, channelName);
  return NextResponse.json({ auth: authToken });
}
