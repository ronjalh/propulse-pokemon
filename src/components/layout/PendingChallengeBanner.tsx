import Image from "next/image";
import Link from "next/link";
import { Swords, X } from "lucide-react";

import { declineChallengeAction } from "@/lib/battle/actions";
import { pendingChallengesFor } from "@/lib/battle/challenges";

export async function PendingChallengeBanner({ userId }: { userId: string }) {
  const challenges = await pendingChallengesFor(userId);
  if (challenges.length === 0) return null;

  return (
    <div className="w-full max-w-2xl space-y-2">
      {challenges.map((c) => {
        const challengerLabel = c.challengerName ?? c.challengerEmail ?? "Someone";
        return (
          <div
            key={c.battleId}
            className="rounded-xl border-2 border-rose-500/60 bg-rose-500/10 p-4 flex items-center gap-3 shadow-md animate-pulse-slow"
          >
            {c.challengerImage ? (
              <Image
                src={c.challengerImage}
                alt={challengerLabel}
                width={48}
                height={48}
                className="rounded-full ring-2 ring-rose-400 shrink-0"
                unoptimized
              />
            ) : (
              <div className="size-12 rounded-full bg-rose-500/30 ring-2 ring-rose-400 flex items-center justify-center font-bold shrink-0">
                {challengerLabel[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Swords className="size-4 text-rose-500" />
                <span className="font-bold">{challengerLabel}</span>
                <span className="text-muted-foreground">wants to battle!</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{c.is1v1 ? "1v1" : "6v6"}</span>
                {c.challengerCardName && (
                  <span>· leading with {c.challengerCardName}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/battle/${c.battleId}`}
                className="px-4 py-2 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shadow"
              >
                Accept
              </Link>
              <form action={declineChallengeAction}>
                <input type="hidden" name="battleId" value={c.battleId} />
                <button
                  type="submit"
                  aria-label="Decline challenge"
                  title="Decline this challenge"
                  className="p-2 rounded-lg border border-muted-foreground/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
