"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Users, ArrowRight, Sliders, Copy, Check, Info, X } from "lucide-react";

interface GameModeOption {
  modeId: string;
  displayName: string;
}

interface WaitingRoomProps {
  roomData: any; 
  currentPlayerId: string;
  stompClient: any;
}

const FALLBACK_MODES: Record<string, GameModeOption[]> = {
  WORDLE: [
    { modeId: "WORD_3", displayName: "3-Word Race" },
    { modeId: "WORD_5", displayName: "5-Word Race" },
    { modeId: "WORD_10", displayName: "10-Word Marathon" },
    { modeId: "TIME_2", displayName: "2 Min Sprint" },
    { modeId: "TIME_3", displayName: "3 Min Blitz" },
    { modeId: "TIME_5", displayName: "5 Min Endurance" }
  ],
  SUDOKU: [
    { modeId: "SUDOKU_9X9", displayName: "9x9 Classic Sudoku" },
    { modeId: "SUDOKU_6X6", displayName: "6x6 Mini Sudoku" }
  ],
  DOBBLE: [
    { modeId: "PAIR_RUSH", displayName: "Pair Rush · 25 Rounds" },
    { modeId: "TRIPLE_HUNT", displayName: "Triple Hunt · 12 Rounds" }
  ],
  QUIZ_ROYALE: [
    { modeId: "CRICKET", displayName: "Cricket" },
    { modeId: "FOOTBALL", displayName: "Football" },
    { modeId: "BOLLYWOOD", displayName: "Bollywood" },
    { modeId: "WWE", displayName: "WWE" }
  ]
};

