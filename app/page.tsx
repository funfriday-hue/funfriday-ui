"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; 
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Trophy, Target } from "lucide-react";

const BRAIN_ARCADE_GAMES = [
  { 
    id: "wordle", 
    name: "Wordle Rush", 
    icon: "⌨️", 
    detail: "A high-stakes multiplayer race to decode the secret 5-letter word.", 
    active: true,
    instructions: {
      howToPlay: "Guess the hidden 5-letter word within 12 attempts per word. Letters change color to guide you: Green means correct letter in the right spot, Yellow means correct letter in the wrong spot, and Gray means the letter is not in the word at all. The match ends when you successfully complete all phases, run out of tries on a single word, or have the countdown clock hit zero.",
      multiplayer: "Everyone in the lobby simultaneously solves the exact same sequence of words. You can monitor your opponents' active progress, cleared totals, and current attempts in real-time, though their exact letter selections remain hidden.",
      scoring: "Players are ranked primarily by the number of words successfully cleared. In standard matching modes, ties are broken by the total attempts taken and the time elapsed. When playing in dedicated Timer / Time Attack configurations, the individual phase times are entirely omitted from the final standings."
    }
  },
  { 
    id: "sudoku", 
    name: "Sudoku", 
    icon: "🔢", 
    detail: "Race against time and friends to solve the ultimate logic puzzle.", 
    active: true,
    instructions: {
      howToPlay: "Fill the 9x9 grid so that every row, column, and 3x3 box contains all digits from 1 to 9 without repetition.",
      multiplayer: "All players start with the same board. Your 'Accuracy' (Progress %) is updated live for everyone to see.",
      scoring: "The first person to reach 100% accuracy wins. If you 'Give Up', your final progress is locked based on your last synced board."
    }
  },
];

const QUIZ_CATEGORIES = [
  { id: "CRICKET", name: "Cricket", icon: "🏏" },
  { id: "FOOTBALL", name: "Football", icon: "⚽" },
  { id: "BOLLYWOOD", name: "Bollywood", icon: "🎬" },
  { id: "WWE", name: "WWE", icon: "🤼" },
  { id: "INDIA", name: "India", icon: "🇮🇳" },
];

const QUIZ_CATEGORY_ROUTES: Record<string, string> = {
  CRICKET: "/cricket-quiz",
  FOOTBALL: "/football-quiz",
  BOLLYWOOD: "/bollywood-quiz",
  WWE: "/wwe-quiz",
  INDIA: "/india-quiz"
};

const QUIZ_ROYALE_GUIDE = {
  id: "quiz_royale_guide",
  name: "Quiz Royale",
  icon: "👑",
  detail: "Name unique answers before the clock or your strikes run out.",
  active: true,
  instructions: {
    howToPlay: "Choose a category, then the host selects 1, 2, or 3 questions, a timer, and a strike limit.\n\nQuiz Royale has three question types:\n• List — name as many distinct correct answers as you can.\n• Chronology — answer the next item for the hint shown, in the required order.\n• Ranked List — reveal the correct answer and value in its fixed rank.",
    multiplayer: "Quiz Royale has two multiplayer modes:\n• All Play — everyone can submit answers at the same time.\n• Round Robin — only one player answers at a time; turns rotate between active players.\n\nA wrong answer, pass, or timeout costs a strike. Reaching the limit eliminates a player only for the current question; everyone gets fresh strikes on the next question.",
    scoring: "Each accepted answer earns 1 point. Points carry across all selected questions. Final standings rank higher points first, then fewer strikes on the final question."
  }
};

