"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ArrowRight, Crown, Home, Play, Users, X, Zap } from "lucide-react";
import type { QuizPageConfig } from "@/lib/quiz-pages";
import { QUIZ_PAGES } from "@/lib/quiz-pages";

type LaunchMode = "solo" | "multiplayer" | "join";

export default function CategoryQuizLanding({ page }: { page: QuizPageConfig }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<LaunchMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const syncName = () => setName(Cookies.get("playerName") ?? "");
    syncName();
    window.addEventListener("funfriday-auth-updated", syncName);
    return () => window.removeEventListener("funfriday-auth-updated", syncName);
  }, []);

  const openLaunch = (nextMode: LaunchMode) => {
    setMode(nextMode);
    setError("");
  };

  const handleLaunch = async () => {
    if (!name.trim()) {
      setError("Enter your name to continue.");
      return;
    }
    if (mode === "join" && !roomCode.trim()) {
      setError("Enter a room code to join.");
      return;
    }

    setLoading(true);
    setError("");
    const baseApiUrl = window.location.hostname === "localhost" ? "http://localhost:8080/api" : "/api";

    try {
      const joining = mode === "join";
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
      const autoStart = mode === "solo" ? (page.gameType === "QUIZ_ROYALE" ? "?quick=1" : "?solo=1") : "";
      router.push(`/room/${room.roomId}${autoStart}`);
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Unable to start this game.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0b] px-6 pb-20 pt-28 text-white sm:pt-32">
      <div className="mx-auto w-full max-w-6xl">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">
          <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-cyan-300"><Home size={12} /> Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-zinc-300">{page.name}</span>
        </nav>

        <header className="mt-7 text-center">
          <span className="text-4xl" aria-hidden="true">{page.icon}</span>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-6xl">{page.name}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{page.description}</p>
        </header>

        <section aria-label={`${page.name} play options`} className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-zinc-950 p-7 sm:p-9">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.24em] text-cyan-300"><Zap size={16} /> Single Player</div>
            <h2 className="mt-5 text-3xl font-black uppercase">Play on your own</h2>
            <p className="mt-4 min-h-12 text-sm leading-relaxed text-zinc-300">{page.singlePlayerDescription}</p>
            <button type="button" onClick={() => openLaunch("solo")} className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-cyan-400 px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-colors hover:bg-cyan-300"><Play size={16} fill="currentColor" /> Start single player <ArrowRight size={16} /></button>
          </article>

          <article className="rounded-[2rem] border border-fuchsia-300/30 bg-gradient-to-br from-fuchsia-400/10 to-zinc-950 p-7 sm:p-9">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.24em] text-fuchsia-300"><Crown size={16} /> Multiplayer</div>
            <h2 className="mt-5 text-3xl font-black uppercase">Play with friends</h2>
            <p className="mt-4 min-h-12 text-sm leading-relaxed text-zinc-300">{page.multiplayerDescription}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openLaunch("multiplayer")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-400 px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-colors hover:bg-fuchsia-300"><Users size={16} /> Create room</button>
              <button type="button" onClick={() => openLaunch("join")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-300/50 bg-fuchsia-400/10 px-4 py-4 text-xs font-black uppercase tracking-widest transition-colors hover:bg-fuchsia-400/20"><Users size={16} /> Join with code</button>
            </div>
          </article>
        </section>

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
              <button type="button" onClick={handleLaunch} disabled={loading} className="w-full rounded-xl bg-cyan-400 px-4 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-50">{loading ? "Starting…" : mode === "join" ? "Join room" : mode === "solo" ? "Start game" : "Create room"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
