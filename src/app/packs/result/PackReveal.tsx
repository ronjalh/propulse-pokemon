"use client";

import { motion } from "framer-motion";
import { PropulseCard } from "@/components/card/PropulseCard";
import type { Card, Person } from "@/lib/db/schema";

type Pair = { card: Card; person: Person };

export function PackReveal({ pairs }: { pairs: Pair[] }) {
  const shinyCount = pairs.filter((p) => p.card.isShiny).length;

  return (
    <div className="space-y-4">
      {shinyCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-pink-500 font-bold"
        >
          ✨ {shinyCount} Feminist{shinyCount > 1 ? "s" : ""}! ✨
        </motion.div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
        {pairs.map((pair, i) => (
          <motion.div
            key={pair.card.id}
            initial={{ opacity: 0, y: 20, rotateY: 180 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{
              delay: i * 0.3,
              duration: 0.6,
              type: "spring",
              stiffness: 150,
            }}
          >
            <PropulseCard card={pair.card} person={pair.person} size="md" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
