"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ResultModal from "../ResultModal";
import { getSortedPlayers } from "../../utils/gameRules";

type StompClient = { publish: (message: { destination: string; body: string }) => void };
type Player = { id: string; name: string; score: number; status: string; connected?: boolean; stats?: { strikes?: number; correctAnswers?: number } };
type QuestionResult = { questionNumber: number; prompt: string; category: string; questionType: "LIST" | "CHRONOLOGY"; answers: string[]; hints: (string | null)[]; answeredAnswerIndexes: number[] };
type GameData = { question?: string; category?: string; questionType?: "LIST" | "CHRONOLOGY"; playMode?: "ALL_PLAY" | "ROUND_ROBIN"; acceptedAnswers?: string[]; totalAnswerCount?: number; questionResults?: QuestionResult[]; allAnswers?: string[]; allAnswerHints?: (string | null)[]; answeredAnswerIndexes?: number[]; currentPlayerId?: string; timeoutCoordinatorId?: string; allPlayAnsweredPlayerIds?: string[]; chronologyPassedPlayerIds?: string[]; turnStartedAtMillis?: number; turnSeconds?: number; strikeLimit?: number; questionNumber?: number; questionCount?: number; questionActive?: boolean; questionTransitionEndsAtMillis?: number; lastEvent?: string; chronologyHint?: string; finished?: boolean };

