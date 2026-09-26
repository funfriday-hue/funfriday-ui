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
];

const QUIZ_ROYALE_GUIDE = {
  id: "quiz_royale_guide",
  name: "Quiz Royale",
  icon: "👑",
  detail: "Name unique answers before the clock or your strikes run out.",
  active: true,
  instructions: {
    howToPlay: "Choose a category, then the host selects 1, 2, or 3 questions, a timer, and a strike limit. List questions accept unique answers. Chronology questions require the next answer for the shown hint in sequence.",
    multiplayer: "All Play lets everyone submit at once. Round Robin gives one player the turn at a time. A wrong answer, pass, or timeout costs a strike. Reaching the limit eliminates a player only for the current question; everyone gets fresh strikes on the next question.",
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
    const savedName = Cookies.get("playerName");
    if (savedName) setName(savedName);
  }, []);

  const triggerJoinFlow = () => {
    setIsJoining(true);
    setShowModal(true);
  };

  const triggerCreateFlow = (gameId: string, quizCategory?: string) => {
    setSelectedGame(gameId);
    if (quizCategory) setSelectedQuizCategory(quizCategory);
    setIsJoining(false);
    setShowModal(true);
  };

  const handleLaunch = async (type: "START" | "JOIN") => {
    if (!name.trim()) {
      alert("Identification required.");
      return;
    }

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
        ? { type: selectedGame.toUpperCase(), host: name.trim(), ...(selectedGame === "quiz_royale" ? { gameMode: selectedQuizCategory } : {}) }
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
      router.push(`/room/${roomData.roomId}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Server Error: Ensure backend daemon is operational.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <header className="px-6 pb-4 pt-20 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-7xl font-black italic tracking-tighter text-white mb-4"
        >
          FUN<span className="text-cyan-500">FRIDAY</span>
        </motion.h1>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.5em] mb-8">
          Multiplayer Game Protocol v3.1
        </p>
        
        <div className="flex justify-center gap-4">
            <button 
                onClick={triggerJoinFlow}
                className="px-6 py-2 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
            >
                Join with Code
            </button>
        </div>
      </header>

      {/* QUIZ ROYALE */}
      <main className="flex-grow flex flex-col items-center px-6 pb-20">
        <section className="w-full max-w-6xl mb-16">
          <div className="mb-7 text-center"><p className="font-mono text-[10px] uppercase tracking-[.4em] text-cyan-400">Quiz Royale</p><h2 className="mt-2 text-3xl font-black uppercase">Pick a category</h2><button type="button" onClick={() => setShowInfo(QUIZ_ROYALE_GUIDE)} className="mt-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 hover:text-white">How to play</button></div>
          <div className="mx-auto flex w-full max-w-6xl flex-nowrap justify-center gap-5 overflow-x-auto pb-2">
            {QUIZ_CATEGORIES.map((category) => (
              <button key={category.id} type="button" onClick={() => triggerCreateFlow("quiz_royale", category.id)} className="size-48 shrink-0 sm:size-52 rounded-[2rem] border border-white/10 bg-zinc-900 p-4 text-center text-xl font-black uppercase tracking-wide transition-colors hover:border-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                <span className="block text-3xl">{category.icon}</span><span className="mt-4 block">{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="w-full max-w-6xl border-t border-white/10 pt-12">
          <div className="mb-7 text-center"><p className="font-mono text-[10px] uppercase tracking-[.4em] text-fuchsia-300">Brain Arcade</p><h2 className="mt-2 text-3xl font-black uppercase">Words and logic</h2></div>
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
                <span className="text-cyan-500 font-mono text-[10px] uppercase tracking-[0.4em]">Multiplayer Protocol</span>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white mt-2">{showInfo.name} Guide</h2>
              </div>

              <div className="grid gap-6">
                <div className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                  <Target className="text-cyan-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">How to Play</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">{showInfo.instructions.howToPlay}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                  <Users className="text-purple-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Multiplayer Mechanics</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed">{showInfo.instructions.multiplayer}</p>
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
                className="absolute top-6 right-8 text-zinc-500 hover:text-white font-mono disabled:opacity-50"
                disabled={isLoading}
              >
                [X]
              </button>

              <h2 className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-6 text-center">
                {isJoining ? "Sector Ingress" : `Identity Verification: ${selectedGame === "quiz_royale" ? `Quiz Royale · ${selectedQuizCategory}` : selectedGame.toUpperCase()}`}
              </h2>
              
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
                      onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-cyan-400 focus:outline-none focus:border-cyan-500 font-black text-center tracking-[0.5em]"
                    />
                )}

                <button
                    onClick={() => handleLaunch(isJoining ? "JOIN" : "START")}
                    disabled={isLoading}
                    className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-500 transition-all uppercase tracking-widest text-sm"
                >
                    {isLoading ? "SYNCHRONIZING..." : isJoining ? "Enter Arena" : "Create New Room"}
                </button>

                {!isLoading && (
                    <button
                        onClick={() => setIsJoining(!isJoining)}
                        className="w-full text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                        {isJoining ? "Back to Create Room" : "Or Join Existing Room"}
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
            <h2 className="text-zinc-400 font-mono text-[11px] uppercase tracking-[0.3em] mb-6">Search Engine Protocol // Indexing Data</h2>
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
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Twitter / X</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Discord</a></li>
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