export default function WaitingRoom({
  roomData,
  currentPlayerId,
  stompClient
}: WaitingRoomProps) {
  
  const [selectedModeId, setSelectedModeId] = useState<string>("");
  const [strikeLimit, setStrikeLimit] = useState(2);
  const [quizPlayMode, setQuizPlayMode] = useState<"ALL_PLAY" | "ROUND_ROBIN">("ROUND_ROBIN");
  const [turnSeconds, setTurnSeconds] = useState(60);
  const [questionCount, setQuestionCount] = useState(1);
  const [copied, setCopied] = useState(false);

  // Safely grab the room payload root
  const actualRoom = roomData?.room || roomData?.gameState || roomData?.data || roomData;
  const roomId = actualRoom?.roomId || "";
  const roomType = actualRoom?.type || actualRoom?.gameType || "WORDLE";
  
  // Normalize player list from incoming stream structures
  const structuralPlayers = actualRoom?.players || actualRoom?.playerMap || {};
  const playersArray: any[] = useMemo(() => {
    return Array.isArray(structuralPlayers) 
      ? structuralPlayers 
      : Object.values(structuralPlayers);
  }, [structuralPlayers]);

  // Extract explicit host definition directly from your backend addition
  const hostId = actualRoom?.host?.id || actualRoom?.host;

  // Verify host privileges cleanly by comparing direct IDs
  const amIActuallyHost = useMemo(() => {
    if (!currentPlayerId) return false;
    if (hostId && hostId === currentPlayerId) return true;

    const currentLocalPlayer = playersArray.find((p: any) => p.id === currentPlayerId || p.playerId === currentPlayerId);
    return currentLocalPlayer?.host === true || currentLocalPlayer?.isHost === true;
  }, [hostId, currentPlayerId, playersArray]);

  // Handle available configuration presets gracefully
  const modes: GameModeOption[] = useMemo(() => {
    if (actualRoom?.availableModes && actualRoom.availableModes.length > 0) return actualRoom.availableModes;
    return FALLBACK_MODES[roomType] || FALLBACK_MODES["WORDLE"];
  }, [actualRoom, roomType]);

  const playerCount = playersArray.length;

  useEffect(() => {
    if (roomType === "QUIZ_ROYALE" && actualRoom?.initialGameMode) {
      setSelectedModeId(String(actualRoom.initialGameMode).toUpperCase());
      return;
    }
    if (modes.length > 0 && !selectedModeId) {
      setSelectedModeId(modes[0].modeId);
    }
  }, [actualRoom?.initialGameMode, modes, roomType, selectedModeId]);

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchClick = () => {
    if (!amIActuallyHost || !stompClient || !roomId) return;

    stompClient.publish({
      destination: `/app/game/${roomId}/start`,
      body: JSON.stringify({
        gameMode: selectedModeId,
        genericProperties: roomType === "QUIZ_ROYALE" ? { strikeLimit, playMode: quizPlayMode, turnSeconds, questionCount } : {}
      })
    });
  };

  const handleKickPlayer = (playerId: string, playerName: string) => {
    if (!amIActuallyHost || !stompClient || !roomId) return;
    if (!window.confirm(`Remove ${playerName} from this room?`)) return;
    stompClient.publish({
      destination: `/app/game/${roomId}/kick`,
      body: JSON.stringify({ playerId }),
    });
  };

  if (!actualRoom || (!roomType && roomId === "")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">
        Synchronizing Matrix Lobby...
      </div>
    );
  }

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-start py-6 px-4 text-white font-sans">
      <div className="bg-zinc-950 border border-zinc-800 rounded-[40px] p-8 md:p-12 w-full max-w-xl shadow-2xl text-center relative overflow-hidden">
        
        <header className="relative z-10">
          <h2 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4">{roomType} ARENA LOBBY</h2>
          
          <div className="inline-flex items-center justify-center gap-3 pl-6 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-2xl mb-6 group/code">
            <h1 className="text-4xl font-black tracking-tighter text-white font-mono">{roomId}</h1>
            <button 
              onClick={handleCopyCode}
              type="button"
              className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-cyan-400 active:scale-90 transition-all"
              title="Copy Room Code"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </header>

        {/* LOBBY HOST CONFIGURATION PANEL */}
        {amIActuallyHost && modes.length > 0 && (
          <div className="relative z-10 bg-zinc-900/20 border border-white/5 rounded-3xl p-5 mb-6 text-left backdrop-blur-md">
            <div className="flex items-center gap-2 text-zinc-500 mb-3 border-b border-white/5 pb-2">
              <Sliders size={12} className="text-cyan-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Configuration Matrix</span>
            </div>

            {roomType !== "QUIZ_ROYALE" && <div>
              <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-black mb-2">Select Match Preset</label>
              <div className="grid grid-cols-2 gap-2">
                {modes.map((mode) => {
                  const isActive = selectedModeId === mode.modeId;
                  return (
                    <button
                      key={mode.modeId}
                      type="button"
                      onClick={() => setSelectedModeId(mode.modeId)}
                      className={`p-3 rounded-xl border text-center transition-all flex items-center justify-center h-12 relative overflow-hidden ${
                        isActive 
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                          : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-tight leading-none">{mode.displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>}

            {roomType === "QUIZ_ROYALE" && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Quiz Royale category</p>
                <p className="mt-1 text-sm font-black uppercase text-cyan-300">{selectedModeId || "Cricket"}</p>
              </div>
            )}

            {roomType === "QUIZ_ROYALE" && (
              <div className="mt-5 border-t border-white/5 pt-4 space-y-5">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-black mb-2">Play mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setQuizPlayMode("ALL_PLAY")} className={`rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-wide transition-all ${quizPlayMode === "ALL_PLAY" ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-zinc-800 bg-zinc-950 text-zinc-500"}`}>
                      <span className="flex items-center justify-center gap-1.5"><span className="group/info relative inline-flex"><Info size={12} aria-label="About All Play" /><span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-52 -translate-x-1/2 rounded-lg border border-white/10 bg-black px-3 py-2 text-left text-[10px] font-medium normal-case tracking-normal text-zinc-200 shadow-xl group-hover/info:block">Everyone can submit answers at the same time. A wrong answer or timeout gives that player a strike.</span></span>All Play</span>
                    </button>
                    <button type="button" onClick={() => setQuizPlayMode("ROUND_ROBIN")} className={`rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-wide transition-all ${quizPlayMode === "ROUND_ROBIN" ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-zinc-800 bg-zinc-950 text-zinc-500"}`}>
                      <span className="flex items-center justify-center gap-1.5"><span className="group/info relative inline-flex"><Info size={12} aria-label="About Round Robin" /><span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-52 -translate-x-1/2 rounded-lg border border-white/10 bg-black px-3 py-2 text-left text-[10px] font-medium normal-case tracking-normal text-zinc-200 shadow-xl group-hover/info:block">Players answer one at a time in order. A wrong answer, pass, or timeout gives the active player a strike.</span></span>Round Robin</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-black mb-2">Questions</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((count) => (
                      <button key={count} type="button" onClick={() => setQuestionCount(count)} className={`h-10 w-10 rounded-xl border text-xs font-black transition-all ${questionCount === count ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-zinc-800 bg-zinc-950 text-zinc-500"}`}>{count}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-black mb-2">Strikes before elimination</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button key={count} type="button" onClick={() => setStrikeLimit(count)} className={`h-10 w-10 rounded-xl border text-xs font-black transition-all ${strikeLimit === count ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-zinc-800 bg-zinc-950 text-zinc-500"}`}>{count}</button>
                  ))}
                </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-black mb-2">Answer time</label>
                  <div className="flex flex-wrap gap-2">
                    {[10, 30, 60, 300].map((seconds) => (
                      <button key={seconds} type="button" onClick={() => setTurnSeconds(seconds)} className={`rounded-xl border px-3 py-2 text-xs font-black transition-all ${turnSeconds === seconds ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-zinc-800 bg-zinc-950 text-zinc-500"}`}>{seconds === 300 ? "5 min" : `${seconds}s`}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OPERATIVES ROSTER */}
        <div className="relative z-10 space-y-3 mb-8 text-left">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Users size={12} className="text-cyan-500" /> Operatives Connected
            </p>
            <span className="text-cyan-500 font-mono font-bold text-xs bg-cyan-500/10 px-2 py-0.5 rounded-md">{playerCount}</span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
            {playersArray.map((player: any) => {
              const pId = player.id || player.playerId;
              const isMe = pId === currentPlayerId;
              
              const isThisPlayerHost = pId === hostId || player.host === true || player.isHost === true;
              const displayName = player.playerName || player.name || "Joining...";
              const isConnected = player.connected !== false;

              return (
                <div 
                  key={pId} 
                  className={`group bg-zinc-900/40 border px-5 py-3 rounded-2xl flex justify-between items-center transition-all 
                    ${isThisPlayerHost ? "border-cyan-500/20 bg-cyan-500/5" : "border-zinc-800/40"}
                    ${isMe ? "ring-1 ring-white/5" : ""}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${isConnected ? (isThisPlayerHost ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-zinc-700') : 'bg-rose-400'}`} />
                    {!isConnected && <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-rose-300">Not connected</span>}
                    <span className="font-black text-xs uppercase tracking-wide text-zinc-300 group-hover:text-cyan-400 transition-colors">
                      {displayName} {isMe && <span className="text-[10px] text-zinc-500 lowercase italic ml-1">(you)</span>}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                  {amIActuallyHost && !isThisPlayerHost && (
                    <button type="button" onClick={() => handleKickPlayer(pId, displayName)} className="rounded-md border border-rose-400/30 p-1 text-rose-300 transition-colors hover:bg-rose-400/10" title={`Remove ${displayName}`} aria-label={`Remove ${displayName}`}>
                      <X size={12} />
                    </button>
                  )}
                  {isThisPlayerHost && (
                    <div className="flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                      <span className="text-[8px] font-black uppercase tracking-wider">Host</span>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTION / COOLDOWN DISPATCH BAR */}
        <div className="relative z-10 pt-4 border-t border-zinc-900">
          {amIActuallyHost ? (
            <button
              onClick={handleLaunchClick}
              className="group w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-400 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 active:scale-95 shadow-xl"
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
