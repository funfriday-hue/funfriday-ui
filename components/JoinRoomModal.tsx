"use client";

import React from "react";
import { Users, ShieldCheck, ArrowRight } from "lucide-react";

interface WaitingRoomProps {
  roomId: string;
  players: string[]; // Keeping your array of strings
  scoreBoard: Record<string, any>; // Adding this to check for Host status
  isHost: boolean;
  onStart: () => void;
}

export default function WaitingRoom({ roomId, players, scoreBoard, isHost, onStart }: WaitingRoomProps) {
  const playerCount = players?.length || 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-white p-4 font-sans">
      <div className="bg-zinc-950 border border-zinc-800 rounded-[40px] p-8 md:p-12 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-[100px] rounded-full" />
        
        <header className="relative z-10">
          <h2 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4">
            Secure Entry Room
          </h2>
          <div className="inline-flex items-center justify-center px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-2xl mb-8">
            <h1 className="text-4xl font-black tracking-tighter text-white">
              {roomId}
            </h1>
          </div>
        </header>

        <div className="relative z-10 space-y-3 mb-10 text-left">
          <div className="flex items-center justify-between mb-4 px-1">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Users size={12} className="text-cyan-500" />
              Players Connected
            </p>
            <span className="text-cyan-500 font-mono font-bold text-xs bg-cyan-500/10 px-2 py-0.5 rounded-md">
              {playerCount}
            </span>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {players.map((p) => {
              // Accessing host status from the scoreboard object provided by RoomPage
              const isPlayerHost = scoreBoard[p]?.host === true;

              return (
                <div 
                  key={p} 
                  className={`group relative bg-zinc-900/50 border border-zinc-800/50 px-5 py-4 rounded-2xl flex justify-between items-center transition-all hover:border-zinc-700 ${
                    isPlayerHost ? "bg-zinc-900 border-zinc-700/50 shadow-inner" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isPlayerHost ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-zinc-700'}`} />
                    <span className="font-black text-sm tracking-tight uppercase group-hover:text-cyan-400 transition-colors">
                      {p}
                    </span>
                  </div>
                  
                  {isPlayerHost && (
                    <div className="flex items-center gap-1.5 bg-cyan-500 text-black px-2.5 py-1 rounded-lg">
                      <ShieldCheck size={10} strokeWidth={3} />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Host</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 pt-4 border-t border-zinc-900">
          {isHost ? (
            <button
              onClick={onStart}
              disabled={playerCount === 0}
              className="group w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-cyan-400 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-xl"
            >
              Start Mission
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
                Awaiting Host Authorization
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}