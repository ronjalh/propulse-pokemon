import { Button } from "@/components/ui/button";
import { joinBattleAction } from "@/lib/battle/actions";
import type { Team } from "@/lib/db/schema";

export function JoinBattle({
  battleId,
  teams,
}: {
  battleId: string;
  teams: Team[];
}) {
  if (teams.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm">
        You don&rsquo;t have a complete 6-card team yet.{" "}
        <a href="/teams" className="underline">
          Build one first
        </a>
        .
      </div>
    );
  }
  return (
    <form action={joinBattleAction} className="rounded-lg border p-4 space-y-3">
      <input type="hidden" name="battleId" value={battleId} />
      <label className="block text-sm">
        Your team
        <select
          name="teamId"
          required
          className="mt-1 w-full rounded border bg-background p-2 text-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit">Accept challenge</Button>
    </form>
  );
}
