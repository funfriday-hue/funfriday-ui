"use client";

import React, { useState, useEffect, useRef } from "react";
import { RotateCcw, Eraser, StickyNote, Flag, LayoutGrid, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SudokuProps {
  publicState: any;
  privateState: any;
  playerName: string;
  playerId: string; 
  stompClient: any;
  roomId: string;
}

export default function Sudoku({ publicState, privateState, playerName, playerId, stompClient, roomId }: SudokuProps) {
  const [localBoard, setLocalBoard] = useState<number[][]>([]);
  const [notesMode, setNotesMode] = useState(false);
  const [notes, setNotes] = useState<Record<string, number[]>>({});
  const [focusedCell, setFocusedCell] = useState<string | null>("0-0");
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  
  const lastKnownProgress = useRef(0);
  const isInternalChange = useRef(false);

  const playersList = publicState?.players || [];
  const publicGameData = publicState?.gameSpecificPublicData || {};
  const privateGameData = privateState?.privateGameData || {};
  
  const mySelf = privateState?.self || playersList.find((p: any) => p.id === playerId) || {};
  const myProgress = mySelf?.stats?.percentSolved ?? mySelf?.progress ?? 0;
  
  useEffect(() => {
    if (myProgress > 0) lastKnownProgress.current = myProgress;
  }, [myProgress]);

  const myStatus = mySelf?.status || "UNKNOWN"; 
  const isMeFinished = myStatus === "COMPLETED" || myStatus === "GIVEN_UP";
  const size = localBoard.length || 9;

  // FIX: Determine progress to display
  const displayProgress = isMeFinished ? lastKnownProgress.current : myProgress;

  const formatTimeResult = (ms: number) => {
    if (!ms || ms < 0) return "0 sec";
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return mins === 0 ? `${secs} sec` : `${mins}m ${secs}s`;
  };

  useEffect(() => {
    const serverBoard = privateGameData?.playerBoard || privateGameData?.board;
    const initialBoard = privateGameData?.initialBoard || publicGameData?.initialBoard;

    if (serverBoard) {
      isInternalChange.current = true;
      setLocalBoard(serverBoard);
    } else if (initialBoard) {
      isInternalChange.current = true;
      setLocalBoard(JSON.parse(JSON.stringify(initialBoard)));
    }
  }, [publicState, privateState, playerId]);

  const sendAction = (payload: any) => {
    if (stompClient?.connected) {
      stompClient.publish({
        destination: `/app/game/${roomId}/move`,
        body: JSON.stringify({ ...payload }),
      });
    }
  };

  const handleCellChange = (row: number, col: number, value: string) => {
    const initialBoard = privateGameData?.initialBoard || publicGameData?.initialBoard || [];
    if (isMeFinished || initialBoard?.[row]?.[col] !== 0) return;
    
    const val = value.slice(-1);
    const num = parseInt(val);
    const key = `${row}-${col}`;

    if (notesMode && value !== "") {
      if (isNaN(num) || num < 1 || num > size) return;
      const current = notes[key] || [];
      const next = current.includes(num) ? current.filter(n => n !== num) : [...current, num].sort();
      setNotes({ ...notes, [key]: next });
    } else {
      const updated = localBoard.map((rArr, rIdx) => 
        rArr.map((cVal, cIdx) => (rIdx === row && cIdx === col ? (value === "" ? 0 : num) : cVal))
      );
      
      if (value !== "") {
        const updatedNotes = { ...notes };
        delete updatedNotes[key];
        setNotes(updatedNotes);
      }

      setLocalBoard(updated);
      isInternalChange.current = false; 
      sendAction({ type: "SUDOKU_SYNC", board: updated });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMeFinished || !focusedCell || showGiveUpConfirm) return;

      const [r, c] = focusedCell.split("-").map(Number);
      let nextR = r;
      let nextC = c;
      const maxIdx = size - 1;

      if (e.key === "ArrowUp") nextR = r > 0 ? r - 1 : maxIdx;
      else if (e.key === "ArrowDown") nextR = r < maxIdx ? r + 1 : 0;
      else if (e.key === "ArrowLeft") nextC = c > 0 ? c - 1 : maxIdx;
      else if (e.key === "ArrowRight") nextC = c < maxIdx ? c + 1 : 0;
      else if (e.key === "Backspace" || e.key === "Delete") {
        handleCellChange(r, c, "");
      } else if (new RegExp(`^[1-${size}]$`).test(e.key)) {
        handleCellChange(r, c, e.key);
      } else {
        return;
      }

      if (e.key.startsWith("Arrow")) e.preventDefault();
      setFocusedCell(`${nextR}-${nextC}`);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedCell, isMeFinished, notesMode, localBoard, notes, showGiveUpConfirm, size]);

  const confirmGiveUp = () => {
    setShowGiveUpConfirm(false);
    sendAction({ type: "SUDOKU_GIVE_UP" });
  };

  const currentInitialBoard = privateGameData?.initialBoard || publicGameData?.initialBoard;

  if (!currentInitialBoard || !localBoard || localBoard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">
        ⚡ Connecting to Arena Matrix...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-black text-white p-4 font-sans">
      <div className="flex justify-between items-center w-full max-w-[450px] mb-8 mt-4 px-1">
        <div className="flex flex-col gap-1 bg-zinc-900/50 border border-zinc-800 p-3 px-4 rounded-2xl shadow-xl">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid size={12} className="text-cyan-500" /> Progress
          </span>
          <span className="text-2xl font-mono font-black text-white leading-none">
            {Math.trunc(displayProgress)}%
          </span>
        </div>

        {!isMeFinished && (
          <button 
            onClick={() => setShowGiveUpConfirm(true)} 
            className="flex items-center gap-2 px-5 py-3 bg-red-950/20 border border-red-900/30 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
          >
            <Flag size={14} /> Give Up
          </button>
        )}
      </div>

      <div 
        className={`grid border-[3px] border-zinc-700 bg-zinc-900 shadow-2xl transition-all duration-500 
          ${size === 6 ? "grid-cols-6" : "grid-cols-9"} 
          ${isMeFinished ? 'opacity-20 blur-xl pointer-events-none' : ''}`}
      >
        {localBoard.map((row, rIdx) => row.map((cell, cIdx) => {
          const isInitial = currentInitialBoard[rIdx]?.[cIdx] !== 0;
          const key = `${rIdx}-${cIdx}`;
          const isFocused = focusedCell === key;
          
          const colBlockDelimiter = size === 6 ? 3 : 3;
          const rowBlockDelimiter = size === 6 ? 2 : 3;

          const bR = (cIdx + 1) % colBlockDelimiter === 0 && cIdx !== (size - 1) 
            ? "border-r-[3px] border-zinc-700" 
            : "border-r border-zinc-800/50";

          const bB = (rIdx + 1) % rowBlockDelimiter === 0 && rIdx !== (size - 1) 
            ? "border-b-[3px] border-zinc-700" 
            : "border-b border-zinc-800/50";

          return (
            <div 
              key={key} 
              onClick={() => setFocusedCell(key)}
              className={`relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer transition-all duration-75
                ${bR} ${bB} 
                ${isFocused ? (isInitial ? "bg-zinc-700" : "bg-cyan-500 text-black") : (isInitial ? "bg-zinc-800/50" : "bg-black hover:bg-zinc-900")}
              `}
            >
              <span className={`text-xl font-black select-none ${isInitial ? "text-zinc-500" : isFocused ? "text-black" : "text-white"}`}>
                {cell === 0 ? "" : cell}
              </span>

              {cell === 0 && (
                <div className="absolute inset-0 grid grid-cols-3 p-1 pointer-events-none items-center justify-items-center">
                  {Array.from({ length: size }, (_, i) => i + 1).map(n => (
                    <span 
                      key={n} 
                      className={`text-[9px] leading-none tracking-tight transition-colors duration-75
                        ${notes[key]?.includes(n) 
                          ? (isFocused ? "text-white font-black drop-shadow-md" : "text-amber-500/80 font-bold") 
                          : "text-transparent"
                        }`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        }))}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-10 w-full max-w-[450px]">
        <button 
          onClick={() => {
             const [r, c] = (focusedCell || "0-0").split("-").map(Number);
             if (notesMode) {
               const updatedNotes = { ...notes };
               delete updatedNotes[`${r}-${c}`];
               setNotes(updatedNotes);
             } else {
               handleCellChange(r, c, "");
             }
          }} 
          className="flex flex-col items-center gap-2 py-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 active:scale-95 transition-all"
        >
          <Eraser size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest">Erase</span>
        </button>

        <button 
          onClick={() => setNotesMode(!notesMode)} 
          className={`flex flex-col items-center gap-2 py-5 rounded-2xl border transition-all active:scale-95 ${notesMode ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-zinc-900/50 border-zinc-800 text-zinc-400"}`}
        >
          <StickyNote size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest">Notes Mode</span>
        </button>

        <button 
          onClick={() => {
            if(confirm("Reset your entire board?")) {
              setNotes({});
              sendAction({ type: "SUDOKU_RESET" });
            }
          }} 
          className="flex flex-col items-center gap-2 py-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 active:scale-95 transition-all"
        >
          <RotateCcw size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest">Reset</span>
        </button>
      </div>

      <AnimatePresence>
        {showGiveUpConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-red-500/20 p-6 rounded-[32px] text-center max-w-sm w-full shadow-2xl"
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-black uppercase italic text-white tracking-tight mb-2">Abort Assignment?</h3>
              <p className="text-zinc-500 text-xs uppercase font-mono tracking-tight leading-relaxed mb-6">
                Giving up logs your final progress at {Math.trunc(displayProgress)}%. This action cannot be reversed.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowGiveUpConfirm(false)}
                  className="flex-1 py-3.5 bg-zinc-900 border border-zinc-800 text-white font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmGiveUp}
                  className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-95"
                >
                  Give Up
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isMeFinished && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
    <div className="bg-zinc-950 border border-white/10 p-8 rounded-[40px] text-center max-w-md w-full shadow-2xl">
      <h2 className="text-3xl font-black mb-6 uppercase italic text-white tracking-tighter">Protocol Ended</h2>
      <div className="space-y-3 mb-8">
        {[...playersList]
          .sort((a: any, b: any) => {
            const aProgress = a.stats?.percentSolved || 0;
            const bProgress = b.stats?.percentSolved || 0;
            const aTime = a.stats?.timeElapsedSeconds || Infinity;
            const bTime = b.stats?.timeElapsedSeconds || Infinity;

            // 1. Sort by progress DESC (highest first)
            if (bProgress !== aProgress) {
              return bProgress - aProgress;
            }
            // 2. If progress is equal, sort by time ASC (lowest/fastest first)
            return aTime - bTime;
          })
          .map((p: any) => {
            const isLocal = p.id === playerId; // Check if this player is YOU
            const serverProgress = p.stats?.percentSolved ?? p.progress ?? 0;
            const display = isLocal ? lastKnownProgress.current : serverProgress;
            const timeMs = (p.stats?.timeElapsedSeconds || 0) * 1000;

            return (
              <div
                key={p.id}
                className={`flex justify-between items-center p-5 rounded-2xl border ${
                  isLocal 
                    ? "bg-cyan-500/10 border-cyan-500/30" 
                    : "border-white/5 bg-white/5"
                }`}
              >
                <div className="text-left">
                  <div className="text-white font-bold flex items-center gap-2">
                    {p.playerName || p.name}
                    {isLocal && (
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                    <Clock size={10} /> {formatTimeResult(timeMs)}
                  </div>
                </div>
                <span className="text-2xl font-mono font-black text-emerald-400">
                  {Math.trunc(display)}%
                </span>
              </div>
            );
          })}
      </div>
      <button
        onClick={() => (window.location.href = "/")}
        className="w-full py-4 bg-white text-black font-black rounded-xl uppercase text-[10px] tracking-widest"
      >
        Exit to Lobby
      </button>
    </div>
  </div>
)}
    </div>
  );
}