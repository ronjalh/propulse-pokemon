import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { PACKS, type PackType } from "@/lib/packs/types";
import { openPackAction } from "@/lib/packs/actions";

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function PacksPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const { error } = await searchParams;

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <div className="text-sm">
          Credits:{" "}
          <span className="font-bold tabular-nums">{session.user.credits}</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Open a pack</h1>

      {error === "insufficient" && (
        <p className="text-sm text-red-500">
          Not enough credits for that pack.
        </p>
      )}

      <div className="grid gap-4">
        {(Object.values(PACKS) as Array<(typeof PACKS)[PackType]>).map((p) => {
          const canAfford = session.user.credits >= p.costCredits;
          return (
            <form
              key={p.type}
              action={openPackAction}
              className="rounded-lg border p-4 flex items-center gap-4"
            >
              <input type="hidden" name="packType" value={p.type} />
              <div className="flex-1">
                <div className="font-semibold">{p.displayName}</div>
                <div className="text-sm text-muted-foreground">
                  {p.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {p.cardCount} cards · shiny rate 1/{p.shinyDenominator}
                </div>
              </div>
              <Button type="submit" disabled={!canAfford}>
                {p.costCredits} credits
              </Button>
            </form>
          );
        })}
      </div>
    </main>
  );
}
