"use client";

import { motion, AnimatePresence } from 'framer-motion';

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
  targetWord?: string; // 👈 Added targetWord prop
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
  targetWord // 👈 Destructured targetWord
}: ResultModalProps<T>) {

  // Auto-detect if the local player failed from the incoming players data array
  const didLocalPlayerFail = players.some(
    (p) => String(p.id) === String(localPlayerId) && (p.status === "FAILED" || p.status === "GIVEN_UP")
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-zinc-950 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl"
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
            
            <div className="space-y-3 mb-10 max-h-[45vh] overflow-y-auto pr-2 no-scrollbar">
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
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${boxStyles}`}
                  >
                    <div className="font-black uppercase tracking-tight text-white select-none">
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

            <button 
              onClick={() => window.location.href = '/'} 
              className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-500 transition-all uppercase tracking-widest text-sm"
            >
              Return to Lobby
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}