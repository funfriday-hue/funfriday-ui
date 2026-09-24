"use client";

import { FormEvent, useEffect, useState } from "react";

type Answer = { id: number; canonicalAnswer: string; displayOrder: number; hint?: string | null; aliases: string[] };
type Question = { id: number; questionKey: string; category: string; questionType: "LIST" | "CHRONOLOGY"; prompt: string; status: string; model?: string | null; createdAt: string; answers: Answer[] };
type EditableAnswer = Omit<Answer, "aliases"> & { aliasesText: string };
type QuestionEdit = { prompt: string; answers: EditableAnswer[] };
type Mode = "draft" | "active";

const storageKey = "funfriday-admin-token";
const apiBase = () => typeof window !== "undefined" && window.location.hostname !== "localhost" ? "/api" : "http://localhost:8080/api";
const endpointFor = (mode: Mode) => mode === "draft" ? "drafts" : "questions";
const parseAliases = (value: string) => [...new Set(value.split(",").map(alias => alias.trim()).filter(Boolean))];
const editCopy = (question: Question): QuestionEdit => ({
  prompt: question.prompt,
  answers: question.answers.map(answer => ({ ...answer, aliasesText: answer.aliases.join(", ") })),
});

export default function QuestionReviewPage({ mode }: { mode: Mode }) {
  const isDraftMode = mode === "draft";
  const noun = isDraftMode ? "draft" : "active question";
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [edits, setEdits] = useState<Record<number, QuestionEdit>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadQuestions = async (adminToken = token) => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiBase()}/admin/${endpointFor(mode)}`, { headers: { Authorization: `Bearer ${adminToken}` } });
      const body = await response.json();
      if (response.status === 401) {
        sessionStorage.removeItem(storageKey);
        setToken("");
        setMessage("Your admin session has expired.");
        return;
      }
      if (!response.ok) throw new Error(body.message || `Unable to load ${noun}s.`);
      setQuestions(body);
      setEdits(Object.fromEntries(body.map((question: Question) => [question.id, editCopy(question)])));
      setEditingId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to load ${noun}s.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = sessionStorage.getItem(storageKey) || "";
    setToken(savedToken);
    if (savedToken) loadQuestions(savedToken);
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase()}/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Sign-in failed.");
      sessionStorage.setItem(storageKey, body.token);
      setToken(body.token);
      setPassword("");
      await loadQuestions(body.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const updateEdit = (questionId: number, updater: (edit: QuestionEdit) => QuestionEdit) => setEdits(current => ({
    ...current, [questionId]: updater(current[questionId]),
  }));

  const addAnswer = (question: Question) => updateEdit(question.id, edit => ({
    ...edit,
    answers: [...edit.answers, {
      id: -(Date.now() + Math.floor(Math.random() * 1000)),
      canonicalAnswer: "",
      displayOrder: Math.max(0, ...edit.answers.map(answer => answer.displayOrder)) + 1,
      hint: question.questionType === "CHRONOLOGY" ? "" : null,
      aliasesText: "",
    }],
  }));

  const updateAnswer = (questionId: number, answerId: number, patch: Partial<EditableAnswer>) => updateEdit(questionId, edit => ({
    ...edit,
    answers: edit.answers.map(answer => answer.id === answerId ? { ...answer, ...patch } : answer),
  }));

  const removeAnswer = (questionId: number, answerId: number) => updateEdit(questionId, edit => ({
    ...edit, answers: edit.answers.filter(answer => answer.id !== answerId),
  }));

  const saveQuestion = async (questionId: number) => {
    const edit = edits[questionId];
    if (!edit) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase()}/admin/${endpointFor(mode)}/${questionId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: edit.prompt,
          answers: edit.answers.map(answer => ({
            id: answer.id,
            canonicalAnswer: answer.canonicalAnswer,
            displayOrder: answer.displayOrder,
            hint: answer.hint || null,
            aliases: parseAliases(answer.aliasesText),
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || `Unable to save ${noun}.`);
      setMessage(`${isDraftMode ? "Draft" : "Question"} saved.`);
      await loadQuestions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to save ${noun}.`);
    } finally {
      setLoading(false);
    }
  };

  const draftAction = async (questionId: number, action: "approve" | "decline") => {
    let declineReason: string | null = null;
    if (action === "decline") {
      declineReason = window.prompt("Why are you declining this draft? This feedback will guide future questions in the same category.");
      if (declineReason === null) return;
      if (!declineReason.trim()) {
        setMessage("A decline reason is required.");
        return;
      }
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase()}/admin/drafts/${questionId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...(action === "decline" ? { "Content-Type": "application/json" } : {}) },
        ...(action === "decline" ? { body: JSON.stringify({ reason: declineReason }) } : {}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || `Unable to ${action} draft.`);
      setMessage(action === "approve" ? "Draft approved and activated." : "Draft declined; feedback saved for future generation.");
      await loadQuestions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} draft.`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    sessionStorage.removeItem(storageKey);
    setToken(""); setQuestions([]); setEdits({}); setEditingId(null); setMessage("");
  };

  if (!token) return <main className="min-h-screen bg-[#090a0f] px-5 pb-12 pt-28 text-white"><section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-zinc-950 p-7"><p className="font-mono text-xs uppercase tracking-[.35em] text-cyan-400">FunFriday / restricted</p><h1 className="mt-3 text-3xl font-black uppercase">Question review</h1><p className="mt-2 text-sm text-zinc-400">Enter an active admin password to review Quiz Royale {isDraftMode ? "drafts" : "questions"}.</p><form onSubmit={login} className="mt-6 space-y-3"><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoFocus required placeholder="Admin password" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-cyan-400"/><button disabled={loading} className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50">{loading ? "Signing in…" : "Sign in"}</button></form>{message && <p className="mt-4 text-sm text-rose-300">{message}</p>}</section></main>;

  return <main className="min-h-screen bg-[#090a0f] px-5 pb-12 pt-28 text-white"><section className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6"><div><p className="font-mono text-xs uppercase tracking-[.35em] text-cyan-400">FunFriday / {isDraftMode ? "admin" : "review"}</p><h1 className="mt-2 text-3xl font-black uppercase">{isDraftMode ? "Quiz draft review" : "Active question review"}</h1><p className="mt-2 text-sm text-zinc-400">{isDraftMode ? "Drafts are inactive questions. Edit them before approval." : "Edit live questions carefully. Saved changes are immediately used in new matches."}</p></div><div className="flex gap-2"><button onClick={() => loadQuestions()} disabled={loading} className="rounded-lg border border-cyan-400/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan-300 disabled:opacity-50">Refresh</button><button onClick={signOut} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300">Sign out</button></div></div>{message && <p className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">{message}</p>}<div className="mt-6 space-y-5">{loading && !questions.length && <p className="text-zinc-400">Loading {isDraftMode ? "drafts" : "questions"}…</p>}{!loading && !questions.length && <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500">No {isDraftMode ? "drafts awaiting review" : "active questions"}.</div>}{questions.map(question => {
    const isEditing = editingId === question.id;
    const edit = edits[question.id] || editCopy(question);
    return <article key={question.id} className="rounded-[2rem] border border-white/10 bg-zinc-950 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-cyan-400/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">{question.category}</span><span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300">{question.questionType}</span></div>{isEditing ? <textarea value={edit.prompt} onChange={event => updateEdit(question.id, value => ({ ...value, prompt: event.target.value }))} rows={3} className="mt-3 w-full rounded-xl border border-cyan-400/50 bg-black px-4 py-3 text-xl font-black uppercase leading-snug outline-none focus:border-cyan-300"/> : <h2 className="mt-3 text-xl font-black uppercase leading-snug">{question.prompt}</h2>}<p className="mt-2 font-mono text-[10px] text-zinc-500">{question.questionKey} · {new Date(question.createdAt).toLocaleString()} · {question.status}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setEditingId(isEditing ? null : question.id)} disabled={loading} className="rounded-xl border border-cyan-400/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 disabled:opacity-50">{isEditing ? "Cancel" : "Edit"}</button>{isEditing && <button onClick={() => addAnswer(question)} disabled={loading} className="rounded-xl border border-cyan-400/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 disabled:opacity-50">Add answer</button>}{isEditing && <button onClick={() => saveQuestion(question.id)} disabled={loading} className="rounded-xl bg-cyan-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-50">Save</button>}{isDraftMode && <button onClick={() => draftAction(question.id, "decline")} disabled={loading} className="rounded-xl border border-rose-400/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-300 disabled:opacity-50">Decline</button>}{isDraftMode && <button onClick={() => draftAction(question.id, "approve")} disabled={loading || isEditing} className="rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-50">Approve</button>}</div></div><div className="mt-5 max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">{edit.answers.length === 0 && <p className="text-sm text-amber-200">No answers yet. Click Edit, then Add answer.</p>}{edit.answers.map(answer => <div key={answer.id} className="rounded-xl bg-white/[.04] px-4 py-3">{isEditing ? <><div className="flex items-center justify-between gap-3"><label className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300">Answer {answer.displayOrder}</label><button onClick={() => removeAnswer(question.id, answer.id)} className="text-xs font-bold uppercase tracking-wider text-rose-300">Delete answer</button></div><input value={answer.canonicalAnswer} onChange={event => updateAnswer(question.id, answer.id, { canonicalAnswer: event.target.value })} placeholder="Answer" className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 font-semibold outline-none focus:border-cyan-400"/>{question.questionType === "CHRONOLOGY" && <><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-amber-300">Hint</label><input value={answer.hint || ""} onChange={event => updateAnswer(question.id, answer.id, { hint: event.target.value })} placeholder="Year or event hint" className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 outline-none focus:border-amber-300"/></>}<label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Aliases — comma separated</label><textarea value={answer.aliasesText} onChange={event => updateAnswer(question.id, answer.id, { aliasesText: event.target.value })} rows={2} placeholder="Alias one, Alias two" className="mt-1 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-400"/></> : <><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><p className="font-semibold text-white"><span className="mr-2 text-cyan-300">{answer.displayOrder}.</span>{answer.canonicalAnswer}</p>{answer.hint && <p className="font-mono text-xs text-amber-300">Hint: {answer.hint}</p>}</div>{answer.aliasesText && <p className="mt-1 text-xs text-zinc-400">Aliases: {answer.aliasesText}</p>}</>}</div>)}</div></article>;
  })}</div></section></main>;
}
