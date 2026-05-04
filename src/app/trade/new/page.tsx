import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { createTradeAction } from "@/lib/trade/actions";
import {
  collectionDetails,
  findUserByEmail,
  type TradeCardDetail,
} from "@/lib/trade/queries";

type PageProps = {
  searchParams: Promise<{ opponent?: string; error?: string }>;
};

export default async function NewTradePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const { opponent, error } = await searchParams;

  let opponentInfo: Awaited<ReturnType<typeof findUserByEmail>> = null;
  let myCards: TradeCardDetail[] = [];
  let theirCards: TradeCardDetail[] = [];

  if (opponent) {
    opponentInfo = await findUserByEmail(opponent);
    if (opponentInfo) {
      [myCards, theirCards] = await Promise.all([
        collectionDetails(userId),
        collectionDetails(opponentInfo.id),
      ]);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/trade" className="text-sm text-muted-foreground hover:underline">
          ← Trades
        </Link>
        <CreditsBadge userId={userId} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight">New trade</h1>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {friendlyError(error)}
        </div>
      )}

      {!opponent && <OpponentLookup />}

      {opponent && !opponentInfo && (
        <div className="rounded-lg border p-4 text-sm">
          No Propulse user signed up with <code>{opponent}</code>. They need
          to sign in at least once before you can trade with them.{" "}
          <Link href="/trade/new" className="underline">
            Try again
          </Link>
        </div>
      )}

      {opponent && opponentInfo && (
        <form
          action={createTradeAction}
          className="rounded-lg border p-4 space-y-4"
        >
          <input type="hidden" name="toUserId" value={opponentInfo.id} />

          <div className="text-sm">
            Trading with:{" "}
            <span className="font-medium">
              {opponentInfo.name ?? opponentInfo.email}
            </span>
          </div>

          <CardPicker
            label="You offer"
            name="offeredCardId"
            cards={myCards}
            emptyText="You don't own any cards yet."
          />
          <CardPicker
            label="You want"
            name="requestedCardId"
            cards={theirCards}
            emptyText="This user has no cards to trade."
          />

          <label className="block text-sm">
            Message (optional)
            <input
              name="message"
              maxLength={200}
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
              placeholder="wanna swap?"
            />
          </label>

          <Button
            type="submit"
            disabled={myCards.length === 0 || theirCards.length === 0}
          >
            Send offer
          </Button>
        </form>
      )}
    </main>
  );
}

function OpponentLookup() {
  return (
    <form
      action="/trade/new"
      method="GET"
      className="rounded-lg border p-4 space-y-3"
    >
      <div className="font-semibold">Who do you want to trade with?</div>
      <label className="block text-sm">
        Their Propulse email
        <input
          name="opponent"
          type="email"
          required
          placeholder="navn@propulsentnu.no"
          className="mt-1 w-full rounded border bg-background p-2 text-sm"
        />
      </label>
      <Button type="submit">Continue</Button>
    </form>
  );
}

function CardPicker({
  label,
  name,
  cards,
  emptyText,
}: {
  label: string;
  name: string;
  cards: TradeCardDetail[];
  emptyText: string;
}) {
  return (
    <div>
      <div className="text-sm font-medium mb-2">{label}</div>
      {cards.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto p-1">
          {cards.map((c) => (
            <label
              key={c.cardId}
              className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-accent has-[input:checked]:border-sky-500 has-[input:checked]:bg-sky-500/10"
            >
              <input
                type="radio"
                name={name}
                value={c.cardId}
                required
                className="shrink-0"
              />
              <Image
                src={c.imageUrl}
                alt={c.personName}
                width={32}
                height={32}
                className="rounded-full size-8 object-cover shrink-0"
                unoptimized
              />
              <div className="min-w-0 text-left">
                <div className="text-xs font-medium truncate">
                  {c.personName}
                  {c.isShiny ? " ✨" : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.primaryType}
                  {c.secondaryType ? `/${c.secondaryType}` : ""}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function friendlyError(code: string): string {
  if (code === "missing-fields") return "Fill in both cards.";
  if (code === "cannot-trade-with-self") return "You can't trade with yourself.";
  if (code === "you-dont-own-offered")
    return "You don't own the card you tried to offer.";
  if (code === "they-dont-own-requested")
    return "They don't own the card you requested.";
  return `Error: ${code}`;
}
