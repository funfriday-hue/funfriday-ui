"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import Wordle from "@/components/games/Wordle";
import Sudoku from "@/components/games/Sudoku";
import Leaderboard from "@/components/Leaderboard";
import WaitingRoom from "@/components/WaitingRoom";

const SOCKET_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? `${window.location.protocol}//${window.location.host}/ws`
  : "http://localhost:8080/ws";

// Helper hook to track a single universal server authority countdown loop safely
function useRoomCountdown(endTimeMillis: number) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endTimeMillis || endTimeMillis <= 0) {
      setSecondsRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const now = Date.now();
      const diff = endTimeMillis - now;
      return diff > 0 ? Math.floor(diff / 1000) : 0;
    };

    // Calculate immediate state to prevent starting delay flickers
    setSecondsRemaining(calculateRemaining());

    const ticker = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(ticker);
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, [endTimeMillis]);

  return secondsRemaining;
}

export default function RoomPage() {
  const { roomId } = useParams();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  
  // Track server errors dynamically to trigger row shakes in Wordle
  const [wordError, setWordError] = useState<{ id: number; message: string } | null>(null);
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    const savedName = Cookies.get("playerName");
    const savedId = Cookies.get("playerId");
    
    if (savedName) setPlayerName(savedName);
    if (savedId) setPlayerId(savedId);
  }, []);

  useEffect(() => {
    if (!playerName || !playerId || !roomId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL, null, { withCredentials: true } as any),
      onConnect: () => {
        setConnected(true);
        
        // Main room logic channel
        client.subscribe(`/topic/room/${roomId}`, (msg) => {
          setRoom(JSON.parse(msg.body));
        });

        // Global layout or lobby error queue fallback
        client.subscribe("/user/queue/errors", (msg) => {
          const errorData = JSON.parse(msg.body);
          alert(`Lobby Error [${errorData.status}]: ${errorData.error}`);
        });

        // Listen to targeted room error endpoints for live input validation
        client.subscribe(`/topic/room/${roomId}/player/${playerId}/errors`, (msg) => {
          setWordError({
            id: Date.now(),
            message: msg.body,
          });
        });

        client.publish({
          destination: `/app/game/${roomId}/join`,
          body: JSON.stringify({}), 
        });
      },
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate().catch((err) => {
        console.error("Error encountered while deactivating STOMP client: ", err);
      });
    };
  }, [roomId, playerName, playerId]);

  // Read backend state markers to supply countdown values
  const serverEndTime = room?.gameData?.endTimeMillis || 0;
  const gameModeType = room?.gameData?.gameConfiguration?.gameMode || "";
  const isTimeAttack = gameModeType.startsWith("TIME_");
  const secondsLeft = useRoomCountdown(serverEndTime);

  const handleStartGame = (configData: { gameMode: string; genericProperties: Record<string, any> }) => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/game/${roomId}/start`,
        body: JSON.stringify(configData),
      });
    }
  };

  const formatTimerDisplay = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderActiveGame = () => {
    const commonProps = {
      roomId: roomId as string,
      playerName: playerName!,
      playerId: playerId!,
      stompClient: stompClientRef.current!,
      gameState: room,
      secondsLeft: secondsLeft, // Pass absolute tracker time directly into sub-components
    };
    
    return room.type === "SUDOKU" ? (
      <Sudoku {...commonProps} />
    ) : (
      <Wordle {...commonProps} wordError={wordError} />
    );
  };

  if (!playerName || !playerId || !connected || !room) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-mono">
        <div className="animate-pulse mb-4 tracking-[0.5em]">ESTABLISHING PROTOCOL...</div>
        <div className="text-[10px] text-zinc-500 uppercase">Room: {roomId}</div>
      </div>
    );
  }

  const scoreBoardData = room.gameData?.scoreBoard || room.scoreBoard || {};
  const activePlayerMap = room.playerMap || {};
  
  const playersList = room.status === "WAITING" 
    ? Object.keys(activePlayerMap) 
    : Object.keys(scoreBoardData);

  const isHost = room.host?.id === playerId || activePlayerMap[playerId]?.host === true;
  const isUrgent = secondsLeft <= 30 && secondsLeft > 0;

  return (
    <div className="flex flex-row h-screen bg-[#0a0a0b] text-white overflow-hidden font-sans">
      <main className="flex-grow relative flex flex-col items-stretch justify-start overflow-y-auto">
        
        {/* GLOBAL TIME ATTACK COUNTDOWN TOP BANNER CHIP */}
        {room.status === "IN_PROGRESS" && isTimeAttack && secondsLeft > 0 && (
          <div className={`w-full py-2 px-6 text-[10px] font-black tracking-[0.25em] transition-colors duration-500 flex justify-between items-center shrink-0 z-50 shadow-md border-b
            ${isUrgent 
              ? 'bg-red-600 border-red-500 text-white animate-pulse' 
              : 'bg-zinc-950 border-white/5 text-cyan-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-white' : 'bg-cyan-400 animate-ping'}`} />
              TIME ATTACK POOL ACTIVE
            </span>
            <span className="font-mono text-sm bg-black/40 px-2.5 py-0.5 rounded-md border border-white/10 text-white shadow-inner">
              ⏱️ {formatTimerDisplay(secondsLeft)}
            </span>
          </div>
        )}

        <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto">
          {room.status === "WAITING" ? (
            <WaitingRoom
              roomId={roomId as string}
              roomType={room.type}
              players={playersList}
              playerMap={activePlayerMap}
              scoreBoard={scoreBoardData}
              isHost={isHost}
              onStart={handleStartGame}
            />
          ) : (
            renderActiveGame()
          )}
        </div>
      </main>

      <aside className="w-80 border-l border-white/5 bg-zinc-900/20 backdrop-blur-xl hidden lg:block overflow-y-auto">
        <Leaderboard scoreBoard={scoreBoardData} localPlayerId={playerId} />
      </aside>
    </div>
  );
}