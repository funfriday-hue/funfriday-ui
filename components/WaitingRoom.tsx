"use client";

import React, { useEffect, useState } from "react";
import { Users, ShieldCheck, ArrowRight } from "lucide-react";
import Cookies from "js-cookie";

interface WaitingRoomProps {
  roomId: string;
  players: string[];
  scoreBoard: Record<string, any>;
  isHost: boolean;
  onStart: () => void;
}

export default function WaitingRoom({ roomId, players, scoreBoard, isHost, onStart }: WaitingRoomProps) {
  const [cookieId, setCookieId] = useState<string | undefined>(undefined);
  const playerCount = players?.length || 0;

  useEffect(() => {
    const id = Cookies.get("playerId");
    console.log("Current Player ID from Cookie:", id);
    setCookieId(id);
  }, []);

  // Determine host status: 
  // 1. Is the isHost prop true? 
  // 2. Or does the ID in our cookie match an entry in the scoreboard marked as host?
  const amIActuallyHost = isHost || (cookieId && scoreBoard[cookieId]?.player?.host === true);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-white p-4 font-sans">
      <div className="bg-zinc-950 border border-zinc-800 rounded-[40px] p-8 md:p-12 w-full max-w-md shadow-2xl text-center relative overflow-hidden">
        
        <header className="relative z-10">
          <h2 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4">Secure Entry Room</h2>
          <div className="inline-flex items-center justify-center px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-2xl mb-8">
            <h1 className="text-4xl font-black tracking-tighter text-white">{roomId}</h1>
          </div>
        </header>

        <div className="relative z-10 space-y-3 mb-10 text-left">
          <div className="flex items-center justify-between mb-4 px-1">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Users size={12} className="text-cyan-500" /> Players Connected
            </p>
            <span className="text-cyan-500 font-mono font-bold text-xs bg-cyan-500/10 px-2 py-0.5 rounded-md">{playerCount}</span>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {players.map((pId) => {
              const playerStat = scoreBoard[pId];
              const displayName = playerStat?.player?.name || "Joining...";
              const isThisPlayerHost = playerStat?.player?.host === true;
              const isMe = pId === cookieId;

              return (
                <div 
                  key={pId} 
                  className={`group bg-zinc-900/50 border px-5 py-4 rounded-2xl flex justify-between items-center transition-all 
                    ${isThisPlayerHost ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800/50"}
                    ${isMe ? "ring-1 ring-white/10" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isThisPlayerHost ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                    <span className="font-black text-sm uppercase group-hover:text-cyan-400 transition-colors">
                      {displayName} {isMe && <span className="text-[10px] text-zinc-500 lowercase italic ml-1">(you)</span>}
                    </span>
                  </div>
                  {isThisPlayerHost && (
                    <div className="flex items-center gap-1.5 bg-emerald-500 text-black px-2.5 py-1 rounded-lg">
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
          {amIActuallyHost ? (
            <button
              onClick={onStart}
              className="group w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-emerald-400 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 active:scale-95 shadow-xl"
            >
              Start Mission <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Awaiting Host Authorization</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}