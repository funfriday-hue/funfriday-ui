"use client";
import { useEffect, useState } from "react";
type Draft = {
  id: number;
  category: string;
  title: string;
  entriesJson: string;
  gridJson: string;
  status: string;
  createdAt: string;
};
export default function CrosswordAdmin({
  review = false,
}: {
  review?: boolean;
}) {
  const [token, setToken] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(
    () => setToken(localStorage.getItem("funfriday-admin-token") || ""),
    [],
  );
  const base =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:8080/api"
      : "/api";
  const load = async () => {
    if (!token) return;
    const r = await fetch(
      `${base}/admin/crossword/${review ? "puzzles" : "drafts?status=DRAFT"}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!r.ok) {
      setError("Admin login is required.");
      return;
    }
    setDrafts(await r.json());
  };
  useEffect(() => {
    void load();
  }, [token]);
  const act = async (id: number, action: "approve" | "decline") => {
    const d = drafts.find((x) => x.id === id);
    if (!d) return;
    setBusy(id);
    const r = await fetch(`${base}/admin/crossword/drafts/${id}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(
        action === "approve"
          ? { entriesJson: d.entriesJson }
          : { reason: "Declined in review" },
      ),
    });
    setBusy(null);
    if (!r.ok) setError(await r.text());
    else void load();
  };
  const edit = async (d: Draft) => {
    const title = window.prompt("Crossword title", d.title);
    if (!title) return;
    const r = await fetch(
      `${base}/admin/crossword/${review ? "puzzles" : "drafts"}/${d.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          gridJson: d.gridJson,
          entriesJson: d.entriesJson,
        }),
      },
    );
    if (!r.ok) setError(await r.text());
    else void load();
  };
  return (
    <main className="min-h-screen bg-[#0a0a0b] px-6 pb-20 pt-28 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">
          Crossword control room
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase">
          {review ? "Published crosswords" : "Crossword drafts"}
        </h1>
        {!token && (
          <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            Sign in at{" "}
            <a href="/admin" className="underline">
              /admin
            </a>{" "}
            first, then return here.
          </p>
        )}
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        <div className="mt-6 grid gap-4">
          {drafts.map((d) => (
            <article
              key={d.id}
              className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
            >
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-300">
                {d.category} · {d.status || "PUBLISHED"}
              </p>
              <h2 className="mt-2 text-xl font-black">{d.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">
                {d.entriesJson
                  ? (() => {
                      try {
                        return `${JSON.parse(d.entriesJson).length} clues`;
                      } catch {
                        return "Puzzle draft";
                      }
                    })()
                  : "Published puzzle"}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => void edit(d)}
                  className="rounded-xl border border-cyan-300/40 px-4 py-2 text-xs font-black uppercase text-cyan-200"
                >
                  Edit title
                </button>
                {!review && (
                  <>
                    <button
                      disabled={busy === d.id}
                      onClick={() => void act(d.id, "approve")}
                      className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black uppercase text-black"
                    >
                      Approve & publish
                    </button>
                    <button
                      disabled={busy === d.id}
                      onClick={() => void act(d.id, "decline")}
                      className="rounded-xl border border-rose-400/40 px-4 py-2 text-xs font-black uppercase text-rose-300"
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
          {token && !drafts.length && (
            <p className="rounded-xl border border-white/10 p-6 text-sm text-zinc-500">
              No {review ? "published" : "pending"} crosswords.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
