"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ResultModal from "../ResultModal";
import { getSortedPlayers } from "../../utils/gameRules";

type StompClient = { publish: (message: { destination: string; body: string }) => void };
type Player = { id: string; name: string; score: number; status: string; connected?: boolean; stats?: { strikes?: number; correctAnswers?: number } };
type GameData = { question?: string; category?: string; questionType?: "LIST" | "CHRONOLOGY"; playMode?: "ALL_PLAY" | "ROUND_ROBIN"; acceptedAnswers?: string[]; totalAnswerCount?: number; allAnswers?: string[]; allAnswerHints?: (string | null)[]; answeredAnswerIndexes?: number[]; currentPlayerId?: string; timeoutCoordinatorId?: string; allPlayAnsweredPlayerIds?: string[]; chronologyPassedPlayerIds?: string[]; turnStartedAtMillis?: number; turnSeconds?: number; strikeLimit?: number; lastEvent?: string; chronologyHint?: string; finished?: boolean };

export default function QuizRoyale({ roomId, playerId, playerName, stompClient, publicState, synchronizedPlayers }: { roomId: string; playerId: string; playerName: string; stompClient: StompClient; publicState: unknown; synchronizedPlayers: Player[] }) {
  const [answer, setAnswer] = useState("");
  const [now, setNow] = useState(0);
  const state = publicState as { status?: string; host?: { id?: string }; gameSpecificPublicData?: GameData };
  const data = state?.gameSpecificPublicData || {};
  const isAllPlay = data.playMode === "ALL_PLAY";
  const localPlayer = synchronizedPlayers.find(player => player.id === playerId);
  const isMyTurn = isAllPlay ? localPlayer?.status === "ACTIVE" : data.currentPlayerId === playerId;
  const activePlayer = synchronizedPlayers.find(player => player.id === data.currentPlayerId);
  const isFinished = state.status === "FINISHED" || Boolean(data.finished);
  const isHost = state.host?.id === playerId;
  const hasPassedCurrentChronologyItem = Boolean(data.chronologyPassedPlayerIds?.includes(playerId));
  const acceptedAnswerCount = data.acceptedAnswers?.length || 0;
  const acceptedAnswerCountRef = useRef(acceptedAnswerCount);
  const answersListRef = useRef<HTMLDivElement>(null);
  const configuredSeconds = data.turnSeconds ?? 60;
  const strikePlayer = isAllPlay ? localPlayer : activePlayer;
  const isLocalPlayerEliminated = localPlayer?.status === "ELIMINATED";
  const displayedStrikePlayer = isLocalPlayerEliminated ? localPlayer : strikePlayer;
  const strikeCount = displayedStrikePlayer?.stats?.strikes ?? 0;
  const strikeLimit = data.strikeLimit || 3;
  const strikesLeft = Math.max(0, strikeLimit - strikeCount);
  const sortedPlayers = getSortedPlayers(synchronizedPlayers, "QUIZ_ROYALE");
  const secondsLeft = now === 0 ? configuredSeconds : Math.max(0, Math.ceil(((data.turnStartedAtMillis || 0) + configuredSeconds * 1000 - now) / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (acceptedAnswerCount > acceptedAnswerCountRef.current) {
      setAnswer("");
      answersListRef.current?.scrollTo({ top: answersListRef.current.scrollHeight, behavior: "smooth" });
    }
    acceptedAnswerCountRef.current = acceptedAnswerCount;
  }, [acceptedAnswerCount]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || !isMyTurn || isFinished) return;
    stompClient.publish({ destination: `/app/game/${roomId}/move`, body: JSON.stringify({ type: "QUIZ_ANSWER", answer: answer.trim() }) });
    setAnswer("");
  };
  const passTurn = () => {
    if (!isMyTurn || isFinished || data.questionType !== "CHRONOLOGY" && isAllPlay) return;
    stompClient.publish({ destination: `/app/game/${roomId}/move`, body: JSON.stringify({ type: "QUIZ_PASS" }) });
    setAnswer("");
  };
  return <div className="h-full overflow-y-auto bg-[#090a0f] px-5 pb-6 pt-28 text-white"><div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_320px]">
    <section className="rounded-[2rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.35em] text-cyan-400">{data.category || "Quiz"} Royale · {data.questionType || "LIST"}</p><h1 className="mt-2 text-2xl font-black uppercase">{data.question || "Loading question…"}</h1></div><div className={`rounded-2xl border px-5 py-3 text-center ${secondsLeft <= 10 ? "border-rose-500 text-rose-400" : "border-cyan-500/40 text-cyan-300"}`}><p className="text-[9px] font-mono uppercase tracking-widest">Turn timer</p><p className="text-3xl font-black">{secondsLeft >= 60 ? `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s` : `${secondsLeft}s`}</p></div></div>
      {data.questionType === "CHRONOLOGY" && <div className="mt-5 rounded-2xl bg-amber-400/10 px-5 py-4 text-center"><p className="text-[10px] font-mono uppercase tracking-widest text-amber-300">Answer for</p><p className="text-3xl font-black text-amber-200">{data.chronologyHint}</p></div>}
      <div className="my-7 rounded-3xl border border-white/10 bg-white/[.03] p-6 text-center"><p className="text-[10px] font-mono uppercase tracking-[.3em] text-zinc-500">{isAllPlay ? "All Play" : "Current turn"}</p><p className={`mt-2 text-3xl font-black ${isLocalPlayerEliminated ? "text-rose-400" : "text-cyan-300"}`}>{isLocalPlayerEliminated ? "Strike out" : isAllPlay ? "Answer now" : activePlayer ? `${activePlayer.name}'s turn` : "Waiting…"}</p><motion.p key={`${displayedStrikePlayer?.id || "player"}-${strikeCount}`} initial={{ scale: 1.35, color: "#fb7185" }} animate={{ scale: 1, color: "#a1a1aa" }} transition={{ type: "spring", stiffness: 420, damping: 16 }} className="mt-2 text-sm font-bold">{isLocalPlayerEliminated ? `Strikes left: ${strikesLeft}/${strikeLimit}` : `Strikes: ${strikeCount}/${strikeLimit}`}</motion.p>{data.questionType === "LIST" && typeof data.totalAnswerCount === "number" && <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">Answers found: {acceptedAnswerCount}/{data.totalAnswerCount}</p>}<p className="mt-2 text-sm text-zinc-400">{isLocalPlayerEliminated ? "You have used all your strikes and are out of this match." : isMyTurn ? (isAllPlay ? "Keep submitting distinct correct answers." : "Submit an answer.") : isAllPlay ? "You are eliminated from this match." : "Only the active player can answer."}</p></div>
      <form onSubmit={submit} className="flex gap-3"><input value={answer} onChange={event => setAnswer(event.target.value)} disabled={!isMyTurn || isFinished} placeholder={isMyTurn ? "Type your answer…" : isLocalPlayerEliminated ? "Strike out — you are eliminated" : "Wait for your turn"} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-cyan-400 disabled:opacity-50"/><button disabled={!isMyTurn || isFinished} className="rounded-2xl bg-cyan-400 px-6 py-4 text-xs font-black uppercase tracking-widest text-black disabled:opacity-40">Submit</button>{(!isAllPlay || data.questionType === "CHRONOLOGY") && <button type="button" onClick={passTurn} disabled={!isMyTurn || isFinished || (isAllPlay && hasPassedCurrentChronologyItem)} className="rounded-2xl border border-rose-400/50 px-5 py-4 text-xs font-black uppercase tracking-widest text-rose-300 transition-colors hover:bg-rose-400/10 disabled:opacity-40">{isAllPlay && hasPassedCurrentChronologyItem ? "Passed" : "Pass"}</button>}</form>
      {data.lastEvent && <p className="mt-5 text-center text-sm font-bold text-zinc-400">{data.lastEvent}</p>}
    </section>
    <aside className="flex max-h-[420px] flex-col rounded-[2rem] border border-white/10 bg-zinc-950 p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-[10px] font-mono uppercase tracking-[.3em] text-zinc-500">Answers found</h2>{data.questionType === "LIST" && typeof data.totalAnswerCount === "number" && <span className="shrink-0 font-mono text-xs font-bold text-cyan-300">{acceptedAnswerCount}/{data.totalAnswerCount}</span>}</div><div ref={answersListRef} className="mt-4 min-h-0 space-y-3 overflow-y-auto pr-2">{(data.acceptedAnswers || []).map((accepted, index) => <p key={`${index}-${accepted}`} className="text-sm font-semibold text-white">{index + 1}. {accepted}</p>)}{!(data.acceptedAnswers || []).length && <p className="text-sm text-zinc-600">No accepted answers yet.</p>}</div></aside>
  </div><ResultModal isOpen={isFinished} title="Quiz Royale complete" players={sortedPlayers} localPlayerName={playerName} localPlayerId={playerId} onRestart={isHost ? () => stompClient.publish({ destination: `/app/game/${roomId}/lobby`, body: "{}" }) : undefined} restartLabel="Restart" renderStats={player => <div><p className="font-black text-cyan-300">{player.score} points</p><p className="text-xs text-zinc-500">{player.stats?.strikes || 0}/{data.strikeLimit || 3} strikes</p></div>}>
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[10px] font-mono font-bold uppercase tracking-[.22em] text-zinc-500">Answer review</p><p className="text-[10px] font-bold text-zinc-500">Green: answered · Red: missed</p></div>
      <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
        {(data.allAnswers || []).map((resultAnswer, index) => {
          const answered = data.answeredAnswerIndexes?.includes(index) || false;
          const hint = data.allAnswerHints?.[index];
          return <p key={`${index}-${resultAnswer}`} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${answered ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>{hint ? `${hint}: ` : ""}{resultAnswer}</p>;
        })}
      </div>
    </div>
  </ResultModal></div>;
}
