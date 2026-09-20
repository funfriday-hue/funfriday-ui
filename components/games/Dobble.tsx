"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ResultModal from "../ResultModal";
import { getSortedPlayers } from "@/utils/gameRules";

interface DobbleProps {
  roomId: string;
  playerId: string;
  playerName: string;
  stompClient: { publish: (message: { destination: string; body: string }) => void } | null;
  publicState: unknown;
  privateState: unknown;
  synchronizedPlayers: PlayerPublic[];
  moveError: { id: number; message: string } | null;
}

interface DobbleCardModel {
  id: string;
  symbols: string[];
}

interface PlayerPublic {
  id: string;
  name: string;
  status: string;
  score: number;
  stats?: { matchesFound?: number; totalResponseTimeMillis?: number };
}

interface DobblePublicData {
  centerCard?: DobbleCardModel;
  currentCard?: DobbleCardModel;
  currentCardIndex?: number;
  currentRound?: number;
  currentCardSolved?: boolean;
  lastMatchPlayerId?: string;
  finished?: boolean;
  gameMode?: "CLASSIC" | "PAIR_RUSH" | "TRIPLE_HUNT";
  leftCard?: DobbleCardModel;
  rightCard?: DobbleCardModel;
  visibleCards?: DobbleCardModel[];
  totalRounds?: number;
}

interface RoomState {
  status?: string;
  gameSpecificPublicData?: DobblePublicData;
  self?: PlayerPublic;
}

function unwrapState(payload: unknown): RoomState | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const body = (payload as { body?: unknown }).body;
  return typeof body === "string" ? JSON.parse(body) as RoomState : payload as RoomState;
}

const formatMillis = (milliseconds: number) => `${(milliseconds / 1000).toFixed(2)}s`;

