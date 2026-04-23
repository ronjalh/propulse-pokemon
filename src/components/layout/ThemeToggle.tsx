"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/** Icon button that flips between light and dark themes. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render a placeholder until mounted to avoid SSR/CSR icon mismatch.
  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="p-2 rounded-md border opacity-50"
        disabled
      >
        <Sun className="size-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-md border hover:bg-accent transition-colors"
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400" />
      ) : (
        <Moon className="size-4 text-sky-600" />
      )}
    </button>
  );
}
