"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import ResultModal, { formatTimeElapsed } from '../ResultModal';
import { getSortedPlayers } from "@/utils/gameRules";

const MAX_TRIES_PER_WORD = 6;

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
  publicState: any;  
  privateState: any; 
  wordError: { id: number; message: string } | null; 
  secondsLeft: number; 
  synchronizedPlayers: any[];
}

export default function Wordle({ roomId, playerName, playerId, stompClient, publicState, privateState, wordError, secondsLeft, synchronizedPlayers }: WordleProps) {
  const [currentGuess, setCurrentGuess] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Parse clean states
  const cleanPublic = useMemo(() => {
    if (!publicState) return null;
    return publicState.body ? JSON.parse(publicState.body) : publicState;
  }, [publicState]);

  const cleanPrivate = useMemo(() => {
    if (!privateState) return null;
    return privateState.body ? JSON.parse(privateState.body) : privateState;
  }, [privateState]);

  const publicGameData = cleanPublic?.gameSpecificPublicData || {};
  const privateGameData = cleanPrivate?.privateGameData || {};
  
  const attempts = privateGameData?.playerAttempts || privateGameData?.attempts || [];
  const gameModeType = cleanPublic?.type || "WORDLE"; 
  const solvedCount = privateGameData?.playerProgress ?? 0;

  // Determine if this is an active countdown/timed mode
  const isTimedMode = publicGameData?.remainingSeconds !== undefined;
  const [localSecondsLeft, setLocalSecondsLeft] = useState(secondsLeft);

  useEffect(() => {
    setLocalSecondsLeft(secondsLeft);
  }, [secondsLeft]);

  const mySelf = useMemo(() => {
    const baseSelf = cleanPrivate?.self || (synchronizedPlayers || []).find((p: any) => String(p.id) === String(playerId)) || {};
    return { ...baseSelf, score: solvedCount };
  }, [cleanPrivate, synchronizedPlayers, playerId, solvedCount]);
  
  const currentTryCount = attempts.length; 
  const totalTriesCount = mySelf?.stats?.tries ?? currentTryCount; 

  const myStatus = useMemo(() => {
    const rawStatus = mySelf?.status || cleanPublic?.status || "SOLVING";
    if (rawStatus === "ACTIVE" || rawStatus === "IN_PROGRESS") return "SOLVING";
    return rawStatus;
  }, [mySelf, cleanPublic]);

  const totalPhases = cleanPublic?.configuration?.gameMode === "WORD_3" ? 3 : (gameModeType.split('_')[1] || 3);
  const displayTargetLabel = `PHASE ${Math.min(solvedCount + 1, Number(totalPhases))} / ${totalPhases}`;

  const isWordSolved = attempts.length > 0 && 
                        attempts[attempts.length - 1].result?.every((r: string) => r === 'GREEN');
  
  const isPlayerDone = myStatus === "COMPLETED" || myStatus === "FAILED";
  const isGlobalFinished = cleanPublic?.status === "FINISHED" || publicGameData?.finished;
  const showResultModal = isGlobalFinished || isPlayerDone;

  const sortedPlayersForModal = useMemo(() => {
    return getSortedPlayers(synchronizedPlayers, "WORDLE");
  }, [synchronizedPlayers]);

  // Live countdown ticker loop
  useEffect(() => {
    if (!isTimedMode || isGlobalFinished || isPlayerDone || localSecondsLeft <= 0) return;

    const intervalId = setInterval(() => {
      setLocalSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [localSecondsLeft, isGlobalFinished, isPlayerDone, isTimedMode]);

  // Fixed auto-scroll invocation target
  useEffect(() => {
    setCurrentGuess("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [solvedCount, attempts.length]);

  const shakeVariants: Variants = {
    shake: { x: [-6, 6, -6, 6, -4, 4, -2, 2, 0], transition: { duration: 0.4, ease: "easeInOut" } },
    stable: { x: 0 }
  };

  const isTimeAttack = publicGameData?.remainingSeconds !== undefined;

  useEffect(() => {
    if (!wordError) return;
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  }, [wordError]);

  const handleAction = (key: string) => {
    if (isGlobalFinished || isPlayerDone || isWordSolved || (isTimedMode && localSecondsLeft <= 0)) return;

    if (key === "ENTER") {
      if (currentGuess.length === 5) {
        stompClient.publish({
          destination: `/app/game/${roomId}/move`,
          body: JSON.stringify({ 
            type: "WORDLE_GUESS", 
            guess: currentGuess.toUpperCase() 
          })
        });
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
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
  }, [currentGuess, isGlobalFinished, isPlayerDone, isWordSolved, localSecondsLeft, isTimedMode]);

  const getLetterStatus = (letter: string) => {
    let rank = 0; 
    attempts.forEach((att: any) => {
      if (!att.guess) return;
      att.guess.split("").forEach((char: string, i: number) => {
        if (char.toUpperCase() === letter.toUpperCase()) {
          const status = att.result?.[i]; 
          if (status === 'GREEN') rank = Math.max(rank, 3);
          else if (status === 'YELLOW') rank = Math.max(rank, 2);
          else if (status === 'GRAY') rank = Math.max(rank, 1);
        }
      });
    });
    return [
      "bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600",
      "bg-zinc-900/90 text-zinc-400 border border-zinc-800",
      "bg-amber-500 text-black font-bold", 
      "bg-emerald-500 text-black font-bold"
    ][rank];
  };

  const triggerNextPhase = () => {
    stompClient.publish({
      destination: `/app/game/${roomId}/move`,
      body: JSON.stringify({ type: "NEXT_PHASE" })
    });
  };

  const renderDigitalClock = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto bg-black text-white overflow-hidden font-sans justify-between">
      
      {/* HEADER ROW STATS PANEL - Tightened padding & height parameters */}
      <div className="py-2.5 px-4 border-b border-zinc-900 flex justify-between items-end bg-black shrink-0 select-none">
        <div>
          <p className="text-zinc-500 font-mono text-[9px] tracking-[0.3em] uppercase mb-0.5">
            {myStatus === "FAILED" ? "DEFEAT" : displayTargetLabel}
          </p>
          <h1 className="text-lg sm:text-xl font-black uppercase leading-none tracking-tight">
    {myStatus === "FAILED" ? (
      <span>WORD: <span className="text-rose-500 font-mono tracking-wider">{privateGameData?.targetWord || "XXXXX"}</span></span>
    ) : (
      <>SOLVED: <span className="text-emerald-500">{solvedCount}</span></>
    )}
  </h1>
        </div>

        <div className="flex gap-4 sm:gap-6 items-end">
          {/* RUSH COUNTDOWN DISPLAY BOX */}
          {isTimedMode && (
            <div className="text-right border-r border-zinc-900 pr-4 sm:pr-6">
              <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider mb-0.5">RUSH TIME</p>
              <p className={`text-lg font-black font-mono leading-none transition-colors duration-300
                ${localSecondsLeft > 30 ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`}>
                {renderDigitalClock(localSecondsLeft)}
              </p>
            </div>
          )}

          {/* CURRENT PANEL DISPLAY */}
          <div className="text-right">
            <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider mb-0.5">CURRENT</p>
            <p className="text-lg font-bold text-cyan-400 leading-none">
              {currentTryCount}<span className="text-zinc-600 text-xs font-normal">/{MAX_TRIES_PER_WORD}</span>
            </p>
          </div>
          
          {/* TOTAL TRIES PANEL DISPLAY */}
          <div className="text-right border-l border-zinc-900 pl-4 sm:pl-6">
            <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider mb-0.5">TOTAL TRIES</p>
            <p className="text-lg font-black text-white leading-none">
              {totalTriesCount}
            </p>
          </div>
        </div>
      </div>

      {/* MATRIX BOARD LAYOUT TILES - Fixed scrolling/fitting via modern layout scaling wrappers */}
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden select-none">
        <div className="max-h-full flex flex-col justify-center items-center">
          <AnimatePresence mode="wait">
            <motion.div key={solvedCount} className="flex flex-col gap-1.5 sm:gap-2">
              {Array.from({ length: MAX_TRIES_PER_WORD }).map((_, rowIndex) => {
                // 1. Render historic submitted attempt rows
                if (rowIndex < attempts.length) {
                  const att = attempts[rowIndex];
                  return (
                    <div key={`row-${rowIndex}`} className="flex gap-1.5 sm:gap-2">
                      {(att.guess || "").split("").map((char: string, j: number) => (
                        <motion.div 
                          key={`${rowIndex}-${j}`}
                          initial={{ rotateX: -90 }} animate={{ rotateX: 0 }}
                          transition={{ delay: j * 0.05 }}
                          className={`w-[min(6.2vh,50px)] h-[min(6.2vh,50px)] min-[380px]:w-[min(6.6vh,54px)] min-[380px]:h-[min(6.6vh,54px)] sm:w-15 sm:h-15 md:w-16 md:h-16 flex items-center justify-center text-xl sm:text-2xl font-black rounded-xl border-2 transition-colors
                            ${att.result?.[j] === 'GREEN' ? 'bg-emerald-500 border-emerald-400 text-black' : 
                              att.result?.[j] === 'YELLOW' ? 'bg-amber-500 border-amber-400 text-black' : 'bg-zinc-900/60 border-zinc-800 text-white'}`}
                        >
                          {char}
                        </motion.div>
                      ))}
                    </div>
                  );
                } 
                
                // 2. Render current user active typing row
                if (rowIndex === attempts.length && !isPlayerDone && !isWordSolved && (!isTimedMode || localSecondsLeft > 0)) {
                  return (
                    <motion.div 
                      key={`row-${rowIndex}`}
                      variants={shakeVariants}
                      animate={isShaking ? "shake" : "stable"}
                      className="flex gap-1.5 sm:gap-2"
                    >
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-[min(6.2vh,50px)] h-[min(6.2vh,50px)] min-[380px]:w-[min(6.6vh,54px)] min-[380px]:h-[min(6.6vh,54px)] sm:w-15 sm:h-15 md:w-16 md:h-16 flex items-center justify-center text-xl sm:text-2xl font-black rounded-xl border-2 transition-all
                          ${currentGuess[i] ? 'border-zinc-400 scale-105 text-white bg-zinc-900/30' : 'border-zinc-900 text-transparent bg-transparent'}`}>
                          {currentGuess[i] || ""}
                        </div>
                      ))}
                    </motion.div>
                  );
                }

                // 3. Render empty future placeholder rows to secure full 6-row alignment space
                return (
                  <div key={`row-${rowIndex}`} className="flex gap-1.5 sm:gap-2 opacity-25">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-[min(6.2vh,50px)] h-[min(6.2vh,50px)] min-[380px]:w-[min(6.6vh,54px)] min-[380px]:h-[min(6.6vh,54px)] sm:w-15 sm:h-15 md:w-16 md:h-16 flex items-center justify-center rounded-xl border-2 border-zinc-900 bg-transparent" />
                    ))}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Action Condition Boxes */}
          {isWordSolved && !isPlayerDone && (!isTimedMode || localSecondsLeft > 0) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-col items-center">
               <button onClick={triggerNextPhase} className="px-6 py-2.5 bg-white text-black font-black rounded-xl uppercase tracking-wider text-[11px] hover:bg-emerald-500 transition-all active:scale-95 shadow-lg">
                  Next Phase
               </button>
            </motion.div>
          )}

          {isTimedMode && localSecondsLeft <= 0 && !isGlobalFinished && !isPlayerDone && (
            <div className="text-center text-rose-500 font-black uppercase text-[10px] mt-3 tracking-widest animate-pulse">
              💥 Time is out! Waiting for calculations...
            </div>
          )}
        </div>
        
        <div ref={bottomRef} className="h-1 w-full shrink-0" />
      </div>

      {/* FOOTER KEYBOARD ROW - Locked explicitly at the footer line with absolute constraints removed */}
      <div className={`p-2 sm:p-4 bg-black border-t border-zinc-900 pb-4 sm:pb-6 shrink-0 ${isWordSolved || isPlayerDone || (isTimedMode && localSecondsLeft <= 0) ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex flex-col gap-1.5 max-w-lg mx-auto">
          {KEYBOARD.map((row, i) => (
            <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
              {row.map(key => (
                <button 
                  key={key} 
                  onClick={() => handleAction(key)} 
                  type="button" 
                  className={`h-11 sm:h-13 md:h-14 rounded-xl font-black uppercase transition-all text-xs sm:text-sm ${key.length > 1 ? 'px-2 sm:px-4 text-[10px] sm:text-[11px]' : 'flex-1'} ${getLetterStatus(key)}`}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

{/* UPDATE IN WORDLE.TSX */}
<ResultModal 
  isOpen={showResultModal}
  players={sortedPlayersForModal}
  localPlayerName={playerName}
  localPlayerId={playerId}
  targetWord={privateGameData?.targetWord} // 👈 Pass the word
  myStatus={myStatus}                     // 👈 Pass the fail/complete status
  renderStats={(p: any) => (
    <div className="text-right">
      <p className="text-white font-black">{p.score} Solved</p>
      <p className="text-xs text-zinc-500">{p.stats?.tries || 0} Tries</p>
      
      {!isTimeAttack && p.stats?.timeElapsedSeconds && (
        <p className="text-xs text-cyan-400 font-mono">
          ⏱️ {formatTimeElapsed(p.stats.timeElapsedSeconds)}
        </p>
      )}
    </div>
  )}
/>
    </div>
  );
}