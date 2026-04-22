import "server-only";

import { isBattleParticipant } from "@/lib/battle/session";
import { registerParticipantChecker } from "./participants";

// One-shot side-effect: wire the battle-session participant lookup into the
// realtime-transport's pluggable checker. Imported once from the Pusher auth
// route so we don't pay the import cost unless someone subscribes.
registerParticipantChecker(isBattleParticipant);
