"use client";

import { FormEvent, useEffect, useState } from "react";

type DraftAnswer = { id: number; canonicalAnswer: string; displayOrder: number; hint?: string | null; aliases: string[] };
type Draft = { id: number; questionKey: string; category: string; questionType: "LIST" | "CHRONOLOGY"; prompt: string; status: string; model?: string | null; createdAt: string; answers: DraftAnswer[] };
type DraftEdit = { prompt: string; answers: DraftAnswer[] };

const apiBase = () => typeof window !== "undefined" && window.location.hostname !== "localhost" ? "/api" : "http://localhost:8080/api";
const storageKey = "funfriday-admin-token";

const copyDraftForEditing = (draft: Draft): DraftEdit => ({
  prompt: draft.prompt,
  answers: draft.answers.map(answer => ({ ...answer, aliases: [...answer.aliases] })),
});

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [edits, setEdits] = useState<Record<number, DraftEdit>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDrafts = async (adminToken = token) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBase()}/admin/drafts`, { headers: { Authorization: `Bearer ${adminToken}` } });
      if (response.status === 401) {
        sessionStorage.removeItem(storageKey);
        setToken("");
        setMessage("Your admin session has expired.");
        return;
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to load drafts.");
      setDrafts(body);
      setEdits(Object.fromEntries(body.map((draft: Draft) => [draft.id, copyDraftForEditing(draft)])));
      setEditingId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load drafts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = sessionStorage.getItem(storageKey) || "";
    setToken(savedToken);
    if (savedToken) loadDrafts(savedToken);
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase()}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Sign-in failed.");
      sessionStorage.setItem(storageKey, body.token);
      setToken(body.token);
      setPassword("");
      await loadDrafts(body.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const review = async (draftId: number, action: "approve" | "decline") => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase()}/admin/drafts/${draftId}/${action}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || `Unable to ${action} this draft.`);
      setMessage(action === "approve" ? "Draft approved and activated in the live question pool." : "Draft declined and removed.");
      await loadDrafts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} this draft.`);
    } finally {
      setLoading(false);
    }
  };

  const updatePrompt = (draftId: number, prompt: string) => setEdits(current => ({
    ...current, [draftId]: { ...current[draftId], prompt },
  }));

  const updateAnswer = (draftId: number, answerId: number, patch: Partial<DraftAnswer>) => setEdits(current => ({
    ...current,
    [draftId]: {
      ...current[draftId],
      answers: current[draftId].answers.map(answer => answer.id === answerId ? { ...answer, ...patch } : answer),
    },
  }));

  const addAnswer = (draftId: number, questionType: Draft["questionType"]) => setEdits(current => {
    const draft = current[draftId];
    const nextDisplayOrder = Math.max(0, ...draft.answers.map(answer => answer.displayOrder)) + 1;
    return {
      ...current,
      [draftId]: {
        ...draft,
        answers: [...draft.answers, {
          id: -(Date.now() + Math.floor(Math.random() * 1000)),
          canonicalAnswer: "",
          displayOrder: nextDisplayOrder,
          hint: questionType === "CHRONOLOGY" ? "" : null,
          aliases: [],
        }],
      },
    };
  });

  const saveDraft = async (draftId: number) => {
    const draft = edits[draftId];
    if (!draft) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase()}/admin/drafts/${draftId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: draft.prompt,
          answers: draft.answers.map(answer => ({
            id: answer.id,
            canonicalAnswer: answer.canonicalAnswer,
            displayOrder: answer.displayOrder,
            hint: answer.hint || null,
            aliases: answer.aliases,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to save draft.");
      setMessage("Draft saved. Review it, then approve when ready.");
      await loadDrafts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save draft.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    sessionStorage.removeItem(storageKey);
    setToken(""); setDrafts([]); setEdits({}); setEditingId(null); setMessage("");
  };

  if (!token) return <main className="min-h-screen bg-[#090a0f] px-5 pb-12 pt-28 text-white"><section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-zinc-950 p-7"><p className="font-mono text-xs uppercase tracking-[.35em] text-cyan-400">FunFriday / restricted</p><h1 className="mt-3 text-3xl font-black uppercase">Question review</h1><p className="mt-2 text-sm text-zinc-400">Enter an active admin password to review generated Quiz Royale drafts.</p><form onSubmit={login} className="mt-6 space-y-3"><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus required placeholder="Admin password" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-cyan-400"/><button disabled={loading} className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50">{loading ? "Signing in…" : "Sign in"}</button></form>{message && <p className="mt-4 text-sm text-rose-300">{message}</p>}</section></main>;

  return <main className="min-h-screen bg-[#090a0f] px-5 pb-12 pt-28 text-white"><section className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6"><div><p className="font-mono text-xs uppercase tracking-[.35em] text-cyan-400">FunFriday / admin</p><h1 className="mt-2 text-3xl font-black uppercase">Quiz draft review</h1><p className="mt-2 text-sm text-zinc-400">Drafts are inactive questions. Edit question text, answers, hints, and aliases before approval.</p></div><div className="flex gap-2"><button onClick={() => loadDrafts()} disabled={loading} className="rounded-lg border border-cyan-400/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300 disabled:opacity-50">Refresh</button><button onClick={signOut} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300">Sign out</button></div></div>{message && <p className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">{message}</p>}<div className="mt-6 space-y-5">{loading && !drafts.length && <p className="text-zinc-400">Loading drafts…</p>}{!loading && !drafts.length && <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500">No drafts are awaiting review.</div>}{drafts.map(draft => {
    const isEditing = editingId === draft.id;
    const edit = edits[draft.id] || copyDraftForEditing(draft);
    return <article key={draft.id} className="rounded-[2rem] border border-white/10 bg-zinc-950 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-cyan-400/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">{draft.category}</span><span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300">{draft.questionType}</span></div>{isEditing ? <textarea value={edit.prompt} onChange={event => updatePrompt(draft.id, event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-cyan-400/50 bg-black px-4 py-3 text-xl font-black uppercase leading-snug outline-none focus:border-cyan-300"/> : <h2 className="mt-3 text-xl font-black uppercase leading-snug">{draft.prompt}</h2>}<p className="mt-2 font-mono text-[10px] text-zinc-500">{draft.questionKey} · {new Date(draft.createdAt).toLocaleString()} · {draft.model || "LLM"}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setEditingId(isEditing ? null : draft.id)} disabled={loading} className="rounded-xl border border-cyan-400/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 disabled:opacity-50">{isEditing ? "Cancel" : "Edit"}</button>{isEditing && <button onClick={() => addAnswer(draft.id, draft.questionType)} disabled={loading} className="rounded-xl border border-cyan-400/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 disabled:opacity-50">Add answer</button>}{isEditing && <button onClick={() => saveDraft(draft.id)} disabled={loading} className="rounded-xl bg-cyan-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-50">Save</button>}<button onClick={() => review(draft.id, "decline")} disabled={loading} className="rounded-xl border border-rose-400/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-300 disabled:opacity-50">Decline</button><button onClick={() => review(draft.id, "approve")} disabled={loading || isEditing} className="rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-50">Approve</button></div></div><div className="mt-5 max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">{edit.answers.map(answer => <div key={answer.id} className="rounded-xl bg-white/[.04] px-4 py-3">{isEditing ? <><label className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300">Answer {answer.displayOrder}</label><input value={answer.canonicalAnswer} onChange={event => updateAnswer(draft.id, answer.id, { canonicalAnswer: event.target.value })} className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 font-semibold outline-none focus:border-cyan-400"/>{draft.questionType === "CHRONOLOGY" && <><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-amber-300">Hint</label><input value={answer.hint || ""} onChange={event => updateAnswer(draft.id, answer.id, { hint: event.target.value })} className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 outline-none focus:border-amber-300"/></>}<label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Aliases — comma separated</label><textarea value={answer.aliases.join(", ")} onChange={event => updateAnswer(draft.id, answer.id, { aliases: event.target.value.split(",").map(alias => alias.trim()).filter(Boolean) })} rows={2} className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-400"/></> : <><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><p className="font-semibold text-white"><span className="mr-2 text-cyan-300">{answer.displayOrder}.</span>{answer.canonicalAnswer}</p>{answer.hint && <p className="font-mono text-xs text-amber-300">Hint: {answer.hint}</p>}</div>{answer.aliases.length > 0 && <p className="mt-1 text-xs text-zinc-400">Aliases: {answer.aliases.join(", ")}</p>}</>}</div>)}</div></article>;
  })}</div></section></main>;
}
