"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ResultModal from '../ResultModal'; 

const MAX_LEVELS = 10;
const MAX_TRIES_PER_WORD = 12;

const KEYBOARD = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
];

interface WordleProps {
  roomId: string;
  playerName: string;
  playerId: string; 
  stompClient: any;
  gameState: any;
}

export default function Wordle({ roomId, playerName, playerId, stompClient, gameState }: WordleProps) {
  const [currentGuess, setCurrentGuess] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. DATA EXTRACTION
  const scoreBoard = gameState?.gameData?.scoreBoard || gameState?.scoreBoard || {};
  const gameData = gameState?.gameData || {};
  const myStats = scoreBoard[playerId] || {};
  const attempts = gameData?.playerAttempts?.[playerId] || [];
  
  const solvedCount = myStats.wordsCleared ?? 0;
  const totalTries = myStats.totalAttempts ?? 0;
  const myStatus = myStats.status; 

  // 2. STATE LOGIC
  const isWordSolved = attempts.length > 0 && 
                        attempts[attempts.length - 1].result?.every((r: string) => r === 'GREEN');
  
  const isPlayerDone = myStatus === "COMPLETED" || myStatus === "FAILED";
  const isGlobalFinished = gameState?.status === "FINISHED" || gameData?.finished;
  const showResultModal = isGlobalFinished || isPlayerDone;

  // 3. SORTING & FORMATTING HELPERS
  const sortedPlayers = Object.values(scoreBoard).sort((a: any, b: any) => {
    if (b.wordsCleared !== a.wordsCleared) return b.wordsCleared - a.wordsCleared;
    if (a.totalAttempts !== b.totalAttempts) return a.totalAttempts - b.totalAttempts;
    return (a.timeInSeconds || 0) - (b.timeInSeconds || 0);
  });

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 4. AUTO-SCROLL EFFECT
  useEffect(() => {
    setCurrentGuess("");
    const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [solvedCount, attempts.length]);

  // 5. INPUT HANDLING
  const handleAction = (key: string) => {
    if (isGlobalFinished || isPlayerDone || isWordSolved) return;

    if (key === "ENTER") {
      if (currentGuess.length === 5) {
        stompClient.publish({
          destination: `/app/game/${roomId}/move`,
          body: JSON.stringify({ 
            type: "WORDLE_GUESS", 
            playerName: playerId, 
            guess: currentGuess.toUpperCase() 
          })
        });
        setCurrentGuess(""); 
      }
    } else if (key === "⌫") {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < 5 && key !== "ENTER") {
      setCurrentGuess(prev => (prev + key).toUpperCase());
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        handleAction("⌫");
      }
      else if (e.key === "Enter") handleAction("ENTER");
      else if (/^[a-zA-Z]$/.test(e.key)) handleAction(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, isGlobalFinished, isPlayerDone, isWordSolved]);

  const getLetterStatus = (letter: string) => {
    let rank = 0; 
    attempts.forEach((att: any) => {
      att.guess.split("").forEach((char: string, i: number) => {
        if (char.toUpperCase() === letter.toUpperCase()) {
          const status = att.result?.[i]; 
          if (status === 'GREEN') rank = Math.max(rank, 3);
          else if (status === 'YELLOW') rank = Math.max(rank, 2);
          else if (status === 'GRAY') rank = Math.max(rank, 1);
        }
      });
    });
    return ["bg-zinc-800 hover:bg-zinc-700", "bg-zinc-900 opacity-40 text-zinc-600", "bg-amber-500 text-black", "bg-emerald-500 text-black"][rank];
  };

  const triggerNextPhase = () => {
    stompClient.publish({
      destination: `/app/game/${roomId}/move`,
      body: JSON.stringify({ type: "NEXT_PHASE", playerName: playerId })
    });
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-2xl mx-auto bg-black text-white overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="p-6 border-b border-white/10 flex justify-between items-end bg-zinc-950/50 backdrop-blur-md">
        <div>
          <p className="text-cyan-500 font-mono text-[10px] tracking-[0.3em] uppercase mb-1">
            {myStatus === "FAILED" ? "PROTOCOL TERMINATED" : `PHASE ${Math.min(solvedCount + 1, MAX_LEVELS)} / ${MAX_LEVELS}`}
          </p>
          <h1 className="text-3xl font-black italic uppercase leading-none tracking-tighter">
            Solved: <span className="text-emerald-500">{solvedCount}</span>
          </h1>
        </div>

        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase font-mono leading-none mb-1">Current</p>
            <p className="text-2xl font-bold text-cyan-500 leading-none tracking-tight">
              {attempts.length}<span className="text-zinc-600 text-xs ml-1">/{MAX_TRIES_PER_WORD}</span>
            </p>
          </div>
          <div className="text-right border-l border-white/10 pl-8">
            <p className="text-[10px] text-zinc-500 uppercase font-mono leading-none mb-1">Total Tries</p>
            <p className="text-2xl font-bold text-white leading-none tracking-tight">{totalTries}</p>
          </div>
        </div>
      </div>

      {/* GAME GRID */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-3 no-scrollbar relative">
        <AnimatePresence mode="wait">
          <motion.div 
            key={solvedCount}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-2"
          >
            {attempts.map((att: any, i: number) => (
              <div key={`row-${i}`} className="flex gap-2">
                {att.guess.split("").map((char: string, j: number) => (
                  <motion.div 
                    key={`${i}-${j}`}
                    initial={{ rotateX: -90 }} animate={{ rotateX: 0 }}
                    transition={{ delay: j * 0.1 }}
                    className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-3xl font-black rounded-xl border-2 transition-colors
                      ${att.result?.[j] === 'GREEN' ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                        att.result?.[j] === 'YELLOW' ? 'bg-amber-500 border-amber-400 text-black' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                  >
                    {char}
                  </motion.div>
                ))}
              </div>
            ))}

            {!isPlayerDone && !isWordSolved && (
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-3xl font-black rounded-xl border-2 transition-all
                    ${currentGuess[i] ? 'border-zinc-400 scale-105 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'border-zinc-800'}`}>
                    {currentGuess[i] || ""}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {isWordSolved && !isPlayerDone && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-10 flex flex-col items-center gap-4 bg-zinc-900/80 p-6 rounded-3xl border border-white/10 backdrop-blur-xl"
          >
             <h2 className="text-xl font-black text-emerald-500 tracking-widest italic uppercase">Phase Clear</h2>
             <button onClick={triggerNextPhase} className="px-10 py-4 bg-white text-black font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-emerald-500 transition-all shadow-2xl active:scale-95">
                Start Next Word
             </button>
          </motion.div>
        )}

        {myStatus === "FAILED" && !isGlobalFinished && (
            <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center max-w-sm">
                <p className="text-red-500 font-black uppercase tracking-widest text-sm">System Failure</p>
                <p className="text-zinc-500 text-[10px] mt-2 uppercase font-mono tracking-tight leading-relaxed">Maximum attempts exceeded. Standing by.</p>
            </div>
        )}

        <div ref={bottomRef} className="h-20" />
      </div>

      {/* KEYBOARD */}
      <div className={`p-4 bg-zinc-950 border-t border-white/5 pb-10 transition-opacity duration-500 ${isWordSolved || isPlayerDone ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex flex-col gap-2 max-w-lg mx-auto">
          {KEYBOARD.map((row, i) => (
            <div key={i} className="flex justify-center gap-1.5">
              {row.map(key => (
                <button key={key} onClick={() => handleAction(key)} className={`h-14 rounded-xl font-black uppercase transition-all active:scale-90 ${key.length > 1 ? 'px-4 text-[10px]' : 'flex-1'} ${getLetterStatus(key)}`}>
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* RESULT MODAL */}
      <ResultModal 
        isOpen={showResultModal}
        title={myStatus === "FAILED" ? "Mission Terminated" : "Mission Standings"}
        localPlayerName={playerName}
        players={sortedPlayers}
        renderStats={(p: any) => (
          <div className="text-right">
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${p.status === 'FAILED' ? 'text-red-500' : 'text-emerald-500'}`}>
                {p.status}
            </p>
            <p className="text-white font-black text-xl leading-none tracking-tighter">
                {p.wordsCleared} <span className="text-[10px] text-zinc-600 font-bold uppercase italic">Words</span>
            </p>
            <div className="mt-2 flex flex-col items-end gap-0.5 border-t border-white/5 pt-2">
              <p className="text-zinc-500 font-mono text-[10px] uppercase">
                  {p.totalAttempts} Tries
              </p>
              <p className="text-cyan-500 font-mono text-[11px] font-bold tracking-tighter">
                  ⏱ {formatTime(p.timeInSeconds)}
              </p>
            </div>
          </div>
        )}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}