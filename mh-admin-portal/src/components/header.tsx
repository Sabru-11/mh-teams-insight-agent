"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const update = () => setNow(new Date().toLocaleString());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{now}</span>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
