"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

// Exported utility so Wordle.tsx, Sudoku.tsx, etc., can import it instead of duplicating code
export const formatTimeElapsed = (totalSeconds: number | undefined | null): string => {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds)) {
    return "0 sec";
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes} min ${seconds} sec`;
  }
  return `${seconds} sec`;
};

interface ResultModalProps<T> {
  isOpen: boolean;
  title?: string;
  players: T[];
  localPlayerName: string;
  localPlayerId: string;
  renderStats: (player: T, isTimeAttack?: boolean) => React.ReactNode;
  isTimeAttack?: boolean; 
  targetWord?: string;
  myStatus?: any; 
  children?: React.ReactNode;
  sidePanel?: React.ReactNode;
  adSlot?: React.ReactNode;
  onRestart?: () => void;
  restartLabel?: string;
}

// Broadened generic constraints to gracefully absorb both nested or flat player models
export default function ResultModal<T extends { 
  id?: string | number;
  status?: string; 
  playerName?: string; 
  name?: string; 
  player?: { name: string } 
}>({
  isOpen,
  title = "Match Over",
  players,
  localPlayerName,
  localPlayerId,
  renderStats,
  isTimeAttack = false,
  targetWord, // 👈 Destructured targetWord
  children,
  sidePanel,
  adSlot,
  onRestart,
  restartLabel = "Restart match"
}: ResultModalProps<T>) {

  // Auto-detect if the local player failed from the incoming players data array
  const didLocalPlayerFail = players.some(
    (p) => String(p.id) === String(localPlayerId) && (p.status === "FAILED" || p.status === "GIVEN_UP")
  );

  const playerStandings = (
    <div className={`${sidePanel ? "flex-1 space-y-2 overflow-y-auto pr-2 no-scrollbar" : "max-h-[45vh] space-y-3 overflow-y-auto pr-2 no-scrollbar"}`}>
      {players.map((stat, idx) => {
        // Normalize attribute lookup strategies for flat vs nested payload schemas
        const name = stat.playerName || stat.name || stat.player?.name || "Player";
        const isLocal = String(stat.id) === String(localPlayerId);
        const isOriginalSuccess = stat.status === "COMPLETED";
        const isOriginalFailed = stat.status === "FAILED" || stat.status === "GIVEN_UP";

        const boxStyles = isLocal 
          ? (isOriginalSuccess ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
            : isOriginalFailed ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 bg-white/5')
          : 'border-white/5 bg-white/5';

        return (
          <motion.div 
            key={idx} 
            initial={{ x: -10, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            className={`flex items-center justify-between rounded-xl border transition-all ${sidePanel ? "px-3 py-2.5" : "p-4"} ${boxStyles}`}
          >
            <div className={`${sidePanel ? "text-sm" : ""} font-black uppercase tracking-tight text-white select-none`}>
              {name}
              {isLocal && <span className="ml-2 text-[8px] font-mono text-zinc-500 underline">You</span>}
            </div>
            <div className="text-right">
              {renderStats(stat, isTimeAttack)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const actions = (
    <div className={sidePanel ? "mt-6 grid gap-3 sm:grid-cols-2" : ""}>
      {onRestart && (
        <button
          onClick={onRestart}
          className={`w-full rounded-xl bg-cyan-400 py-4 text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-300 ${sidePanel ? "" : "mb-3"}`}
        >
          {restartLabel}
        </button>
      )}

      <button 
        onClick={() => window.location.href = '/'} 
        className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-500 transition-all uppercase tracking-widest text-sm"
      >
        Return to Home
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <Link href="/" aria-label="Return to FunFriday home" className="absolute left-5 top-5 transition-transform hover:scale-105 active:scale-95">
            <Image
              src="/logo.png"
              alt="FunFriday"
              width={90}
              height={90}
              className="h-auto w-16 drop-shadow-2xl md:w-20"
              priority
            />
          </Link>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className={`max-h-[92dvh] w-full overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl ${sidePanel ? "flex h-[calc(100dvh-3rem)] max-w-[calc(100vw-3rem)] flex-col" : "max-w-md"}`}
          >
            <h2 className={`text-3xl font-black text-center italic text-white uppercase tracking-tighter ${didLocalPlayerFail && targetWord ? 'mb-4' : 'mb-8'}`}>
              {title}
            </h2>
            
            {/* TARGET WORD REVEAL PANEL */}
            {didLocalPlayerFail && targetWord && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-center"
              >
                <p className="text-[9px] text-zinc-500 font-mono tracking-[0.3em] uppercase mb-1.5">
                  The word was
                </p>
                <div className="inline-block bg-rose-500/10 border border-rose-500/20 px-6 py-2.5 rounded-2xl">
                  <span className="text-rose-500 font-mono text-2xl font-black tracking-[0.25em] uppercase pl-[0.25em]">
                    {targetWord.toUpperCase()}
                  </span>
                </div>
              </motion.div>
            )}
            
            {sidePanel ? (
              <>
              <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(320px,5fr)_minmax(480px,7fr)]">
                <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[.03] p-5">
                  {playerStandings}
                  {adSlot && <div className="mt-4 shrink-0 border-t border-white/10 pt-4">{adSlot}</div>}
                </section>
                <aside className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-white/[.03] p-5">{sidePanel}</aside>
              </div>
              {actions}
              </>
            ) : (
              <>
                <div className="mb-10">{playerStandings}</div>
                {children}
                {actions}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
