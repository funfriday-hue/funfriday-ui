"use client";

import { Check, ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react";
import { useEffect, useState } from "react";

type PuzzleProgress = { bestProgressPercent: number; completed: boolean };
type Puzzle = { id: number; size: number; progress?: PuzzleProgress | null };
type PuzzlePage = { puzzles: Puzzle[]; total: number; page: number; pageSize: number; lockedPuzzleCount: number; signedIn: boolean };
type ProgressFilter = "ALL" | "COMPLETED" | "PARTIAL" | "NOT_SOLVED";

const PAGE_SIZE = 15;
const GUEST_VISIBLE_PUZZLES = 5;
const FILTERS: { value: ProgressFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PARTIAL", label: "Partial" },
  { value: "NOT_SOLVED", label: "Not solved" },
];

function PuzzleColumn({ size, filter, refreshKey, onSelect, onSignedInChange }: { size: 6 | 9; filter: ProgressFilter; refreshKey: number; onSelect: (puzzle: Puzzle) => void; onSignedInChange: (signedIn: boolean) => void }) {
  const [catalogue, setCatalogue] = useState<PuzzlePage | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(0); }, [filter]);

  useEffect(() => {
    let cancelled = false;
    const baseApiUrl = window.location.hostname === "localhost" ? "http://localhost:8080/api" : "/api";
    setLoading(true);
    fetch(`${baseApiUrl}/sudoku-puzzles?size=${size}&page=${page}&pageSize=${PAGE_SIZE}&progress=${filter}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load Sudoku puzzles.");
        return response.json() as Promise<PuzzlePage>;
      })
      .then((value) => { if (!cancelled) { setCatalogue(value); onSignedInChange(value.signedIn); } })
      .catch(() => { if (!cancelled) setCatalogue(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, page, refreshKey, size]);

  const totalPages = Math.max(1, Math.ceil((catalogue?.total || 0) / PAGE_SIZE));
  return (
    <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2"><Grid3X3 size={17} className="text-cyan-300" /><h3 className="text-base font-black uppercase">{size} × {size}</h3></div>
        {!loading && catalogue?.signedIn && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label={`Previous ${size} by ${size} Sudoku puzzles`} onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-md border border-white/10 p-1 text-zinc-300 transition-colors hover:border-cyan-300 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-wider text-zinc-500">Page {page + 1} of {totalPages}</span>
            <button type="button" aria-label={`Next ${size} by ${size} Sudoku puzzles`} onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="rounded-md border border-white/10 p-1 text-zinc-300 transition-colors hover:border-cyan-300 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-2">
        {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-white/5" />) : catalogue?.puzzles.map((puzzle) => (
          <button key={puzzle.id} type="button" onClick={() => onSelect(puzzle)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-left transition-colors hover:border-cyan-300/50 hover:bg-cyan-300/[.06] focus:outline-none focus-visible:border-cyan-300">
            <span className="text-sm font-black text-white">Puzzle #{puzzle.id}</span>
            {puzzle.progress?.completed ? <span title="Completed" className="flex items-center gap-1 text-xs font-black text-emerald-400"><Check size={17} strokeWidth={3} /> Completed</span>
              : puzzle.progress ? <span className="flex items-center gap-1 text-xs font-black text-amber-300"><span className="h-2 w-2 rounded-full bg-amber-300" /> {puzzle.progress.bestProgressPercent}%</span>
              : null}
          </button>
        ))}
        {!loading && !!catalogue?.lockedPuzzleCount && <>
          <div className="py-2 text-center">
            <button type="button" onClick={() => window.dispatchEvent(new Event("funfriday-request-google-login"))} className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-cyan-200 transition-colors hover:bg-cyan-300/20">
              Log in to unlock {catalogue.lockedPuzzleCount} more puzzles
            </button>
          </div>
          {Array.from({ length: Math.min(PAGE_SIZE - GUEST_VISIBLE_PUZZLES, catalogue.lockedPuzzleCount) }).map((_, index) => (
            <div key={`locked-${index}`} aria-hidden="true" className="flex h-14 items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[.03] px-4">
              <span className="text-sm font-black text-zinc-600">#{GUEST_VISIBLE_PUZZLES + index + 1}</span>
              <span className="h-3 w-28 rounded bg-zinc-400/30 blur-[3px]" />
            </div>
          ))}
        </>}
        {!loading && !catalogue?.puzzles.length && <p className="rounded-xl border border-white/10 px-4 py-5 text-sm text-zinc-500">No puzzles available.</p>}
      </div>
    </section>
  );
}

export default function SudokuPuzzleCatalogue({ onSelect }: { onSelect: (puzzleId: number, size: 6 | 9) => void }) {
  const [filter, setFilter] = useState<ProgressFilter>("ALL");
  const [signedIn, setSignedIn] = useState(false);
  const [catalogueRefresh, setCatalogueRefresh] = useState(0);
  useEffect(() => { if (!signedIn) setFilter("ALL"); }, [signedIn]);
  useEffect(() => {
    const refresh = () => setCatalogueRefresh((current) => current + 1);
    window.addEventListener("funfriday-auth-updated", refresh);
    return () => window.removeEventListener("funfriday-auth-updated", refresh);
  }, []);
  return <section aria-labelledby="sudoku-puzzle-catalogue-title" className="mx-auto mt-8 max-w-5xl"><div className="border-b border-white/10 pb-3"><p className="text-[10px] font-black uppercase tracking-[.26em] text-cyan-300">Sudoku catalogue</p><div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h2 id="sudoku-puzzle-catalogue-title" className="text-2xl font-black uppercase sm:text-3xl">Choose a puzzle</h2><p className="mt-1 text-sm text-zinc-400">Pick a numbered board to play it on your own.</p></div>{signedIn && <div className="flex flex-wrap gap-1.5" aria-label="Filter puzzles by progress">{FILTERS.map((option) => <button key={option.value} type="button" onClick={() => setFilter(option.value)} className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${filter === option.value ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/10 text-zinc-400 hover:border-white/30 hover:text-white"}`}>{option.label}</button>)}</div>}</div></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><PuzzleColumn size={6} filter={filter} refreshKey={catalogueRefresh} onSignedInChange={setSignedIn} onSelect={(puzzle) => onSelect(puzzle.id, 6)} /><PuzzleColumn size={9} filter={filter} refreshKey={catalogueRefresh} onSignedInChange={setSignedIn} onSelect={(puzzle) => onSelect(puzzle.id, 9)} /></div></section>;
}
