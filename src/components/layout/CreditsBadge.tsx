import { Coins } from "lucide-react";

import { getBalance } from "@/lib/economy/credits";

type Props = {
  userId: string;
  size?: "sm" | "md";
};

/** Server-rendered credit balance pill. Always reads fresh from the DB. */
export async function CreditsBadge({ userId, size = "md" }: Props) {
  const balance = await getBalance(userId);
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      aria-label={`${balance} Propulse Credits`}
      className={`inline-flex items-center gap-1.5 rounded-full border bg-muted/40 font-medium tabular-nums ${padding}`}
    >
      <Coins className="size-4 text-amber-500" aria-hidden />
      {balance.toLocaleString()}
    </span>
  );
}
