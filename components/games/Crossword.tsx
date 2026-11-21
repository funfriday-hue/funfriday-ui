"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "lucide-react";
import ResultModal, { formatTimeElapsed } from "../ResultModal";
import AdSlot from "../AdSlot";
import { ADSENSE_SLOTS } from "@/lib/adsense";

type Direction = "ACROSS" | "DOWN";
type Position = { row: number; column: number };
type CrosswordEntry = Position & {
  number: number;
  direction: Direction;
  length: number;
  clue: string;
};

export default function Crossword({
  roomId,
  playerId,
  stompClient,
  publicState,
  privateState,
  isHost,
}: {
  roomId: string;
  playerId: string;
  stompClient: any;
  publicState: any;
  privateState: any;
  isHost: boolean;
}) {
  const meta = publicState?.gameSpecificPublicData || {};
  const height = Number(meta.height) || 0;
  const width = Number(meta.width) || 0;
  const playable: boolean[][] = meta.playableCells || [];
  const entries = useMemo<CrosswordEntry[]>(
    () => meta.entries || [],
    [meta.entries],
  );
  const inputs = useRef<Array<Array<HTMLInputElement | null>>>([]);
  const [board, setBoard] = useState<string[][]>([]);
  const [activeCell, setActiveCell] = useState<Position | null>(null);
  const [direction, setDirection] = useState<Direction>("ACROSS");
  const [highlightedSolutionEntry, setHighlightedSolutionEntry] =
    useState<CrosswordEntry | null>(null);
  const [now, setNow] = useState(Date.now());
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(900);
  const players = Array.isArray(publicState?.players) ? publicState.players : [];
  const me = privateState?.self || players.find((player: any) => String(player.id) === String(playerId)) || {};
  const myStatus = me.status || "ACTIVE";
  const isFinished = myStatus === "COMPLETED" || myStatus === "GIVEN_UP";
  const serverNowMillis = Number(meta.serverNowMillis || 0);
  const playStartsAtMillis = Number(meta.playStartsAtMillis || 0);
  const serverNow = now + serverClockOffset;
  const isStarting = playStartsAtMillis > serverNow;
  const elapsedSeconds = Math.max(0, Math.floor((serverNow - playStartsAtMillis) / 1000));
  const finalElapsedSeconds = Math.floor(
    Number(me?.stats?.completionTimeMillis || me?.stats?.timeElapsedSeconds * 1000 || 0) / 1000,
  );
  const displayedSeconds = isFinished ? finalElapsedSeconds : elapsedSeconds;
  const solution: string[][] = privateState?.privateGameData?.solution || [];

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateViewport = () => setViewportHeight(window.innerHeight);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (serverNowMillis > 0) setServerClockOffset(serverNowMillis - Date.now());
  }, [serverNowMillis]);

  useEffect(() => {
    const incoming =
      privateState?.privateGameData?.playerBoard || privateState?.playerBoard;
    if (incoming) setBoard(incoming);
    else if (height && width)
      setBoard(Array.from({ length: height }, () => Array(width).fill("")));
  }, [privateState, height, width]);

  const entriesAt = (row: number, column: number) =>
    entries.filter((entry) => {
      const offset =
        entry.direction === "ACROSS" ? column - entry.column : row - entry.row;
      const fixedAxisMatches =
        entry.direction === "ACROSS"
          ? row === entry.row
          : column === entry.column;
      return fixedAxisMatches && offset >= 0 && offset < entry.length;
    });

  const selectedEntry = useMemo(() => {
    if (!activeCell) return undefined;
    return entriesAt(activeCell.row, activeCell.column).find(
      (entry) => entry.direction === direction,
    );
  }, [activeCell, direction, entries]);

  const clueStartNumbers = useMemo(() => {
    const numbers = new Map<string, number>();
    entries.forEach((entry) => {
      const key = `${entry.row}:${entry.column}`;
      const current = numbers.get(key);
      numbers.set(
        key,
        current ? Math.min(current, entry.number) : entry.number,
      );
    });
    return numbers;
  }, [entries]);
  const visibleBounds = useMemo(() => {
    let top = height;
    let bottom = -1;
    let left = width;
    let right = -1;
    playable.forEach((row, rowIndex) =>
      row.forEach((open, columnIndex) => {
        if (!open) return;
        top = Math.min(top, rowIndex);
        bottom = Math.max(bottom, rowIndex);
        left = Math.min(left, columnIndex);
        right = Math.max(right, columnIndex);
      }),
    );
    return bottom < 0
      ? { top: 0, bottom: Math.max(0, height - 1), left: 0, right: Math.max(0, width - 1) }
      : { top, bottom, left, right };
  }, [height, playable, width]);
  const visibleRows = visibleBounds.bottom - visibleBounds.top + 1;
  const visibleColumns = visibleBounds.right - visibleBounds.left + 1;
  const boardWidth = Math.max(
    240,
    Math.min(
      visibleColumns * 52,
      Math.floor(Math.max(320, viewportHeight - 270) * (visibleColumns / visibleRows)),
    ),
  );
  const playablePositions = useMemo(
    () =>
      Array.from({ length: visibleRows * visibleColumns }, (_, index) => ({
        row: visibleBounds.top + Math.floor(index / visibleColumns),
        column: visibleBounds.left + (index % visibleColumns),
      })),
    [visibleBounds, visibleColumns, visibleRows],
  );
  const sync = (next: string[][]) => {
    setBoard(next);
    stompClient?.publish({
      destination: `/app/game/${roomId}/move`,
      body: JSON.stringify({ type: "CROSSWORD_SYNC", playerId, board: next }),
    });
  };
  const focus = (position: Position) => {
    setActiveCell(position);
    inputs.current[position.row]?.[position.column]?.focus();
  };
  const chooseCell = (position: Position) => {
    const available = entriesAt(position.row, position.column);
    const isSameCell =
      activeCell?.row === position.row &&
      activeCell?.column === position.column;
    const nextDirection = isSameCell
      ? available.find((entry) => entry.direction !== direction)?.direction ||
        direction
      : available.find((entry) => entry.direction === direction)?.direction ||
        available[0]?.direction ||
        direction;
    setDirection(nextDirection);
    setActiveCell(position);
  };
  const nextPosition = (step: 1 | -1): Position | undefined => {
    if (!activeCell || !selectedEntry) return undefined;
    const currentIndex =
      direction === "ACROSS"
        ? activeCell.column - selectedEntry.column
        : activeCell.row - selectedEntry.row;
    const nextIndex = currentIndex + step;
    if (nextIndex < 0 || nextIndex >= selectedEntry.length) return undefined;
    return direction === "ACROSS"
      ? { row: selectedEntry.row, column: selectedEntry.column + nextIndex }
      : { row: selectedEntry.row + nextIndex, column: selectedEntry.column };
  };
  const change = (r: number, c: number, v: string) => {
    const next = board.map((row) => [...row]);
    const letter = v
      .slice(-1)
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    next[r][c] = letter;
    sync(next);
    if (letter) {
      const nextCell = nextPosition(1);
      if (nextCell) requestAnimationFrame(() => focus(nextCell));
    }
  };
  const fillFromPaste = (row: number, column: number, text: string) => {
    const letters = text.toUpperCase().replace(/[^A-Z]/g, "");
    const entry = entriesAt(row, column).find(
      (candidate) => candidate.direction === direction,
    );
    if (!letters || !entry) return;
    const offset =
      direction === "ACROSS" ? column - entry.column : row - entry.row;
    const next = board.map((existingRow) => [...existingRow]);
    letters
      .slice(0, entry.length - offset)
      .split("")
      .forEach((letter, index) => {
        const answerIndex = offset + index;
        const targetRow =
          direction === "ACROSS" ? entry.row : entry.row + answerIndex;
        const targetColumn =
          direction === "ACROSS" ? entry.column + answerIndex : entry.column;
        next[targetRow][targetColumn] = letter;
      });
    sync(next);
    const finalIndex = Math.min(offset + letters.length - 1, entry.length - 1);
    requestAnimationFrame(() =>
      focus(
        direction === "ACROSS"
          ? { row: entry.row, column: entry.column + finalIndex }
          : { row: entry.row + finalIndex, column: entry.column },
      ),
    );
  };
  const giveUp = () =>
    stompClient?.publish({
      destination: `/app/game/${roomId}/move`,
      body: JSON.stringify({ type: "CROSSWORD_GIVE_UP", playerId }),
    });

  const isHighlightedSolutionCell = (row: number, column: number) => {
    if (!highlightedSolutionEntry) return false;
    const offset =
      highlightedSolutionEntry.direction === "ACROSS"
        ? column - highlightedSolutionEntry.column
        : row - highlightedSolutionEntry.row;
    return (
      offset >= 0 &&
      offset < highlightedSolutionEntry.length &&
      (highlightedSolutionEntry.direction === "ACROSS"
        ? row === highlightedSolutionEntry.row
        : column === highlightedSolutionEntry.column)
    );
  };

  const standings = useMemo(
    () =>
      [...players].sort((first: any, second: any) => {
        const firstCompleted = first.status === "COMPLETED";
        const secondCompleted = second.status === "COMPLETED";
        if (firstCompleted !== secondCompleted) return firstCompleted ? -1 : 1;
        const firstSolved = Number(first.stats?.cluesSolved ?? first.score ?? 0);
        const secondSolved = Number(second.stats?.cluesSolved ?? second.score ?? 0);
        const firstTime = Number(
          first.stats?.completionTimeMillis ??
            (first.stats?.timeElapsedSeconds == null
              ? Infinity
              : first.stats.timeElapsedSeconds * 1000),
        );
        const secondTime = Number(
          second.stats?.completionTimeMillis ??
            (second.stats?.timeElapsedSeconds == null
              ? Infinity
              : second.stats.timeElapsedSeconds * 1000),
        );
        if (firstCompleted && secondCompleted && firstTime !== secondTime) return firstTime - secondTime;
        if (firstSolved !== secondSolved) return secondSolved - firstSolved;
        return firstTime - secondTime;
      }),
    [players],
  );

  return (
    <>
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-y-auto px-4 pb-6 pt-5 text-white xl:flex-row xl:gap-8">
      <section className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">
              {String(meta.category || "").replaceAll("_", " ")} crossword
            </p>
            <h1 className="mt-2 text-2xl font-black uppercase sm:text-4xl">
              {meta.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Select a clue, then type. The cursor advances through the selected
              answer.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-200">Time</p>
              <p className="font-mono text-xl font-black text-cyan-300">
                {isStarting ? "Starting" : formatTimeElapsed(displayedSeconds)}
              </p>
            </div>
            {!isFinished && (
              <button
                type="button"
                onClick={giveUp}
                disabled={isStarting}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Flag size={15} /> Give up
              </button>
            )}
          </div>
        </div>
        <div
          className="mt-5 grid max-w-full rounded border-4 border-zinc-600 bg-zinc-600"
          style={{
            width: `min(100%, ${boardWidth}px)`,
            gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))`,
          }}
        >
          {playablePositions.map(({ row: r, column: c }) => {
            const allowed = playable[r]?.[c];
            const isActive = activeCell?.row === r && activeCell?.column === c;
            const number = clueStartNumbers.get(`${r}:${c}`);
            return (
              <div key={`${r}:${c}`} className="relative aspect-square min-w-0">
                {number && (
                  <span className="pointer-events-none absolute left-0.5 top-0 z-10 text-[8px] font-black leading-none text-zinc-400">
                    {number}
                  </span>
                )}
                <input
                  ref={(element) => {
                    if (!inputs.current[r]) inputs.current[r] = [];
                    inputs.current[r][c] = element;
                  }}
                  aria-label={`row ${r + 1} column ${c + 1}`}
                  disabled={!allowed || isStarting || isFinished}
                  value={board[r]?.[c] || ""}
                  onFocus={() => setActiveCell({ row: r, column: c })}
                  onClick={() => chooseCell({ row: r, column: c })}
                  onChange={(event) => change(r, c, event.target.value)}
                  onPaste={(event) => {
                    event.preventDefault();
                    fillFromPaste(r, c, event.clipboardData.getData("text"));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !board[r]?.[c]) {
                      const previous = nextPosition(-1);
                      if (previous) {
                        event.preventDefault();
                        focus(previous);
                      }
                    }
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      setDirection("ACROSS");
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setDirection("DOWN");
                    }
                  }}
                  className={`size-full border border-zinc-700 text-center text-[clamp(0.75rem,2.3vw,1.25rem)] font-black outline-none ${allowed ? "bg-zinc-950 text-cyan-200 focus:bg-cyan-300/15" : "bg-zinc-800 text-transparent"} ${isActive ? "ring-2 ring-inset ring-fuchsia-300" : ""}`}
                />
              </div>
            );
          })}
        </div>
      </section>
      <aside className="mt-8 w-full rounded-2xl border border-white/10 bg-zinc-950/70 p-5 xl:mt-0 xl:max-w-md">
        <h2 className="text-sm font-black uppercase tracking-widest text-fuchsia-300">
          Clues
        </h2>
        <div className="mt-4 space-y-4">
          {(["ACROSS", "DOWN"] as Direction[]).map((clueDirection) => (
            <div key={clueDirection}>
              <p className="text-[10px] font-black tracking-[.2em] text-zinc-500">
                {clueDirection}
              </p>
              <ol className="mt-2 space-y-2">
                {entries
                  .filter((entry) => entry.direction === clueDirection)
                  .map((entry) => (
                    <li key={`${clueDirection}-${entry.number}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setDirection(clueDirection);
                          requestAnimationFrame(() => focus(entry));
                        }}
                        className={`w-full rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-white/10 ${selectedEntry?.number === entry.number && direction === clueDirection ? "bg-fuchsia-300/15 text-white" : "text-zinc-300"}`}
                      >
                        <b className="mr-2 text-cyan-300">{entry.number}.</b>
                        {entry.clue}
                      </button>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      </aside>
    </div>
    <ResultModal
      isOpen={isFinished}
      title={myStatus === "COMPLETED" ? "Crossword complete" : "Crossword ended"}
      players={standings}
      localPlayerName={me.name || "You"}
      localPlayerId={playerId}
      onRestart={
        isHost
          ? () =>
              stompClient?.publish({
                destination: `/app/game/${roomId}/restart`,
                body: "{}",
              })
          : undefined
      }
      restartLabel="Restart"
      returnHref="/crossword-quiz"
      returnLabel="Return to Crossword"
      adSlot={
        <AdSlot
          slot={ADSENSE_SLOTS.results}
          fixedSize={{ width: 300, height: 250 }}
          minHeightClassName="h-[250px]"
        />
      }
      sidePanel={
        <div className="h-full">
          <h3 className="mb-4 text-center text-[10px] font-black uppercase tracking-widest text-emerald-400">
            Correct solution
          </h3>
          {solution.length ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.9fr)_minmax(260px,1.1fr)]">
              <div className="flex justify-center xl:justify-start">
                <div
                  className="grid max-w-full rounded border-4 border-zinc-600 bg-zinc-600"
                  style={{
                    width: `min(100%, ${visibleColumns * 42}px)`,
                    gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))`,
                  }}
                >
                  {playablePositions.map(({ row, column }) => {
                    const allowed = playable[row]?.[column];
                    const highlighted = isHighlightedSolutionCell(row, column);
                    return (
                      <div
                        key={`${row}:${column}`}
                        className={`flex aspect-square min-w-0 items-center justify-center border border-zinc-700 text-sm font-black transition-colors sm:text-base ${allowed ? "bg-zinc-950 text-emerald-400" : "bg-zinc-800 text-transparent"} ${highlighted ? "bg-amber-300/25 text-amber-200 ring-1 ring-inset ring-amber-300" : ""}`}
                      >
                        {allowed ? solution[row]?.[column] : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="min-h-0 space-y-5 xl:max-h-[58dvh] xl:overflow-y-auto xl:pr-2">
                {(["ACROSS", "DOWN"] as Direction[]).map((clueDirection) => (
                  <section key={clueDirection}>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[.22em] text-fuchsia-300">
                      {clueDirection}
                    </p>
                    <div className="space-y-1.5">
                      {entries
                        .filter((entry) => entry.direction === clueDirection)
                        .map((entry) => {
                          const highlighted =
                            highlightedSolutionEntry?.number === entry.number &&
                            highlightedSolutionEntry?.direction === entry.direction;
                          return (
                            <button
                              key={`${entry.direction}-${entry.number}`}
                              type="button"
                              onMouseEnter={() => setHighlightedSolutionEntry(entry)}
                              onMouseLeave={() => setHighlightedSolutionEntry(null)}
                              onFocus={() => setHighlightedSolutionEntry(entry)}
                              onBlur={() => setHighlightedSolutionEntry(null)}
                              onClick={() => setHighlightedSolutionEntry(entry)}
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${highlighted ? "bg-amber-300/15 text-amber-100" : "bg-white/[.03] text-zinc-300 hover:bg-amber-300/10 hover:text-white"}`}
                            >
                              <span className="mr-2 font-black text-cyan-300">{entry.number}.</span>
                              {entry.clue}
                            </button>
                          );
                        })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-zinc-500">
              The solution will appear here once the result is confirmed.
            </p>
          )}
        </div>
      }
      renderStats={(player: any) => {
        const solved = Number(player.stats?.cluesSolved ?? player.score ?? 0);
        const seconds =
          Number(
            player.stats?.completionTimeMillis ??
              (player.stats?.timeElapsedSeconds == null
                ? 0
                : player.stats.timeElapsedSeconds * 1000),
          ) / 1000;
        return (
          <div>
            <p className="text-sm font-black text-cyan-300">{formatTimeElapsed(seconds)}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">
              {solved}/{entries.length} clues solved
            </p>
          </div>
        );
      }}
    />
    </>
  );
}