export default function QuizRoyale({ roomId, playerId, playerName, stompClient, publicState, synchronizedPlayers }: { roomId: string; playerId: string; playerName: string; stompClient: StompClient; publicState: unknown; synchronizedPlayers: Player[] }) {
  const [answer, setAnswer] = useState("");
  const [now, setNow] = useState(0);
  const [openResultQuestion, setOpenResultQuestion] = useState<number | null>(null);
  const state = publicState as { status?: string; host?: { id?: string }; gameSpecificPublicData?: GameData };
  const data = state?.gameSpecificPublicData || {};
  const questionActive = data.questionActive !== false;
  const isAllPlay = data.playMode === "ALL_PLAY";
  const localPlayer = synchronizedPlayers.find(player => player.id === playerId);
  const isMyTurn = questionActive && (isAllPlay ? localPlayer?.status === "ACTIVE" : data.currentPlayerId === playerId);
  const activePlayer = synchronizedPlayers.find(player => player.id === data.currentPlayerId);
  const isFinished = state.status === "FINISHED" || Boolean(data.finished);
  const questionResults: QuestionResult[] = data.questionResults?.length ? data.questionResults : (data.allAnswers?.length ? [{
    questionNumber: data.questionNumber || 1,
    prompt: data.question || "Question",
    category: data.category || "QUIZ",
    questionType: data.questionType || "LIST",
    answers: data.allAnswers,
    hints: data.allAnswerHints || [],
    answeredAnswerIndexes: data.answeredAnswerIndexes || []
  }] : []);
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
  const transitionSeconds = now === 0 ? 5 : Math.max(0, Math.ceil(((data.questionTransitionEndsAtMillis || 0) - now) / 1000));

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
      {!questionActive && !isFinished && <motion.div initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-8 text-center"><p className="font-mono text-xs uppercase tracking-[.4em] text-cyan-300">{(data.questionNumber || 1) === 1 ? "Starting quiz" : "Next question"}</p><p className="mt-3 text-4xl font-black sm:text-5xl">Question {data.questionNumber || 1} of {data.questionCount || 1}</p><p className="mt-5 text-sm font-mono uppercase tracking-[.3em] text-zinc-300">Begins in</p><p className="mt-1 text-5xl font-black text-cyan-300 sm:text-6xl">{transitionSeconds}</p><p className="mt-2 text-sm text-zinc-400">Strikes reset for everyone</p></motion.div>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.35em] text-cyan-400">{data.category || "Quiz"} Royale · {data.questionType || "LIST"}{data.questionCount && data.questionCount > 1 ? ` · Question ${data.questionNumber || 1}/${data.questionCount}` : ""}</p><h1 className="mt-2 text-2xl font-black uppercase">{data.question || "Loading question…"}</h1></div><div className={`rounded-2xl border px-5 py-3 text-center ${questionActive && secondsLeft <= 10 ? "border-rose-500 text-rose-400" : "border-cyan-500/40 text-cyan-300"}`}><p className="text-[9px] font-mono uppercase tracking-widest">{questionActive ? "Turn timer" : "Starting in"}</p><p className="text-3xl font-black">{questionActive ? (secondsLeft >= 60 ? `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s` : `${secondsLeft}s`) : `${transitionSeconds}s`}</p></div></div>
      {data.questionType === "CHRONOLOGY" && <div className="mt-5 rounded-2xl bg-amber-400/10 px-5 py-4 text-center"><p className="text-[10px] font-mono uppercase tracking-widest text-amber-300">Answer for</p><p className="text-3xl font-black text-amber-200">{data.chronologyHint}</p></div>}
      <div className="my-7 rounded-3xl border border-white/10 bg-white/[.03] p-6 text-center"><p className="text-[10px] font-mono uppercase tracking-[.3em] text-zinc-500">{isAllPlay ? "All Play" : "Current turn"}</p><p className={`mt-2 text-3xl font-black ${isLocalPlayerEliminated ? "text-rose-400" : "text-cyan-300"}`}>{isLocalPlayerEliminated ? "Strike out" : isAllPlay ? "Answer now" : activePlayer ? `${activePlayer.name}'s turn` : "Waiting…"}</p><motion.p key={`${displayedStrikePlayer?.id || "player"}-${strikeCount}`} initial={{ scale: 1.35, color: "#fb7185" }} animate={{ scale: 1, color: "#a1a1aa" }} transition={{ type: "spring", stiffness: 420, damping: 16 }} className="mt-2 text-sm font-bold">{isLocalPlayerEliminated ? `Strikes left: ${strikesLeft}/${strikeLimit}` : `Strikes: ${strikeCount}/${strikeLimit}`}</motion.p>{data.questionType === "LIST" && typeof data.totalAnswerCount === "number" && <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">Answers found: {acceptedAnswerCount}/{data.totalAnswerCount}</p>}<p className="mt-2 text-sm text-zinc-400">{isLocalPlayerEliminated ? "You have used all your strikes and are out of this match." : isMyTurn ? (isAllPlay ? "Keep submitting distinct correct answers." : "Submit an answer.") : isAllPlay ? "You are eliminated from this match." : "Only the active player can answer."}</p></div>
      <form onSubmit={submit} className="flex gap-3"><input value={answer} onChange={event => setAnswer(event.target.value)} disabled={!isMyTurn || isFinished} placeholder={isMyTurn ? "Type your answer…" : isLocalPlayerEliminated ? "Strike out — you are eliminated" : "Wait for your turn"} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-cyan-400 disabled:opacity-50"/><button disabled={!isMyTurn || isFinished} className="rounded-2xl bg-cyan-400 px-6 py-4 text-xs font-black uppercase tracking-widest text-black disabled:opacity-40">Submit</button>{(!isAllPlay || data.questionType === "CHRONOLOGY") && <button type="button" onClick={passTurn} disabled={!isMyTurn || isFinished || (isAllPlay && hasPassedCurrentChronologyItem)} className="rounded-2xl border border-rose-400/50 px-5 py-4 text-xs font-black uppercase tracking-widest text-rose-300 transition-colors hover:bg-rose-400/10 disabled:opacity-40">{isAllPlay && hasPassedCurrentChronologyItem ? "Passed" : "Pass"}</button>}</form>
      {data.lastEvent && <p className="mt-5 text-center text-sm font-bold text-zinc-400">{data.lastEvent}</p>}
    </section>
    <aside className="flex max-h-[420px] flex-col rounded-[2rem] border border-white/10 bg-zinc-950 p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-[10px] font-mono uppercase tracking-[.3em] text-zinc-500">Answers found</h2>{data.questionType === "LIST" && typeof data.totalAnswerCount === "number" && <span className="shrink-0 font-mono text-xs font-bold text-cyan-300">{acceptedAnswerCount}/{data.totalAnswerCount}</span>}</div><div ref={answersListRef} className="mt-4 min-h-0 space-y-3 overflow-y-auto pr-2">{(data.acceptedAnswers || []).map((accepted, index) => <p key={`${index}-${accepted}`} className="text-sm font-semibold text-white">{index + 1}. {accepted}</p>)}{!(data.acceptedAnswers || []).length && <p className="text-sm text-zinc-600">No accepted answers yet.</p>}</div></aside>
  </div><ResultModal isOpen={isFinished} title="Quiz Royale complete" players={sortedPlayers} localPlayerName={playerName} localPlayerId={playerId} onRestart={isHost ? () => stompClient.publish({ destination: `/app/game/${roomId}/lobby`, body: "{}" }) : undefined} restartLabel="Restart" renderStats={player => <div><p className="font-black text-cyan-300">{player.score} points</p><p className="text-xs text-zinc-500">{player.stats?.strikes || 0}/{data.strikeLimit || 3} strikes</p></div>}>
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[10px] font-mono font-bold uppercase tracking-[.22em] text-zinc-500">Answer review</p><p className="text-[10px] font-bold text-zinc-500">Green: answered · Red: missed</p></div>
      <div className="space-y-2">
        {questionResults.map(result => {
          const isOpen = openResultQuestion === result.questionNumber;
          return <div key={result.questionNumber} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <button type="button" onClick={() => setOpenResultQuestion(isOpen ? null : result.questionNumber)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[.04]">
              <span className="min-w-0"><span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">Question {result.questionNumber}</span><span className="mt-1 block truncate text-sm font-bold text-white">{result.prompt}</span></span>
              <span className="shrink-0 text-lg text-zinc-400">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <div className="max-h-48 space-y-2 overflow-y-auto border-t border-white/10 p-3 pr-2">
              {result.answers.map((resultAnswer, index) => {
                const answered = result.answeredAnswerIndexes.includes(index);
                const hint = result.hints[index];
                return <p key={`${index}-${resultAnswer}`} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${answered ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>{hint ? `${hint}: ` : ""}{resultAnswer}</p>;
              })}
            </div>}
          </div>;
        })}
      </div>
    </div>
  </ResultModal></div>;
}