export default function Dobble({
  roomId,
  playerId,
  playerName,
  stompClient,
  publicState,
  privateState,
  synchronizedPlayers,
  moveError,
}: DobbleProps) {
  const advancedCardRef = useRef<number | null>(null);
  const [selectedTripleCards, setSelectedTripleCards] = useState<string[]>([]);

  const cleanPublic = useMemo(() => unwrapState(publicState), [publicState]);
  const cleanPrivate = useMemo(() => unwrapState(privateState), [privateState]);
  const gameData = cleanPublic?.gameSpecificPublicData || {};
  const centerCard = gameData.centerCard;
  const currentCard = gameData.currentCard;
  const currentCardIndex = gameData.currentCardIndex ?? 0;
  const currentRound = gameData.currentRound ?? 1;
  const currentCardSolved = Boolean(gameData.currentCardSolved);
  const isFinished = cleanPublic?.status === "FINISHED" || gameData.finished;
  const sortedPlayers = useMemo(() => getSortedPlayers(synchronizedPlayers, "DOBBLE"), [synchronizedPlayers]);
  const ownStats = cleanPrivate?.self?.stats || {};
  const cardSlots = Array.from({ length: 5 }, (_, slot) => Math.floor(currentCardIndex / 5) * 5 + slot);
  const activeSlot = currentCardIndex % 5;
  const mode = gameData.gameMode || "CLASSIC";

  useEffect(() => {
    if (!currentCardSolved || isFinished || gameData.lastMatchPlayerId !== playerId || advancedCardRef.current === currentCardIndex) return;
    advancedCardRef.current = currentCardIndex;
    const timeoutId = window.setTimeout(() => {
      stompClient?.publish({
        destination: `/app/game/${roomId}/move`,
        body: JSON.stringify({ type: "DOBBLE_NEXT_CARD" }),
      });
    }, 1250);
    return () => window.clearTimeout(timeoutId);
  }, [currentCardSolved, isFinished, gameData.lastMatchPlayerId, playerId, currentCardIndex, stompClient, roomId]);

  const selectSymbol = (symbol: string) => {
    if (currentCardSolved || isFinished || !stompClient) return;
    stompClient.publish({
      destination: `/app/game/${roomId}/move`,
      body: JSON.stringify({ type: "DOBBLE_MATCH", selectedSymbol: symbol }),
    });
  };

  const selectTripleCard = (cardId: string) => setSelectedTripleCards(previous => previous.includes(cardId)
    ? previous.filter(id => id !== cardId)
    : previous.length < 3 ? [...previous, cardId] : previous);

  const selectTripleSymbol = (symbol: string) => {
    if (!stompClient || selectedTripleCards.length !== 3 || isFinished) return;
    stompClient.publish({ destination: `/app/game/${roomId}/move`, body: JSON.stringify({ type: "DOBBLE_MATCH", selectedSymbol: symbol, selectedCardIds: selectedTripleCards }) });
    setSelectedTripleCards([]);
  };

  if (mode === "PAIR_RUSH") {
    return <PairRush gameData={gameData} selectSymbol={selectSymbol} isFinished={Boolean(isFinished)} currentRound={currentRound} totalRounds={gameData.totalRounds || 25} />;
  }
  if (mode === "TRIPLE_HUNT") {
    return <TripleHunt gameData={gameData} selectedIds={selectedTripleCards} toggleCard={selectTripleCard} selectSymbol={selectTripleSymbol} isFinished={Boolean(isFinished)} currentRound={currentRound} />;
  }

  if (!centerCard || !currentCard) return null;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#08090c] px-4 py-5 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5">
        <header className="flex w-full items-end justify-between border-b border-white/10 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-400">Dobble match protocol</p>
            <h1 className="text-2xl font-black uppercase tracking-tight">Round {currentRound} <span className="text-zinc-600">/ 9</span></h1>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Your score</p>
            <p className="text-xl font-black text-emerald-400">{ownStats.matchesFound || 0} <span className="text-xs text-zinc-500">matches</span></p>
          </div>
        </header>

        <p className="text-center text-xs font-bold uppercase tracking-widest text-zinc-400">
          Click the symbol on the center card that appears on the revealed card.
        </p>

        <section className="grid w-full max-w-4xl grid-cols-3 items-center gap-3 sm:gap-6">
          {cardSlots.map((_, slot) => {
            const state = slot < activeSlot
              ? "dimmed"
              : slot === activeSlot
                ? (currentCardSolved ? "dimmed" : "revealed")
                : "hidden";
            return (
              <DobbleCard
                key={`${currentRound}-${slot}`}
                card={(state === "revealed" || (state === "dimmed" && slot === activeSlot)) ? currentCard : null}
                state={state}
                className={slot === 0 ? "col-start-1 row-start-1" : slot === 1 ? "col-start-3 row-start-1" : slot === 2 ? "col-start-1 row-start-2" : slot === 3 ? "col-start-3 row-start-2" : "col-start-2 row-start-3"}
              />
            );
          })}

          <div className="col-start-2 row-start-2 z-10 aspect-square w-full max-w-[260px] justify-self-center rounded-full border-4 border-cyan-400 bg-zinc-950 p-6 shadow-[0_0_45px_rgba(34,211,238,.23)]">
            <div className="grid h-full grid-cols-3 place-items-center gap-1">
              {centerCard.symbols.map((symbol: string) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => selectSymbol(symbol)}
                  disabled={currentCardSolved || isFinished}
                  className="grid h-12 w-12 place-items-center rounded-full text-3xl transition hover:scale-125 hover:bg-cyan-400/20 disabled:cursor-default disabled:hover:scale-100"
                  aria-label={`Select ${symbol}`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        </section>

        <AnimatePresence>
          {currentCardSolved && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-2 text-xs font-black uppercase tracking-widest text-emerald-300">
              {gameData.lastMatchPlayerId === playerId ? "Correct — point claimed" : "Card claimed"}
            </motion.div>
          )}
          {moveError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold text-rose-400">{moveError.message || "Wrong symbol — keep looking."}</motion.p>}
        </AnimatePresence>
      </div>

      <ResultModal
        isOpen={Boolean(isFinished)}
        title="Dobble complete"
        players={sortedPlayers}
        localPlayerName={playerName}
        localPlayerId={playerId}
        renderStats={(player) => <p className="text-xs font-black text-cyan-300">{player.score} matches · {formatMillis(player.stats?.totalResponseTimeMillis || 0)}</p>}
      />
    </div>
  );
}

function PairRush({ gameData, selectSymbol, isFinished, currentRound, totalRounds }: { gameData: DobblePublicData; selectSymbol: (symbol: string) => void; isFinished: boolean; currentRound: number; totalRounds: number }) {
  const left = gameData.leftCard;
  const right = gameData.rightCard;
  if (isFinished) return <div className="grid h-full place-items-center bg-[#08090c] text-center text-white"><div><h1 className="text-4xl font-black uppercase">Pair Rush Complete</h1><p className="mt-3 text-zinc-400">Final standings are on the right.</p></div></div>;
  if (!left || !right) return null;
  return <div className="flex h-full flex-col items-center justify-center gap-8 bg-[#08090c] p-6 text-white"><h1 className="text-3xl font-black uppercase">Pair Rush <span className="text-zinc-600">{currentRound}/{totalRounds}</span></h1><p className="text-xs uppercase tracking-widest text-zinc-400">Click the matching symbol on either card</p><div className="grid w-full max-w-3xl grid-cols-2 gap-8">{[left, right].map(card => <div key={card.id} className="grid aspect-square grid-cols-3 place-items-center rounded-full border-4 border-white/70 bg-white p-8 text-3xl text-black shadow-2xl">{card.symbols.map(symbol => <button disabled={isFinished} onClick={() => selectSymbol(symbol)} key={symbol} className="rounded-full p-2 hover:bg-cyan-200">{symbol}</button>)}</div>)}</div></div>;
}

function TripleHunt({ gameData, selectedIds, toggleCard, selectSymbol, isFinished, currentRound }: { gameData: DobblePublicData; selectedIds: string[]; toggleCard: (id: string) => void; selectSymbol: (symbol: string) => void; isFinished: boolean; currentRound: number }) {
  const cards = gameData.visibleCards || [];
  if (isFinished) return <div className="grid h-full place-items-center bg-[#08090c] text-center text-white"><div><h1 className="text-4xl font-black uppercase">Triple Hunt Complete</h1><p className="mt-3 text-zinc-400">Final standings are on the right.</p></div></div>;
  const candidateSymbols = selectedIds.length === 3 ? cards.filter(card => selectedIds.includes(card.id)).reduce<string[]>((common, card) => common.filter(symbol => card.symbols.includes(symbol)), cards.find(card => card.id === selectedIds[0])?.symbols || []) : [];
  return <div className="h-full overflow-y-auto bg-[#08090c] p-5 text-white"><div className="mx-auto max-w-5xl text-center"><h1 className="text-3xl font-black uppercase">Triple Hunt <span className="text-zinc-600">{currentRound}/12</span></h1><p className="my-3 text-xs uppercase tracking-widest text-zinc-400">Select three cards, then their common symbol</p><div className="grid grid-cols-3 gap-3">{cards.map(card => <button disabled={isFinished} onClick={() => toggleCard(card.id)} key={card.id} className={`grid aspect-square grid-cols-3 place-items-center rounded-full border-2 p-3 text-xl shadow-lg ${selectedIds.includes(card.id) ? "border-cyan-400 bg-cyan-400/15" : "border-white/70 bg-white text-black"}`}>{card.symbols.map(symbol => <span key={symbol}>{symbol}</span>)}</button>)}</div>{selectedIds.length === 3 && <div className="mt-5 flex justify-center gap-3">{candidateSymbols.map(symbol => <button onClick={() => selectSymbol(symbol)} key={symbol} className="rounded-full bg-cyan-400 px-5 py-3 text-2xl text-black">{symbol}</button>)}</div>}</div></div>;
}

function DobbleCard({ card, state, className = "" }: { card: DobbleCardModel | null; state: "hidden" | "revealed" | "dimmed"; className?: string }) {
  if (state === "hidden") {
    return <div className={`aspect-square rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_30%_30%,#1f2937,#09090b_68%)] shadow-xl ${className}`} aria-label="Hidden Dobble card"><div className="grid h-full place-items-center text-3xl text-cyan-500/50">✦</div></div>;
  }
  return (
    <div className={`aspect-square rounded-[2rem] border-2 ${state === "dimmed" ? "border-zinc-700 bg-zinc-900/50 opacity-45" : "border-white/40 bg-white text-black shadow-2xl"} p-3 transition-all ${className}`}>
      <div className="grid h-full grid-cols-3 place-items-center gap-1">{card?.symbols?.map((symbol: string) => <span key={symbol} className="text-xl sm:text-3xl">{symbol}</span>)}</div>
    </div>
  );
}