export default function HomePage() {
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showInfo, setShowInfo] = useState<null | typeof BRAIN_ARCADE_GAMES[0] | typeof QUIZ_ROYALE_GUIDE>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>("wordle");
  const [selectedQuizCategory, setSelectedQuizCategory] = useState<string>("CRICKET");

  useEffect(() => {
    const syncName = () => setName(Cookies.get("playerName") ?? "");
    syncName();
    window.addEventListener("funfriday-auth-updated", syncName);
    return () => window.removeEventListener("funfriday-auth-updated", syncName);
  }, []);

  const triggerJoinFlow = () => {
    setSelectedGame("quiz_royale");
    setIsJoining(true);
    setRoomInput("");
    setShowModal(true);
  };

  const triggerCreateFlow = (gameId: string, quizCategory?: string) => {
    if (name.trim()) {
      void handleLaunch("START", { gameId, quizCategory, quickQuiz: false });
      return;
    }
    setSelectedGame(gameId);
    if (quizCategory) setSelectedQuizCategory(quizCategory);
    setIsJoining(false);
    setShowModal(true);
  };

  const triggerQuizCategory = (category: string) => {
    router.push(QUIZ_CATEGORY_ROUTES[category] ?? "/");
  };

  const handleLaunch = async (
    type: "START" | "JOIN",
    launchOptions: { gameId?: string; quizCategory?: string; quickQuiz?: boolean } = {}
  ) => {
    if (!name.trim()) {
      alert("Identification required.");
      return;
    }

    const gameId = launchOptions.gameId ?? selectedGame;
    const quizCategory = launchOptions.quizCategory ?? selectedQuizCategory;
    const quickQuiz = launchOptions.quickQuiz ?? false;

    Cookies.set("playerName", name.trim(), { expires: 1, path: "/" });
    setIsLoading(true);

    try {
      // DYNAMIC ENDPOINT RESOLUTION: Resolves to relative path in production, bypassing absolute localhost errors
      const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";
      const baseApiUrl = isProduction ? "/api" : "http://localhost:8080/api";

      const endpoint = type === "START" 
        ? `${baseApiUrl}/rooms/create` 
        : `${baseApiUrl}/rooms/join/${roomInput.trim().toUpperCase()}`;

      const payload = type === "START" 
        ? { type: gameId.toUpperCase(), host: name.trim(), ...(gameId === "quiz_royale" ? { gameMode: quizCategory } : {}) }
        : { playerName: name.trim() };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include" 
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Request failed");
      }

      const roomData = await response.json();
      sessionStorage.setItem("funfriday-room-admission", roomData.roomId);
      router.push(`/room/${roomData.roomId}${quickQuiz ? "?quick=1" : ""}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Server Error: Ensure backend daemon is operational.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <header className="px-6 pb-5 pt-24 text-center sm:pt-28">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 text-5xl font-black italic tracking-tighter text-white sm:text-7xl"
        >
          FUN<span className="text-cyan-500">FRIDAY</span>
        </motion.h1>
        <p className="mx-auto max-w-xl text-sm text-zinc-400 sm:text-base">Jump into a one-minute solo challenge or create a multiplayer room for your crew.</p>
      </header>

      {/* PLAY SECTIONS */}
      <main className="flex-grow flex flex-col items-center px-6 pb-20">
        <section className="w-full max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase leading-none text-cyan-300 sm:text-4xl">Quiz Royale</h2>
            <p className="mt-3 text-sm text-zinc-400">Choose a category, then play a quick solo quiz or create a room for friends.</p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <button type="button" onClick={() => setShowInfo(QUIZ_ROYALE_GUIDE)} className="text-[10px] font-black uppercase tracking-widest text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 hover:text-white">How to play</button>
              <button type="button" onClick={triggerJoinFlow} className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/50 bg-fuchsia-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-100 transition-colors hover:bg-fuchsia-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"><Users size={15} /> Join with code</button>
            </div>
          </div>
          <div className="mx-auto mt-5 grid w-full max-w-5xl grid-cols-5 gap-3 sm:gap-5">
            {QUIZ_CATEGORIES.map((category) => (
              <button key={category.id} type="button" onClick={() => triggerQuizCategory(category.id)} className="group rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] px-2 py-5 text-center transition-all hover:-translate-y-1 hover:border-cyan-300 hover:bg-cyan-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:py-7" aria-label={`Choose ${category.name} quiz`}>
                <span className="block text-2xl sm:text-3xl">{category.icon}</span><span className="mt-3 block text-[9px] font-black uppercase tracking-tight text-zinc-200 group-hover:text-cyan-200 sm:text-xs">{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* MIND GAMES */}
        <section className="mt-12 w-full max-w-7xl border-t border-white/10 pt-10">
          <div className="mb-7 text-center"><p className="text-[10px] font-black uppercase tracking-[.3em] text-fuchsia-300">Solo or multiplayer</p><h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-fuchsia-300 sm:text-5xl">Mind Games</h2></div>
          <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-5">
          {BRAIN_ARCADE_GAMES.map((game) => (
            <div
              key={game.id} 
              className="size-48 sm:size-52 rounded-[2rem] border border-white/10 bg-zinc-900 p-4 text-center transition-all hover:-translate-y-1 hover:border-cyan-400/60 hover:bg-cyan-400/10"
            >
              <button type="button" onClick={() => triggerCreateFlow(game.id)} className="flex w-full flex-col items-center"><span className="block text-3xl">{game.icon}</span><h3 className="mt-4 text-lg font-black uppercase tracking-wide">{game.name}</h3></button>
              <button type="button" onClick={() => setShowInfo(game)} className="mt-4 text-[10px] font-black uppercase tracking-widest text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 hover:text-white">How to play</button>
            </div>
          ))}
          </div>
        </section>

      </main>

      {/* INSTRUCTION MODAL */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[3rem] border border-zinc-800 bg-zinc-950 p-8 shadow-2xl md:p-12"
            >
               <button onClick={() => setShowInfo(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <div className="mb-8">
                <span className="text-cyan-500 font-mono text-[10px] uppercase tracking-[0.4em]">{showInfo.id === "quick_quiz_guide" ? "Solo Challenge" : "Multiplayer Protocol"}</span>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white mt-2">{showInfo.name} Guide</h2>
              </div>

              <div className="grid gap-6">
                <div className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                  <Target className="text-cyan-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">How to Play</h4>
                    <p className="whitespace-pre-line text-zinc-400 text-sm leading-relaxed">{showInfo.instructions.howToPlay}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                  <Users className="text-purple-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">{showInfo.id === "quick_quiz_guide" ? "Game Format" : "Multiplayer Mechanics"}</h4>
                    <p className="whitespace-pre-line text-zinc-400 text-sm leading-relaxed">{showInfo.instructions.multiplayer}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                  <Trophy className="text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Result Calculation</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">{showInfo.instructions.scoring}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowInfo(null)} 
                className="mt-10 w-full py-4 bg-white text-black font-black rounded-xl uppercase text-xs tracking-widest hover:bg-cyan-500 transition-colors"
              >
                Acknowledged
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IDENTITY & JOIN MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white font-mono disabled:opacity-50"
                disabled={isLoading}
              >
                [X]
              </button>

              <div className="mb-6 flex min-h-10 items-center gap-3 pr-8">
                <h2 className="flex-1 text-left font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  {isJoining ? "Join a room" : selectedGame === "quiz_royale" ? `Quiz Royale · ${selectedQuizCategory}` : `Identity Verification: ${selectedGame.toUpperCase()}`}
                </h2>
                {selectedGame === "quiz_royale" && !isJoining && (
                  <button
                    type="button"
                    onClick={() => setIsJoining(true)}
                    disabled={isLoading}
                    className="shrink-0 rounded-xl border border-fuchsia-300/50 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-fuchsia-200 transition-colors hover:bg-fuchsia-400/15 hover:text-white disabled:opacity-50"
                  >
                    Join with code
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                <input
                  type="text"
                  placeholder="USERNAME"
                  value={name}
                  disabled={isLoading}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-cyan-500 font-bold text-center"
                />

                {isJoining && (
                    <input
                      type="text"
                      placeholder="ROOM CODE"
                      value={roomInput}
                      disabled={isLoading}
                      onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-cyan-400 focus:outline-none focus:border-cyan-500 font-black text-center tracking-[0.5em]"
                    />
                )}

                {isJoining ? (
                  <button
                      onClick={() => handleLaunch("JOIN")}
                      disabled={isLoading || !roomInput.trim()}
                      className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-500 transition-all uppercase tracking-widest text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                      {isLoading ? "SYNCHRONIZING..." : "Start Game"}
                  </button>
                ) : selectedGame === "quiz_royale" ? (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => handleLaunch("START", { gameId: "quiz_royale", quizCategory: selectedQuizCategory, quickQuiz: true })}
                      disabled={isLoading || !name.trim()}
                      className="w-full rounded-xl bg-cyan-400 py-4 text-sm font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Start Quick Quiz
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunch("START", { gameId: "quiz_royale", quizCategory: selectedQuizCategory, quickQuiz: false })}
                      disabled={isLoading || !name.trim()}
                      className="w-full rounded-xl bg-white py-4 text-sm font-black uppercase tracking-widest text-black transition-colors hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create Multiplayer Room
                    </button>
                  </div>
                ) : (
                  <button
                      onClick={() => handleLaunch("START")}
                      disabled={isLoading || !name.trim()}
                      className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-500 transition-all uppercase tracking-widest text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                      {isLoading ? "SYNCHRONIZING..." : "Create New Room"}
                  </button>
                )}

                {!isLoading && (
                    <button
                        onClick={() => setIsJoining(false)}
                        className={`${isJoining ? "w-full" : "hidden"} text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors`}
                    >
                        {selectedGame === "quiz_royale" ? "Back to category choices" : "Back to create room"}
                    </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="py-16 border-t border-white/5 bg-black/80 backdrop-blur-md px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 border-b border-white/5 pb-12">
            <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-400">
              FunFriday is a multiplayer game hub for cricket quizzes, football quizzes, Bollywood quizzes, WWE quizzes, India quizzes, Wordle Rush, and Sudoku. Create a room, invite friends, and play together in real time.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-zinc-500 text-[10px] uppercase tracking-widest leading-relaxed font-bold">
              <div>
                <p className="mb-4 text-white">The Ultimate Multiplayer Arcade</p>
                <p>
                  FunFriday is the premier platform for <span className="text-cyan-500">multiplayer arcade games</span>, real-time trivia, and social deduction. 
                  Experience the viral sensation of <span className="text-white">Multiplayer Wordle Rush</span>, where you compete 
                  against friends to decode the secret 5-letter word in a high-speed sprint. Our platform is 
                  engineered for low-latency gaming, ensuring every guess and every point counts in your Friday night sessions.
                </p>
              </div>
              <div>
                <p className="mb-4 text-white">Social Gaming Reimagined</p>
                <p>
                  Whether you are looking for <span className="text-cyan-500">online games to play with friends</span> or 
                  challenging the community in rapid-fire trivia rounds, the FunFriday Protocol provides 
                  private room encryption and seamless browser-based play. No downloads required—just enter your 
                  username, share your room code, and start the competition. Join thousands of players 
                  reinventing the social arcade experience.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <h4 className="text-white font-black italic tracking-tighter text-xl">
                FUN<span className="text-cyan-500">FRIDAY</span>
              </h4>
              <p className="text-zinc-500 text-[10px] leading-relaxed uppercase tracking-widest font-medium">
                The ultimate multiplayer social protocol. <br />
                Engineered for Friday nights, <br /> 
                available every day.
              </p>
              <div className="flex gap-4 items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-500 text-[8px] font-black uppercase tracking-[0.3em]">System Live</span>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-white text-[11px] font-black uppercase tracking-[0.2em]">About Us</h5>
              <ul className="space-y-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                <li>
                  <Link 
                    href="/mission" 
                    className="hover:text-cyan-400 transition-colors uppercase font-bold text-[10px] tracking-widest text-left"
                  >
                    Our Mission
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all duration-300">
              <h5 className="text-cyan-400 text-[11px] font-black uppercase tracking-[0.2em]">Support Us</h5>
              <p className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold leading-normal mb-2">
                Help us keep the servers running and the games free.
              </p>
              <ul className="space-y-2 text-white text-[10px] font-black uppercase tracking-widest">
                <li>
                  <a 
                    href="https://www.paypal.com/ncp/payment/U7SZJUURVL4Q6" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 group hover:text-cyan-400 transition-colors"
                  >
                    Buy us a coffee <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h5 className="text-white text-[11px] font-black uppercase tracking-[0.2em]">Contact</h5>
              <ul className="space-y-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                <li><a href="mailto:shriaman93@gmail.com" className="hover:text-cyan-400 transition-colors text-cyan-500">Email HQ</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-600 text-[9px] font-mono uppercase tracking-[0.3em]">
              © 2026 FUNFRIDAY LABS. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-8 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
