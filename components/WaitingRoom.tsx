"use client";

import React, { useEffect, useState } from "react";
import { Users, ShieldCheck, ArrowRight, Sliders, Zap, Award, Flame, Timer, Gauge, Skull } from "lucide-react";
import Cookies from "js-cookie";

interface WaitingRoomProps {
  roomId: string;
  roomType: string;
  players: string[];
  playerMap: Record<string, any>;
  scoreBoard: Record<string, any>;
  isHost: boolean;
  onStart: (config: { gameMode: string; genericProperties: Record<string, any> }) => void;
}

export default function WaitingRoom({ roomId, roomType, players, playerMap, scoreBoard, isHost, onStart }: WaitingRoomProps) {
  const [cookieId, setCookieId] = useState<string | undefined>(undefined);
  
  // State configurations for the 6-way layout grids
  const [wordleMode, setWordleMode] = useState("WORD_5");
  const [sudokuPreset, setSudokuPreset] = useState("MEDIUM_3");

  const playerCount = players?.length || 0;

  useEffect(() => {
    const id = Cookies.get("playerId");
    setCookieId(id);
  }, []);

  const amIActuallyHost = isHost || 
    (cookieId && (playerMap[cookieId]?.host === true || scoreBoard[cookieId]?.player?.host === true));

  const handleLaunchClick = () => {
    if (roomType === "SUDOKU") {
      // Mapping the 6 specialized Sudoku preset cards back to distinct parameters
      let difficulty = "MEDIUM";
      let hints = 3;

      if (sudokuPreset === "EASY_5") { difficulty = "EASY"; hints = 5; }
      else if (sudokuPreset === "EASY_3") { difficulty = "EASY"; hints = 3; }
      else if (sudokuPreset === "MEDIUM_3") { difficulty = "MEDIUM"; hints = 3; }
      else if (sudokuPreset === "HARD_2") { difficulty = "HARD"; hints = 2; }
      else if (sudokuPreset === "EXPERT_1") { difficulty = "HARD"; hints = 1; }
      else if (sudokuPreset === "EXTREME_0") { difficulty = "HARD"; hints = 0; }

      onStart({
        gameMode: "BOARDS_LIMIT",
        genericProperties: { difficulty, startingHints: hints }
      });
    } else {
      onStart({
        gameMode: wordleMode,
        genericProperties: { dictionaryLanguage: "EN" }
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-white p-4 font-sans">
      <div className="bg-zinc-950 border border-zinc-800 rounded-[40px] p-8 md:p-12 w-full max-w-xl shadow-2xl text-center relative overflow-hidden">
        
        <header className="relative z-10">
          <h2 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4">Secure Entry Room</h2>
          <div className="inline-flex items-center justify-center px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-2xl mb-6">
            <h1 className="text-4xl font-black tracking-tighter text-white">{roomId}</h1>
          </div>
        </header>

        {/* LOBBY HOST INTERFACE */}
        {amIActuallyHost && (
          <div className="relative z-10 bg-zinc-900/20 border border-white/5 rounded-3xl p-5 mb-6 text-left backdrop-blur-md">
            <div className="flex items-center gap-2 text-zinc-500 mb-4 border-b border-white/5 pb-2">
              <Sliders size={12} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Configuration Matrix</span>
            </div>

            {roomType === "SUDOKU" ? (
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-black mb-2">Select Grid Parameters</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "EASY_5", title: "Casual Sprint", sub: "Easy Diff • 5 Hints", icon: <Award size={12} /> },
                    { id: "EASY_3", title: "Standard Easy", sub: "Easy Diff • 3 Hints", icon: <Zap size={12} /> },
                    { id: "MEDIUM_3", title: "Balanced Match", sub: "Med Diff • 3 Hints", icon: <Gauge size={12} /> },
                    { id: "HARD_2", title: "Tactical Play", sub: "Hard Diff • 2 Hints", icon: <Timer size={12} /> },
                    { id: "EXPERT_1", title: "Expert Run", sub: "Hard Diff • 1 Hint", icon: <Flame size={12} /> },
                    { id: "EXTREME_0", title: "Pure Hardcore", sub: "Hard Diff • 0 Hints", icon: <Skull size={12} /> },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSudokuPreset(preset.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 relative overflow-hidden ${
                        sudokuPreset === preset.id 
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                          : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[11px] font-black uppercase tracking-tight leading-tight">{preset.title}</span>
                        <span className={sudokuPreset === preset.id ? "text-emerald-400" : "text-zinc-600"}>{preset.icon}</span>
                      </div>
                      <p className="text-[8px] font-medium text-zinc-500 uppercase tracking-tighter mt-1">{preset.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // WORDLE 6-OPTION CONFIGURATION MATRIX
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-black mb-2">Select Match Preset</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "WORD_3", title: "3-Word Race", sub: "First to 3 clears", icon: <Zap size={12} /> },
                    { id: "WORD_5", title: "5-Word Race", sub: "Tournament pool", icon: <Award size={12} /> },
                    { id: "WORD_10", title: "10-Word Marathon", sub: "Extended grid", icon: <Skull size={12} /> },
                    { id: "TIME_2", title: "2 Min Sprint", sub: "Ultra speed run", icon: <Gauge size={12} /> },
                    { id: "TIME_3", title: "3 Min Blitz", sub: "Time crunch match", icon: <Timer size={12} /> },
                    { id: "TIME_5", title: "5 Min Endurance", sub: "Stamina fatigue", icon: <Flame size={12} /> }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setWordleMode(mode.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 relative overflow-hidden ${
                        wordleMode === mode.id 
                          ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
                          : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[11px] font-black uppercase tracking-tight leading-tight">{mode.title}</span>
                        <span className={wordleMode === mode.id ? "text-amber-400" : "text-zinc-600"}>{mode.icon}</span>
                      </div>
                      <p className="text-[8px] font-medium text-zinc-500 uppercase tracking-tighter mt-1">{mode.sub}</p>
                    </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONNECTED PLAYERS CONTAINER PANEL */}
        <div className="relative z-10 space-y-3 mb-8 text-left">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Users size={12} className="text-cyan-500" /> Operatives Connected
            </p>
            <span className="text-cyan-500 font-mono font-bold text-xs bg-cyan-500/10 px-2 py-0.5 rounded-md">{playerCount}</span>
          </div>

          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
            {players.map((pId) => {
              const playerDetail = playerMap[pId] || scoreBoard[pId]?.player;
              const displayName = playerDetail?.name || "Joining...";
              const isThisPlayerHost = playerDetail?.host === true;
              const isMe = pId === cookieId;

              return (
                <div 
                  key={pId} 
                  className={`group bg-zinc-900/40 border px-5 py-3 rounded-2xl flex justify-between items-center transition-all 
                    ${isThisPlayerHost ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800/40"}
                    ${isMe ? "ring-1 ring-white/5" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${isThisPlayerHost ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                    <span className="font-black text-xs uppercase tracking-wide text-zinc-300 group-hover:text-cyan-400 transition-colors">
                      {displayName} {isMe && <span className="text-[10px] text-zinc-500 lowercase italic ml-1">(you)</span>}
                    </span>
                  </div>
                  {isThisPlayerHost && (
                    <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      <ShieldCheck size={9} strokeWidth={3} />
                      <span className="text-[8px] font-black uppercase tracking-wider">Host</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="relative z-10 pt-4 border-t border-zinc-900">
          {amIActuallyHost ? (
            <button
              onClick={handleLaunchClick}
              className="group w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-emerald-400 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 active:scale-95 shadow-xl"
            >
              Initialize Match <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2.5 py-2">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Awaiting Host Authorization</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}