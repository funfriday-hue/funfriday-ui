"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ArrowRight, BookOpen, Check, Crown, Play, Users, X, Zap } from "lucide-react";
import type { QuizPageConfig } from "@/lib/quiz-pages";
import { QUIZ_PAGES } from "@/lib/quiz-pages";

type LaunchMode = "solo" | "multiplayer" | "join";
type QuizQuestionProgress = { bestCorrectAnswers: number; answerCount: number; completed: boolean };
type QuizQuestionSummary = { questionKey: string; questionType: string; prompt: string; progress?: QuizQuestionProgress | null };
type QuizQuestionCatalog = { questions: QuizQuestionSummary[]; lockedQuestionCount: number; signedIn: boolean };

export default function CategoryQuizLanding({ page }: { page: QuizPageConfig }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<LaunchMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionSummary[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(page.gameType === "QUIZ_ROYALE");
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<string | null>(null);
  const [lockedQuestionCount, setLockedQuestionCount] = useState(0);
  const [catalogRefresh, setCatalogRefresh] = useState(0);

  useEffect(() => {
    const syncName = () => {
      setName(Cookies.get("playerName") ?? "");
      setCatalogRefresh((current) => current + 1);
    };
    syncName();
    window.addEventListener("funfriday-auth-updated", syncName);
    return () => window.removeEventListener("funfriday-auth-updated", syncName);
  }, []);

  useEffect(() => {
    if (page.gameType !== "QUIZ_ROYALE") return;
    let cancelled = false;
    const baseApiUrl = window.location.hostname === "localhost" ? "http://localhost:8080/api" : "/api";
    const catalogueRequestStartedAt = performance.now();
    fetch(`${baseApiUrl}/quiz-questions/${page.quizCategory}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load questions.");
        return response.json() as Promise<QuizQuestionCatalog>;
      })
      .then((catalog) => {
        if (cancelled) return;
        setQuestions(catalog.questions);
        setLockedQuestionCount(catalog.lockedQuestionCount);
        void fetch(`${baseApiUrl}/metrics/category-catalogue-load`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: page.quizCategory,
            durationMilliseconds: Math.round(performance.now() - catalogueRequestStartedAt)
          }),
          keepalive: true
        }).catch(() => undefined);
      })
      .catch(() => {
        if (cancelled) return;
        setQuestions([]);
        setLockedQuestionCount(0);
      })
      .finally(() => { if (!cancelled) setQuestionsLoading(false); });
    return () => { cancelled = true; };
  }, [catalogRefresh, page.gameType, page.quizCategory]);

  const openLaunch = (nextMode: LaunchMode) => {
    setMode(nextMode);
    setError("");
  };

  const launchWithSavedName = (nextMode: LaunchMode) => {
    if (name.trim()) {
      void handleLaunch(nextMode);
      return;
    }
    openLaunch(nextMode);
  };

  const handleLaunch = async (launchMode: LaunchMode | null = mode, questionKey: string | null = selectedQuestionKey) => {
    if (!name.trim()) {
      setError("Enter your name to continue.");
      return;
    }
    if (launchMode === "join" && !roomCode.trim()) {
      setError("Enter a room code to join.");
      return;
    }

    setLoading(true);
    setError("");
    const baseApiUrl = window.location.hostname === "localhost" ? "http://localhost:8080/api" : "/api";

    try {
      const joining = launchMode === "join";
      const response = await fetch(
        joining ? `${baseApiUrl}/rooms/join/${roomCode.trim().toUpperCase()}` : `${baseApiUrl}/rooms/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(
            joining
              ? { playerName: name.trim() }
              : {
                  type: page.gameType,
                  host: name.trim(),
                  ...(page.gameType === "QUIZ_ROYALE" ? { gameMode: page.quizCategory } : {})
                }
          )
        }
      );
      if (!response.ok) throw new Error((await response.text()) || "Unable to start this game.");

      const room = await response.json();
      Cookies.set("playerName", name.trim(), { expires: 1, path: "/" });
      sessionStorage.setItem("funfriday-room-admission", room.roomId);
      const autoStart = launchMode === "solo"
        ? (page.gameType === "QUIZ_ROYALE" ? `?quick=1${questionKey ? `&question=${encodeURIComponent(questionKey)}` : ""}` : "?solo=1")
        : "";
      router.push(`/room/${room.roomId}${autoStart}`);
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Unable to start this game.");
      setLoading(false);
    }
  };

  const startSelectedQuestion = (questionKey: string) => {
    if (name.trim()) {
      void handleLaunch("solo", questionKey);
      return;
    }
    setSelectedQuestionKey(questionKey);
    openLaunch("solo");
  };

  const requestGoogleLogin = () => window.dispatchEvent(new Event("funfriday-request-google-login"));

  return (
    <main className="min-h-screen bg-[#0a0a0b] px-6 pb-20 pt-20 text-white sm:pt-24">
      <div className="mx-auto w-full max-w-6xl">
        <header className="text-center">
          <span className="text-3xl" aria-hidden="true">{page.icon}</span>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">{page.name}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{page.description}</p>
        </header>

        <section aria-label={`${page.name} play options`} className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-zinc-950 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.24em] text-cyan-300"><Zap size={16} /> Single Player</div>
            <h2 className="mt-3 text-xl font-black uppercase">Play random</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{page.singlePlayerDescription}</p>
            <button type="button" onClick={() => launchWithSavedName("solo")} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-cyan-400 px-5 py-3.5 text-xs font-black uppercase tracking-widest text-slate-950 transition-colors hover:bg-cyan-300"><Play size={16} fill="currentColor" /> Start random <ArrowRight size={16} /></button>
          </article>

          <article className="rounded-[2rem] border border-fuchsia-300/30 bg-gradient-to-br from-fuchsia-400/10 to-zinc-950 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.24em] text-fuchsia-300"><Crown size={16} /> Multiplayer</div>
            <h2 className="mt-3 text-xl font-black uppercase">Play with friends</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{page.multiplayerDescription}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => launchWithSavedName("multiplayer")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-400 px-4 py-3.5 text-xs font-black uppercase tracking-widest text-slate-950 transition-colors hover:bg-fuchsia-300"><Users size={16} /> Create room</button>
              <button type="button" onClick={() => openLaunch("join")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/50 bg-fuchsia-400/10 px-4 py-3.5 text-xs font-black uppercase tracking-widest transition-colors hover:bg-fuchsia-400/20"><Users size={16} /> Join with code</button>
            </div>
          </article>
        </section>

        {page.gameType === "QUIZ_ROYALE" && (
          <section aria-labelledby="question-catalog-title" className="mx-auto mt-8 max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.26em] text-cyan-300">{page.name} catalogue</p>
                <h2 id="question-catalog-title" className="mt-1 text-2xl font-black uppercase sm:text-3xl">Questions to play</h2>
              </div>
              {!questionsLoading && <span className="text-xs font-bold text-zinc-400">{questions.length + lockedQuestionCount} active {questions.length + lockedQuestionCount === 1 ? "question" : "questions"}</span>}
            </div>

            {questionsLoading ? (
              <div className="mt-5 grid gap-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/5" />)}</div>
            ) : questions.length ? (
              <ol className="mt-3 grid gap-2">
                {questions.map((question, index) => (
                  <li key={question.questionKey}>
                    <button type="button" onClick={() => startSelectedQuestion(question.questionKey)} className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-left transition-colors hover:border-cyan-400/40 focus:outline-none focus-visible:border-cyan-300 sm:flex-row sm:items-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-xs font-black text-cyan-300">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-[.16em]">
                          <span className="flex items-center gap-2 text-fuchsia-300"><BookOpen size={13} /> {question.questionType.replaceAll("_", " ")}</span>
                          {question.progress?.completed ? (
                            <span className="flex items-center gap-1 text-emerald-400"><Check size={14} strokeWidth={3} /> Completed · {question.progress.answerCount}/{question.progress.answerCount}</span>
                          ) : question.progress ? (
                            <span className="flex items-center gap-1 text-amber-300"><span className="h-2 w-2 rounded-full bg-amber-300" /> Best: {question.progress.bestCorrectAnswers}/{question.progress.answerCount}</span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm font-bold leading-relaxed text-zinc-100">{question.prompt}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {lockedQuestionCount > 0 && (
                  <li className="py-2 text-center">
                    <button type="button" onClick={requestGoogleLogin} className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-cyan-200 transition-colors hover:bg-cyan-300/20">Log in to unlock {lockedQuestionCount} more {lockedQuestionCount === 1 ? "question" : "questions"}</button>
                  </li>
                )}
                {Array.from({ length: lockedQuestionCount }).map((_, index) => (
                  <li key={`locked-${index}`} aria-hidden="true">
                    <div className="flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-4 text-left sm:flex-row sm:items-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-black text-zinc-600">{questions.length + index + 1}</span>
                      <span className="min-w-0 blur-[5px]">
                        <span className="block h-3 w-24 rounded bg-fuchsia-300/40" />
                        <span className="mt-2 block h-4 w-[min(38rem,80vw)] max-w-full rounded bg-zinc-200/60" />
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-sm text-zinc-400">New questions for this category will appear here once they are approved.</p>
            )}
          </section>
        )}

        <article className="mx-auto mt-16 max-w-4xl border-t border-white/10 pt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">FunFriday game guide</p>
          <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">{page.seoHeading}</h2>
          <div className="mt-6 space-y-4 text-left text-sm leading-7 text-zinc-400 sm:text-base">
            {page.seoParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </article>

        <nav aria-label="Explore more FunFriday games" className="mx-auto mt-12 max-w-4xl border-t border-white/10 pt-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-zinc-500">Explore more games</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {QUIZ_PAGES.filter((candidate) => candidate.slug !== page.slug).map((candidate) => (
              <Link key={candidate.slug} href={`/${candidate.slug}`} className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-zinc-300 transition-colors hover:border-cyan-300 hover:text-cyan-200">{candidate.icon} {candidate.name}</Link>
            ))}
          </div>
        </nav>
      </div>

      {mode && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
          <section role="dialog" aria-modal="true" aria-labelledby="launch-title" className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950 p-8 shadow-2xl">
            <button type="button" onClick={() => setMode(null)} disabled={loading} className="absolute right-6 top-6 text-zinc-500 transition-colors hover:text-white" aria-label="Close"><X size={20} /></button>
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">{page.name}</p>
            <h2 id="launch-title" className="mt-3 text-3xl font-black uppercase">{mode === "join" ? "Join with code" : mode === "solo" ? "Single player" : "Create multiplayer room"}</h2>
            <div className="mt-7 space-y-4">
              <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Your name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} disabled={loading} maxLength={40} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 font-semibold outline-none focus:border-cyan-400" placeholder="Enter your name" /></label>
              {mode === "join" && <label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Room code</span><input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} disabled={loading} maxLength={12} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-center font-mono font-black tracking-[.25em] outline-none focus:border-cyan-400" placeholder="ABC123" /></label>}
              {error && <p className="text-sm text-rose-300">{error}</p>}
              <button type="button" onClick={() => void handleLaunch()} disabled={loading} className="w-full rounded-xl bg-cyan-400 px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-50">{loading ? "Starting…" : mode === "join" ? "Join room" : mode === "solo" ? "Start game" : "Create room"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
