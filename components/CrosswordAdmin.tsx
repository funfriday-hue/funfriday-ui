"use client";

import { useEffect, useState } from "react";

type CrosswordEntry = {
  number: number;
  direction: "ACROSS" | "DOWN";
  row: number;
  column: number;
  answer: string;
  clue: string;
};

type Draft = {
  id: number;
  category: string;
  title: string;
  entriesJson?: string;
  entries?: CrosswordEntry[];
  gridJson: string;
  status: string;
  createdAt: string;
};

const entriesFor = (draft: Draft): CrosswordEntry[] => {
  if (draft.entries) return draft.entries;
  try {
    return draft.entriesJson ? JSON.parse(draft.entriesJson) : [];
  } catch {
    return [];
  }
};

function GridPreview({ draft }: { draft: Draft }) {
  const [grid, setGrid] = useState<boolean[][]>([]);
  const entries = entriesFor(draft);

  useEffect(() => {
    try {
      setGrid(JSON.parse(draft.gridJson));
    } catch {
      setGrid([]);
    }
  }, [draft.gridJson]);

  if (!grid.length) return null;
  const letters = new Map<string, string>();
  const numbers = new Map<string, number>();
  entries.forEach((entry) => {
    for (let index = 0; index < entry.answer.length; index += 1) {
      const row = entry.row + (entry.direction === "DOWN" ? index : 0);
      const column = entry.column + (entry.direction === "ACROSS" ? index : 0);
      letters.set(`${row}:${column}`, entry.answer[index]);
    }
    numbers.set(`${entry.row}:${entry.column}`, entry.number);
  });

  return (
    <div
      className="grid w-full max-w-[260px] overflow-hidden rounded-lg border-2 border-zinc-600 bg-zinc-700"
      style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, minmax(0, 1fr))` }}
      aria-label={`${draft.title} crossword grid`}
    >
      {grid.flatMap((row, rowIndex) =>
        row.map((open, columnIndex) => {
          const key = `${rowIndex}:${columnIndex}`;
          return (
            <div key={key} className={`relative aspect-square border border-zinc-700 ${open ? "bg-black" : "bg-zinc-800"}`}>
              {open && numbers.has(key) && <span className="absolute left-0.5 top-0 text-[7px] font-black text-zinc-400">{numbers.get(key)}</span>}
              {open && <span className="flex h-full items-center justify-center pt-0.5 text-[10px] font-black text-emerald-400 sm:text-xs">{letters.get(key)}</span>}
            </div>
          );
        }),
      )}
    </div>
  );
}

export default function CrosswordAdmin({ review = false }: { review?: boolean }) {
  const [token, setToken] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [editingCluesId, setEditingCluesId] = useState<number | null>(null);
  const [entryEdits, setEntryEdits] = useState<Record<number, CrosswordEntry[]>>({});

  useEffect(() => setToken(sessionStorage.getItem("funfriday-admin-token") || ""), []);
  const base = typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8080/api" : "/api";

  const load = async () => {
    if (!token) return;
    setError("");
    const response = await fetch(`${base}/admin/crossword/${review ? "puzzles" : "drafts?status=DRAFT"}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      setError(response.status === 401 ? "Admin login is required." : "Unable to load crosswords.");
      return;
    }
    setDrafts(await response.json());
  };

  useEffect(() => { void load(); }, [token]);

  const act = async (id: number, action: "approve" | "decline") => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;
    setBusy(id);
    const response = await fetch(`${base}/admin/crossword/drafts/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(action === "approve" ? { entriesJson: draft.entriesJson } : { reason: "Declined in review" }),
    });
    setBusy(null);
    if (!response.ok) setError(await response.text());
    else void load();
  };

  const editTitle = async (draft: Draft) => {
    const title = window.prompt("Crossword title", draft.title);
    if (!title?.trim()) return;
    setBusy(draft.id);
    const response = await fetch(`${base}/admin/crossword/${review ? "puzzles" : "drafts"}/${draft.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: title.trim(), gridJson: draft.gridJson }),
    });
    setBusy(null);
    if (!response.ok) setError(await response.text());
    else void load();
  };

  const startClueEdit = (draft: Draft) => {
    setEntryEdits((current) => ({ ...current, [draft.id]: entriesFor(draft).map((entry) => ({ ...entry })) }));
    setEditingCluesId(draft.id);
  };

  const saveClues = async (draft: Draft) => {
    const entries = entryEdits[draft.id];
    if (!entries || entries.some((entry) => !entry.clue.trim())) {
      setError("Every crossword clue needs text.");
      return;
    }
    setBusy(draft.id);
    setError("");
    try {
      const response = await fetch(`${base}/admin/crossword/puzzles/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: draft.title, gridJson: draft.gridJson, entriesJson: JSON.stringify(entries) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Unable to save crossword clues.");
      setEditingCluesId(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save crossword clues.");
    } finally {
      setBusy(null);
    }
  };

  const removePublishedPuzzle = async (draft: Draft) => {
    if (!window.confirm(`Permanently delete “${draft.title}”? This also removes all player progress for this crossword.`)) return;
    setBusy(draft.id);
    setError("");
    try {
      const response = await fetch(`${base}/admin/crossword/puzzles/${draft.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Unable to delete crossword.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete crossword.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0b] px-6 pb-20 pt-28 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">Crossword control room</p>
        <h1 className="mt-2 text-3xl font-black uppercase">{review ? "Published crosswords" : "Crossword drafts"}</h1>
        {!token && <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">Sign in at <a href="/admin" className="underline">/admin</a> first, then return here.</p>}
        {error && <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</p>}
        <div className="mt-6 grid gap-4">
          {drafts.map((draft) => {
            const entries = editingCluesId === draft.id ? entryEdits[draft.id] ?? [] : entriesFor(draft);
            const isEditing = editingCluesId === draft.id;
            return (
              <article key={draft.id} className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-300">{draft.category} · {draft.status || "PUBLISHED"}</p>
                <h2 className="mt-2 text-xl font-black">{draft.title}</h2>
                {review ? (
                  <div className="mt-5 grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
                    <GridPreview draft={draft} />
                    <div className="grid gap-5 sm:grid-cols-2">
                      {(["ACROSS", "DOWN"] as const).map((direction) => (
                        <section key={direction}>
                          <h3 className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-300">{direction}</h3>
                          <div className="mt-3 space-y-2">
                            {entries.filter((entry) => entry.direction === direction).map((entry) => (
                              <div key={`${entry.number}-${entry.direction}`} className="rounded-xl bg-white/[.04] p-3">
                                <p className="text-xs font-black text-cyan-300">{entry.number}. <span className="text-zinc-500">{entry.answer}</span></p>
                                {isEditing ? (
                                  <textarea
                                    value={entry.clue}
                                    onChange={(event) => setEntryEdits((current) => ({
                                      ...current,
                                      [draft.id]: current[draft.id].map((item) => item.number === entry.number && item.direction === entry.direction ? { ...item, clue: event.target.value } : item),
                                    }))}
                                    rows={3}
                                    className="mt-2 w-full rounded-lg border border-cyan-300/40 bg-black px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                                  />
                                ) : <p className="mt-1 text-sm text-zinc-200">{entry.clue}</p>}
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                ) : <p className="mt-2 text-sm text-zinc-400">{entries.length ? `${entries.length} clues` : "Puzzle draft"}</p>}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button disabled={busy === draft.id} onClick={() => void editTitle(draft)} className="rounded-xl border border-cyan-300/40 px-4 py-2 text-xs font-black uppercase text-cyan-200 disabled:opacity-50">Edit title</button>
                  {review && !isEditing && <button disabled={busy === draft.id} onClick={() => startClueEdit(draft)} className="rounded-xl border border-cyan-300/40 px-4 py-2 text-xs font-black uppercase text-cyan-200 disabled:opacity-50">Edit clues</button>}
                  {review && isEditing && <>
                    <button disabled={busy === draft.id} onClick={() => void saveClues(draft)} className="rounded-xl bg-cyan-300 px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-50">{busy === draft.id ? "Saving…" : "Save clues"}</button>
                    <button disabled={busy === draft.id} onClick={() => setEditingCluesId(null)} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-black uppercase text-zinc-300">Cancel</button>
                  </>}
                  {review && <button disabled={busy === draft.id} onClick={() => void removePublishedPuzzle(draft)} className="rounded-xl border border-rose-400/40 px-4 py-2 text-xs font-black uppercase text-rose-300 disabled:opacity-50">{busy === draft.id ? "Deleting…" : "Delete"}</button>}
                  {!review && <>
                    <button disabled={busy === draft.id} onClick={() => void act(draft.id, "approve")} className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black uppercase text-black">Approve & publish</button>
                    <button disabled={busy === draft.id} onClick={() => void act(draft.id, "decline")} className="rounded-xl border border-rose-400/40 px-4 py-2 text-xs font-black uppercase text-rose-300">Decline</button>
                  </>}
                </div>
              </article>
            );
          })}
          {token && !drafts.length && <p className="rounded-xl border border-white/10 p-6 text-sm text-zinc-500">No {review ? "published" : "pending"} crosswords.</p>}
        </div>
      </div>
    </main>
  );
}
