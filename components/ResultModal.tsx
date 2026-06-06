"use client";

import { motion, AnimatePresence } from 'framer-motion';

interface ResultModalProps<T> {
  isOpen: boolean;
  title?: string;
  players: T[]; // These should be the stat objects from the scoreboard
  localPlayerName: string;
  renderStats: (player: T, isTimeAttack?: boolean) => React.ReactNode;
  isTimeAttack?: boolean; // New optional property to track game context
}

export default function ResultModal<T extends { player: { name: string }, status: string }>({
  isOpen,
  title = "Match Over",
  players,
  localPlayerName,
  renderStats,
  isTimeAttack = false
}: ResultModalProps<T>) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
            className="bg-zinc-950 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl"
          >
            <h2 className="text-3xl font-black text-center mb-8 italic text-white uppercase tracking-tighter">{title}</h2>
            
            <div className="space-y-3 mb-10 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {players.map((stat, idx) => {
                const name = stat.player?.name || "Player";
                const isLocal = name === localPlayerName;
                const isSuccess = stat.status === "COMPLETED";
                const isFailed = stat.status === "FAILED" || stat.status === "GIVEN_UP";

                const boxStyles = isLocal 
                  ? (isSuccess ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                    : isFailed ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 bg-white/5')
                  : 'border-white/5 bg-white/5';

                return (
                  <motion.div 
                    key={idx} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${boxStyles}`}
                  >
                    <div className="font-black uppercase tracking-tight text-white select-none">
                      {name}
                      {isLocal && <span className="ml-2 text-[8px] font-mono text-zinc-500 underline">You</span>}
                    </div>
                    <div className="text-right">{renderStats(stat, isTimeAttack)}</div>
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