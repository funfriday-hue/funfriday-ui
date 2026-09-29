"use client";

import { FormEvent, useEffect, useState } from "react";

type Type = "LIST" | "CHRONOLOGY" | "RANKED_LIST";
type Answer = {
  id: number;
  canonicalAnswer: string;
  displayOrder: number;
  hint?: string | null;
  aliases: string[];
};
type Draft = {
  id: number;
  category: string;
  questionType: Type;
  prompt: string;
  answers: Answer[];
  lastSyncedAt?: string | null;
  model?: string | null;
};
type EditableAnswer = Answer & { aliasesText: string };

const tokenKey = "funfriday-admin-token";
const apiBase = () =>
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "/api"
    : "http://localhost:8080/api";
const aliases = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];
const looksLikeQuestionRequest = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return /\b(create|generate|make|give)\b.*\b(sample|random|a)? ?\b(question|quiz|trivia)\b/.test(normalized) ||
    /\b(question|quiz|trivia)\b.*\b(about|on|for)\b/.test(normalized);
};

export default function CreateQuestionPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("INDIA");
  const [questionType, setQuestionType] = useState<Type>("LIST");
  const [prompt, setPrompt] = useState("");
  const [hintGuidance, setHintGuidance] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [answers, setAnswers] = useState<EditableAnswer[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => setToken(sessionStorage.getItem(tokenKey) || ""), []);

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
      sessionStorage.setItem(tokenKey, body.token);
      setToken(body.token);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (looksLikeQuestionRequest(prompt)) {
      setMessage("Enter the actual playable question, not a request to create one. Example: ‘Name every player in India’s 2024 ICC Men’s T20 World Cup squad.’");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase()}/admin/create-question`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category, questionType, prompt, hintGuidance }),
      });
      const body = await response.json();
      if (response.status === 401) {
        sessionStorage.removeItem(tokenKey);
        setToken("");
        throw new Error("Your admin session has expired. Please sign in again.");
      }
      if (!response.ok)
        throw new Error(body.message || "Unable to generate this question.");
      const created: Draft = {
        id: 0,
        category: body.category,
        questionType: body.questionType,
        prompt: body.prompt,
        model: body.model,
        answers: (body.answers || []).map((answer: { answer?: string; canonicalAnswer?: string; displayOrder: number; hint?: string | null; aliases?: string[] }) => ({
          id: -Date.now() - answer.displayOrder,
          canonicalAnswer: answer.answer || answer.canonicalAnswer || "",
          displayOrder: answer.displayOrder,
          hint: answer.hint,
          aliases: answer.aliases || [],
        })),
      };
      if (!created.answers.length) {
        throw new Error("The generator returned no answers. Please try again.");
      }
      setDraft(created);
      setAnswers(
        created.answers.map((answer) => ({
          ...answer,
          aliasesText: answer.aliases.join(", "),
        })),
      );
      setMessage(
        "Draft generated. Review and edit it, then save it for admin approval.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate this question.",
      );
    } finally {
      setLoading(false);
    }
  };
  const updateAnswer = (id: number, patch: Partial<EditableAnswer>) =>
    setAnswers((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const removeAnswer = (id: number) =>
    setAnswers((items) =>
      items
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, displayOrder: index + 1 })),
    );
  const addAnswer = () =>
    setAnswers((items) => [
      ...items,
      {
        id: -Date.now(),
        canonicalAnswer: "",
        displayOrder: items.length + 1,
        hint: questionType === "LIST" ? null : "",
        aliases: [],
        aliasesText: "",
      },
    ]);
  const move = (id: number, direction: -1 | 1) =>
    setAnswers((items) => {
      const index = items.findIndex((item) => item.id === id);
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, order) => ({ ...item, displayOrder: order + 1 }));
    });
  const save = async () => {
    if (!draft) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase()}/admin/create-question/draft`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: draft.category,
          questionType: draft.questionType,
          prompt: draft.prompt,
          model: draft.model || "EDITOR",
          answers: answers.map((answer) => ({
            answer: answer.canonicalAnswer,
            displayOrder: answer.displayOrder,
            hint: answer.hint || null,
            aliases: aliases(answer.aliasesText),
          })),
        }),
      });
      const body = await response.json();
      if (response.status === 401) {
        sessionStorage.removeItem(tokenKey);
        setToken("");
        throw new Error("Your admin session has expired. Please sign in again.");
      }
      if (!response.ok)
        throw new Error(body.message || "Unable to save draft.");
      setMessage("Question saved to draft. Resetting this page for a new question…");
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save draft.",
      );
    } finally {
      setLoading(false);
    }
  };
  if (!token)
    return (
      <main className="min-h-screen bg-[#090a0f] px-5 pt-28 text-white">
        <section className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-zinc-950 p-7">
          <p className="font-mono text-xs uppercase tracking-[.35em] text-cyan-400">
            FunFriday / restricted
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase">
            Create question
          </h1>
          <form onSubmit={login} className="mt-6 space-y-3">
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Admin password"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3"
            />
            <button
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black uppercase text-black"
            >
              Sign in
            </button>
          </form>
          {message && <p className="mt-4 text-sm text-rose-300">{message}</p>}
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-[#090a0f] px-5 pb-16 pt-24 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[.35em] text-cyan-400">
          FunFriday / create
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase">
          Create quiz question
        </h1>
        <p className="mt-2 text-zinc-400">
          Start with a category, type and question. The LLM produces an editable
          inactive draft.
        </p>
        {message && (
          <p className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </p>
        )}
        <form
          onSubmit={create}
          className="mt-6 rounded-[2rem] border border-white/10 bg-zinc-950 p-6"
        >
          <fieldset
            disabled={!!draft || loading}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="text-sm font-bold">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black p-3"
              >
                <option>CRICKET</option>
                <option>FOOTBALL</option>
                <option>BOLLYWOOD</option>
                <option>WWE</option>
                <option>INDIA</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              Question type
              <select
                value={questionType}
                onChange={(event) => {
                  setQuestionType(event.target.value as Type);
                  setHintGuidance("");
                }}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black p-3"
              >
                <option value="LIST">List</option>
                <option value="CHRONOLOGY">Chronology</option>
                <option value="RANKED_LIST">Ranked list</option>
              </select>
            </label>
            <label className="md:col-span-2 text-sm font-bold">
              Question
              <textarea
                required
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                placeholder="For example: Name every recipient of the Bharat Ratna."
                className="mt-2 w-full rounded-xl border border-white/15 bg-black p-3"
              />
            </label>
            {questionType === "CHRONOLOGY" && (
              <label className="md:col-span-2 text-sm font-bold">
                Hint for each answer
                <textarea
                  required
                  value={hintGuidance}
                  onChange={(event) => setHintGuidance(event.target.value)}
                  rows={2}
                  placeholder="For example: the year the person first became Prime Minister, or the state name."
                  className="mt-2 w-full rounded-xl border border-amber-300/40 bg-black p-3"
                />
                <span className="mt-1 block text-xs font-normal text-amber-200">
                  This tells the LLM exactly what the player should see before
                  each answer.
                </span>
              </label>
            )}
          </fieldset>
          {!draft && (
            <button
              disabled={loading}
              className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-wider text-black"
            >
              {loading ? "Generating…" : "Generate draft"}
            </button>
          )}
          {draft && (
            <p className="mt-4 text-sm text-cyan-200">
              Setup locked. The generated draft below can still be edited.
            </p>
          )}
        </form>
        {draft && (
          <article className="mt-6 rounded-[2rem] border border-white/10 bg-zinc-950 p-6">
            <div className="min-w-0">
              <p className="font-mono text-xs text-cyan-300">
                {draft.category} · {draft.questionType}
              </p>
              <textarea
                value={draft.prompt}
                onChange={(event) =>
                  setDraft({ ...draft, prompt: event.target.value })
                }
                rows={3}
                className="mt-3 w-full rounded-xl border border-cyan-400/40 bg-black p-3 text-xl font-black uppercase"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <button
                onClick={addAnswer}
                className="rounded-xl border border-cyan-400/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-300"
              >
                + Add answer
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="rounded-xl bg-cyan-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-50"
              >
                Save as draft
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Saving keeps this question inactive. Approve it later from{" "}
              <span className="font-bold text-cyan-300">/admin</span>.
            </p>
            <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
              {answers.map((answer, index) => (
                <div key={answer.id} className="rounded-xl bg-white/[.04] p-4">
                  <div className="flex justify-between">
                    <b className="text-cyan-300">{answer.displayOrder}.</b>
                    <span className="space-x-3 text-xs">
                      <button
                        onClick={() => move(answer.id, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(answer.id, 1)}
                        disabled={index === answers.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeAnswer(answer.id)}
                        className="text-rose-300"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                  <input
                    value={answer.canonicalAnswer}
                    onChange={(event) =>
                      updateAnswer(answer.id, {
                        canonicalAnswer: event.target.value,
                      })
                    }
                    placeholder="Answer"
                    className="mt-2 w-full rounded-lg border border-white/15 bg-black p-2"
                  />
                  {questionType !== "LIST" && (
                    <input
                      value={answer.hint || ""}
                      onChange={(event) =>
                        updateAnswer(answer.id, { hint: event.target.value })
                      }
                      placeholder={
                        questionType === "RANKED_LIST" ? "Value" : "Hint / year"
                      }
                      className="mt-2 w-full rounded-lg border border-amber-300/30 bg-black p-2"
                    />
                  )}
                  <textarea
                    value={answer.aliasesText}
                    onChange={(event) =>
                      updateAnswer(answer.id, {
                        aliasesText: event.target.value,
                      })
                    }
                    placeholder="Aliases — comma separated"
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-white/15 bg-black p-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
