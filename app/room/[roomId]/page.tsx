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

const SOCKET_URL = "http://localhost:8080/ws";

export default function RoomPage() {
  const { roomId } = useParams();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null); // NEW: Track UUID
  const [room, setRoom] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Extract both ID and Name from cookies
    const savedName = Cookies.get("playerName");
    const savedId = Cookies.get("playerId"); // This is the UUID b9feab...
    
    if (savedName) setPlayerName(savedName);
    if (savedId) setPlayerId(savedId);
  }, []);

  useEffect(() => {
    if (!playerName || !playerId || !roomId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL, null, { withCredentials: true }),
      
      onConnect: () => {
        setConnected(true);
        
        client.subscribe(`/topic/room/${roomId}`, (msg) => {
          setRoom(JSON.parse(msg.body));
        });

        // Backend identifies us via session/cookie
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
    return () => client.deactivate();
  }, [roomId, playerName, playerId]);

  const handleStartGame = () => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/game/${roomId}/start`,
        body: JSON.stringify({}), 
      });
    }
  };

  const renderActiveGame = () => {
    const commonProps = {
      roomId: roomId as string,
      playerName: playerName!,
      playerId: playerId!, // PASSING THE UUID
      stompClient: stompClientRef.current!,
      gameState: room,
    };
    return room.type === "SUDOKU" ? <Sudoku {...commonProps} /> : <Wordle {...commonProps} />;
  };

  if (!playerName || !playerId || !connected || !room) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-mono">
        <div className="animate-pulse mb-4 tracking-[0.5em]">ESTABLISHING PROTOCOL...</div>
        <div className="text-[10px] text-zinc-500 uppercase">Room: {roomId}</div>
      </div>
    );
  }

  // LOGIC FIX: Check host by ID or by the host flag in the scoreboard
  const scoreBoardData = room.gameData?.scoreBoard || room.scoreBoard || {};
  const isHost = scoreBoardData[playerId]?.player?.host === true || room.host?.id === playerId;
  
  const playersList = Object.keys(scoreBoardData);

  return (
    <div className="flex flex-row h-screen bg-[#0a0a0b] text-white overflow-hidden font-sans">
      <main className="flex-grow relative flex flex-col items-center overflow-hidden">
        {room.status === "WAITING" ? (
          <WaitingRoom
            roomId={roomId as string}
            players={playersList}
            scoreBoard={scoreBoardData}
            isHost={isHost}
            onStart={handleStartGame}
          />
        ) : (
          renderActiveGame()
        )}
      </main>

      <aside className="w-80 border-l border-white/5 bg-zinc-900/20 backdrop-blur-xl hidden lg:block overflow-y-auto">
        {/* Pass playerId to leaderboard to highlight "YOU" correctly */}
        <Leaderboard scoreBoard={scoreBoardData} localPlayerId={playerId} />
      </aside>
    </div>
  );
}