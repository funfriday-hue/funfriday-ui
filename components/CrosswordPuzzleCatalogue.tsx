"use client";
import { Check, Grid3X3 } from "lucide-react";
import { useEffect, useState } from "react";
type Progress = { bestProgressPercent: number; completed: boolean };
type Puzzle = {
  id: number;
  puzzleKey: string;
  category: string;
  title: string;
  clueCount: number;
};
type Payload = { puzzles: Puzzle[]; progress: Record<string, Progress> };
export default function CrosswordPuzzleCatalogue({
  onSelect,
}: {
  onSelect: (id: number) => void;
}) {
  const [data, setData] = useState<Payload>({ puzzles: [], progress: {} });
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const load = () => {
    const base =
      window.location.hostname === "localhost"
        ? "http://localhost:8080/api"
        : "/api";
    const playerId = document.cookie.match(/(?:^|; )playerId=([^;]+)/)?.[1];
    fetch(
      `${base}/crosswords${playerId ? `?playerId=${encodeURIComponent(decodeURIComponent(playerId))}` : ""}`,
      { credentials: "include" },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((v) => {
        setData(v);
        setSignedIn(!!playerId);
      })
      .catch(() => setData({ puzzles: [], progress: {} }))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const f = () => load();
    window.addEventListener("funfriday-auth-updated", f);
    return () => window.removeEventListener("funfriday-auth-updated", f);
  }, []);
  const filtered = data.puzzles.filter((p) => {
    const q = data.progress[String(p.id)];
    return filter === "ALL" || filter === "COMPLETED"
      ? filter !== "COMPLETED" || q?.completed
      : filter === "PARTIAL"
        ? !!q && !q.completed
        : !q;
  });
  const visible = signedIn ? filtered : filtered.slice(0, 5);
  const locked = !signedIn ? Math.max(0, filtered.length - 5) : 0;
  const categoryNumbers = new Map<number, number>();
  const catalogueNumbers = new Map<number, number>();
  const categoryCounts = new Map<string, number>();
  data.puzzles.forEach((puzzle, index) => {
    const nextNumber = (categoryCounts.get(puzzle.category) ?? 0) + 1;
    categoryCounts.set(puzzle.category, nextNumber);
    categoryNumbers.set(puzzle.id, nextNumber);
    catalogueNumbers.set(puzzle.id, index + 1);
  });
  return (
    <section className="mx-auto mt-8 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.26em] text-cyan-300">
            Crossword catalogue
          </p>
          <h2 className="mt-1 text-2xl font-black uppercase sm:text-3xl">
            Choose a crossword
          </h2>
        </div>
        {signedIn && (
          <div className="flex gap-1.5">
            {[
              ["ALL", "All"],
              ["COMPLETED", "Completed"],
              ["PARTIAL", "Partial"],
              ["NOT_SOLVED", "Not solved"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${filter === v ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/10 text-zinc-400"}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-2">
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
        ) : (
          visible.map((p) => {
            const progress = data.progress[String(p.id)];
            const categoryNumber = categoryNumbers.get(p.id) ?? 1;
            const catalogueNumber = catalogueNumbers.get(p.id) ?? 1;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-left transition-colors hover:border-cyan-400/40"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-xs font-black text-cyan-300">
                  {catalogueNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-[.16em] text-fuchsia-300">
                    {p.category.replaceAll("_", " ")} #{categoryNumber}
                  </span>
                  <span className="mt-1 block text-sm font-bold">
                    {p.title}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {p.clueCount} clues
                  </span>
                </span>
                {progress?.completed ? (
                  <Check className="text-emerald-400" strokeWidth={3} />
                ) : progress ? (
                  <span className="text-xs font-black text-amber-300">
                    ● {progress.bestProgressPercent}%
                  </span>
                ) : (
                  <Grid3X3 className="text-zinc-600" size={18} />
                )}
              </button>
            );
          })
        )}
        {locked > 0 && (
          <>
            <div className="py-2 text-center">
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new Event("funfriday-request-google-login"),
                  )
                }
                className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-cyan-200"
              >
                Log in to unlock {locked} more crosswords
              </button>
            </div>
            {Array.from({ length: locked }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl border border-white/10 bg-zinc-900/60 blur-[4px]"
              />
            ))}
          </>
        )}
        {!loading && !visible.length && (
          <p className="rounded-2xl border border-white/10 p-6 text-sm text-zinc-500">
            No crossword puzzles available yet.
          </p>
        )}
      </div>
    </section>
  );
}
