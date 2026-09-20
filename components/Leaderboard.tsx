"use client";

import React from "react";
import { motion } from "framer-motion";

type LeaderboardPlayer = {
  id?: string;
  name?: string;
  score?: number;
  stats?: { timeElapsedSeconds?: number; tries?: number; totalResponseTimeMillis?: number; strikes?: number };
};

export default function Leaderboard({ scoreBoard, localPlayerName, gameType, activePlayerId }: { scoreBoard: LeaderboardPlayer[]; localPlayerName?: string | null; gameType: string; activePlayerId?: string }) {
  const players = Array.isArray(scoreBoard) ? [...scoreBoard] : [];

  const formatTime = (s: number) => {
    if (!s) return "0s";
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s % 60}s`;
  };

  return (
    <div className="flex flex-col h-full p-4 bg-black/20">
      <h2 className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-500 mb-4 pb-2 border-b border-white/5">
        Live Standings
      </h2>
      <div className="space-y-2 overflow-y-auto custom-scrollbar">
        {players.map((p: LeaderboardPlayer, index) => {
          const playerName = p.name || "Anonymous";
          const isLocal = playerName === localPlayerName;
          const isActiveTurn = gameType === "QUIZ_ROYALE" && String(p.id) === String(activePlayerId);

          return (
            <motion.div
              key={p.id || index}
              className={`px-3 py-2 rounded-lg border transition-colors ${isActiveTurn ? "bg-amber-400/10 border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,.12)]" : isLocal ? "bg-cyan-500/10 border-cyan-500/30" : "bg-white/5 border-white/5"}`}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-600">#{index + 1}</span>
                  <span className="text-[11px] font-bold uppercase truncate max-w-[80px]">
                    {playerName}
                  </span>
                  {isActiveTurn && <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-black">Turn</span>}
                </div>
                <span className="text-[9px] font-mono text-zinc-500">
                  {formatTime(p.stats?.timeElapsedSeconds || 0)}
                </span>
              </div>

              {/* DYNAMIC RENDERING BLOCK */}
              <div className="flex justify-between items-center">
                {gameType === "SUDOKU" ? (
                  <div className="text-xs font-black text-cyan-400">
                    {Math.trunc(p.score || 0)}% Progress
                  </div>
                ) : gameType === "DOBBLE" ? (
                  <div className="flex gap-2">
                    <span className="text-xs font-black text-emerald-500">{p.score || 0} Matches</span>
                    <span className="text-xs font-black text-zinc-400">{((p.stats?.totalResponseTimeMillis || 0) / 1000).toFixed(2)}s</span>
                  </div>
                ) : gameType === "QUIZ_ROYALE" ? (
                  <div className="flex gap-2">
                    <span className="text-xs font-black text-emerald-500">{p.score || 0} Points</span>
                    <span className="text-xs font-black text-zinc-400">{p.stats?.strikes || 0} Strikes</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <span className="text-xs font-black text-emerald-500">{p.score || 0} Solved</span>
                    <span className="text-xs font-black text-zinc-400">{p.stats?.tries || 0} Tries</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
