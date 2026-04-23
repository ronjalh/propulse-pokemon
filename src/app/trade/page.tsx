import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CreditsBadge } from "@/components/layout/CreditsBadge";
import { listTradesForUser, type TradeCardDetail } from "@/lib/trade/queries";
import {
  acceptTradeAction,
  cancelTradeAction,
  rejectTradeAction,
} from "@/lib/trade/actions";

type PageProps = {
  searchParams: Promise<{ accepted?: string; error?: string }>;
};

export default async function TradePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const userId = session.user.id;
  const { accepted, error } = await searchParams;

  const all = await listTradesForUser(userId);
  const incoming = all.filter(
    (t) => t.toUserId === userId && t.status === "pending",
  );
  const outgoing = all.filter(
    (t) => t.fromUserId === userId && t.status === "pending",
  );
  const history = all.filter((t) => t.status !== "pending");

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <CreditsBadge userId={userId} />
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Trade</h1>
        <Link href="/trade/new">
          <Button>+ New trade</Button>
        </Link>
      </div>

      {accepted && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          Trade accepted — cards have swapped owners.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {friendlyError(error)}
        </div>
      )}

      <Section title="Incoming" emptyText="No incoming offers.">
        {incoming.map((t) => (
          <TradeRowView key={t.id} trade={t} viewerId={userId}>
            <form action={acceptTradeAction}>
              <input type="hidden" name="tradeId" value={t.id} />
              <Button type="submit" size="sm">Accept</Button>
            </form>
            <form action={rejectTradeAction}>
              <input type="hidden" name="tradeId" value={t.id} />
              <Button type="submit" size="sm" variant="ghost">
                Reject
              </Button>
            </form>
          </TradeRowView>
        ))}
      </Section>

      <Section title="Outgoing" emptyText="No outgoing offers.">
        {outgoing.map((t) => (
          <TradeRowView key={t.id} trade={t} viewerId={userId}>
            <form action={cancelTradeAction}>
              <input type="hidden" name="tradeId" value={t.id} />
              <Button type="submit" size="sm" variant="ghost">
                Cancel
              </Button>
            </form>
          </TradeRowView>
        ))}
      </Section>

      <Section title="History" emptyText="">
        {history.map((t) => (
          <TradeRowView key={t.id} trade={t} viewerId={userId} />
        ))}
      </Section>
    </main>
  );
}

function Section({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h2>
      {hasChildren ? (
        <ul className="space-y-2">{children}</ul>
      ) : emptyText ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : null}
    </section>
  );
}

function TradeRowView({
  trade,
  viewerId,
  children,
}: {
  trade: Awaited<ReturnType<typeof listTradesForUser>>[number];
  viewerId: string;
  children?: React.ReactNode;
}) {
  const iAmSender = trade.fromUserId === viewerId;
  const other = iAmSender ? trade.toEmail : trade.fromEmail;
  const yourSide = iAmSender ? trade.offered : trade.requested;
  const theirSide = iAmSender ? trade.requested : trade.offered;

  return (
    <li className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {iAmSender ? "To" : "From"}:{" "}
          <span className="font-mono">{other ?? "—"}</span>
        </div>
        <StatusPill status={trade.status} />
      </div>
      <div className="flex items-center gap-2">
        <MiniCard card={yourSide} />
        <div className="flex-1 text-center text-xs text-muted-foreground">
          you give <ArrowRight className="size-3 inline" /> you get
        </div>
        <MiniCard card={theirSide} />
      </div>
      {trade.message && (
        <div className="text-xs text-muted-foreground italic">
          “{trade.message}”
        </div>
      )}
      {children && <div className="flex gap-2 justify-end">{children}</div>}
    </li>
  );
}

function MiniCard({ card }: { card: TradeCardDetail | null }) {
  if (!card) {
    return (
      <div className="flex-1 rounded border p-2 text-xs text-muted-foreground italic">
        card not found
      </div>
    );
  }
  return (
    <div className="flex-1 rounded border p-2 flex items-center gap-2 min-w-0">
      <Image
        src={card.imageUrl}
        alt={card.personName}
        width={32}
        height={32}
        className="rounded-full size-8 object-cover shrink-0"
      />
      <div className="min-w-0">
        <div className="text-xs font-medium truncate flex items-center gap-1">
          {card.personName}
          {card.isShiny && <Sparkles className="size-3 text-pink-500" />}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {card.primaryType}
          {card.secondaryType ? `/${card.secondaryType}` : ""}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colour =
    status === "pending"
      ? "bg-amber-500/20 text-amber-600 border-amber-500/40"
      : status === "accepted"
        ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/40"
        : status === "rejected"
          ? "bg-destructive/20 text-destructive border-destructive/40"
          : "bg-muted text-muted-foreground border-muted-foreground/30";
  return (
    <span
      className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide font-semibold ${colour}`}
    >
      {status}
    </span>
  );
}

function friendlyError(code: string): string {
  if (code === "ownership-changed")
    return "One of the cards changed owners before the trade was accepted. Offer was rejected.";
  if (code === "not-pending") return "That trade is no longer pending.";
  return `Error: ${code}`;
}
