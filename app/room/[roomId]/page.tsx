"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import Wordle from "@/components/games/Wordle";
import Sudoku from "@/components/games/Sudoku";
import Leaderboard from "@/components/Leaderboard";
import WaitingRoom from "@/components/WaitingRoom";
import { getSortedPlayers } from "@/utils/gameRules";

const SOCKET_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? `${window.location.protocol}//${window.location.host}/ws`
  : "http://localhost:8080/ws";

export default function RoomPage() {
  const { roomId } = useParams();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  
  const [publicRoom, setPublicRoom] = useState<any>(null);
  const [privateData, setPrivateData] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  
  const [wordError, setWordError] = useState<{ id: number; message: string } | null>(null);
  const stompClientRef = useRef<Client | null>(null);


  useEffect(() => {
    setPlayerName(Cookies.get("playerName") || null);
    setPlayerId(Cookies.get("playerId") || null);
  }, []);

  useEffect(() => {
    if (!playerName || !playerId || !roomId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL, null, { withCredentials: true } as any),
      onConnect: () => {
        setConnected(true);
        
        client.subscribe(`/topic/room/${roomId}`, (msg) => {
          try { setPublicRoom(JSON.parse(msg.body)); } catch (e) {}
        });

        client.subscribe(`/topic/room/${roomId}/player/${playerId}/state`, (msg) => {
          try { setPrivateData(JSON.parse(msg.body)); } catch (e) {}
        });

        client.subscribe(`/topic/room/${roomId}/player/${playerId}/errors`, (msg) => {
          setWordError({ id: Date.now(), message: msg.body });
        });

        client.publish({ destination: `/app/game/${roomId}/join`, body: JSON.stringify({}) });
      }
    });

    client.activate();
    stompClientRef.current = client;
    return () => { client.deactivate().catch(() => {}); };
  }, [roomId, playerName, playerId]);

  // Clean data parser for safe attribute reading
  const cleanPublic = useMemo(() => {
    if (!publicRoom) return null;
    return publicRoom.body ? JSON.parse(publicRoom.body) : publicRoom;
  }, [publicRoom]);

  // Read active game architecture mode type (SUDOKU vs WORDLE)
  const resolvedGameType = useMemo(() => {
    if (!cleanPublic) return "WORDLE";
    return cleanPublic.type || cleanPublic.gameType || "WORDLE";
  }, [cleanPublic]);

  // Dynamic extraction matching your backend remainingSeconds JSON payload schema
  const serverSecondsLeft = useMemo(() => {
    if (!cleanPublic) return 0;
    return (
      cleanPublic.gameSpecificPublicData?.remainingSeconds ?? 
      cleanPublic.secondsLeft ?? 
      cleanPublic.gameSpecificPublicData?.secondsLeft ?? 
      cleanPublic.timeLeft ?? 
      0
    );
  }, [cleanPublic]);

  // Synchronize public and private data layers to fix score rendering lag
const synchronizedPlayers = useMemo(() => {
  // 1. Validate that the players array exists in the public data
  if (!cleanPublic || !Array.isArray(cleanPublic.players)) {
    console.warn("DEBUG: No players found in cleanPublic!");
    return [];
  }

  // 2. Return the players array directly. 
  // No need to merge with privateData, as the score and stats 
  // are now correctly provided in the public state.
  return cleanPublic.players;
}, [cleanPublic]);

  // 1. Ensure sortedPlayers is robust
    const sortedPlayers = useMemo(() => {
      // If no players, return empty
      if (!synchronizedPlayers || synchronizedPlayers.length === 0) return [];
      
      // Use your rule engine
      return getSortedPlayers(synchronizedPlayers, resolvedGameType);
    }, [synchronizedPlayers, resolvedGameType]);

  if (!playerName || !playerId || !connected || !cleanPublic) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-mono">
        <div className="animate-pulse tracking-[0.4em] uppercase text-xs">CONNECTING UNIVERSE...</div>
      </div>
    );
  }

  // Determine global match status 
  const currentStatus = cleanPublic?.status || "WAITING";

  return (
    <div className="flex flex-row h-screen bg-black text-white overflow-hidden font-sans w-full">
      <main className="flex-grow relative flex flex-col items-stretch justify-start overflow-y-auto">
        <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto">
          
          {currentStatus === "WAITING" ? (
            <WaitingRoom 
              roomData={cleanPublic} 
              currentPlayerId={playerId} 
              stompClient={stompClientRef.current} 
            />
          ) : resolvedGameType === "SUDOKU" ? (
            <Sudoku 
              roomId={roomId as string}
              playerName={playerName}
              playerId={playerId!}
              stompClient={stompClientRef.current!}
              publicState={cleanPublic}
              privateState={privateData?.body ? JSON.parse(privateData.body) : privateData}
            />
          ) : (
            <Wordle 
              roomId={roomId as string}
              playerName={playerName}
              playerId={playerId!}
              stompClient={stompClientRef.current!}
              publicState={cleanPublic}
              privateState={privateData}
              wordError={wordError}
              secondsLeft={serverSecondsLeft}
              synchronizedPlayers={synchronizedPlayers}
            />
          )}

        </div>
      </main>

      {/* RIGHT SIDEBAR LAYOUT CONTAINER */}
      <aside className="w-80 border-l border-zinc-900 bg-black hidden lg:block overflow-y-auto shrink-0">
        <Leaderboard scoreBoard={sortedPlayers} localPlayerId={playerId} gameType={resolvedGameType as "WORDLE" | "SUDOKU"} />
      </aside>
    </div>
  );
}