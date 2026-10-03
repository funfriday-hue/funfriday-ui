"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import Wordle from "@/components/games/Wordle";
import Sudoku from "@/components/games/Sudoku";
import Dobble from "@/components/games/Dobble";
import QuizRoyale from "@/components/games/QuizRoyale";
import Leaderboard from "@/components/Leaderboard";
import WaitingRoom from "@/components/WaitingRoom";
import { getSortedPlayers } from "@/utils/gameRules";

const SOCKET_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? `${window.location.protocol}//${window.location.host}/ws`
  : "http://localhost:8080/ws";

export default function RoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [admissionChecked, setAdmissionChecked] = useState(false);
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);
  
  const [publicRoom, setPublicRoom] = useState<any>(null);
  const [privateData, setPrivateData] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  
  const [wordError, setWordError] = useState<{ id: number; message: string } | null>(null);
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    const savedName = Cookies.get("playerName") || "";
    setPlayerName(savedName || null);
    setPlayerId(Cookies.get("playerId") || null);
    setJoinName(savedName);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const roomCode = Array.isArray(roomId) ? roomId[0] : roomId;
    const admittedFromHome = sessionStorage.getItem("funfriday-room-admission") === roomCode;
    setShowJoinPrompt(!admittedFromHome);
    setAdmissionChecked(true);
  }, [roomId]);

  const joinRoomFromLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const roomCode = Array.isArray(roomId) ? roomId[0] : roomId;
    if (!roomCode || !joinName.trim()) {
      setJoinError("Enter your name to join this room.");
      return;
    }
    setJoiningRoom(true);
    setJoinError("");
    try {
      const isProduction = window.location.hostname !== "localhost";
      const baseApiUrl = isProduction ? "/api" : "http://localhost:8080/api";
      const response = await fetch(`${baseApiUrl}/rooms/join/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: joinName.trim() }),
        credentials: "include"
      });
      if (!response.ok) throw new Error(await response.text() || "Unable to join this room.");
      Cookies.set("playerName", joinName.trim(), { expires: 1, path: "/" });
      sessionStorage.setItem("funfriday-room-admission", roomCode);
      window.location.reload();
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to join this room.");
      setJoiningRoom(false);
    }
  };

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
          if (msg.body === "KICKED_FROM_ROOM") {
            client.deactivate().catch(() => {});
            router.replace("/");
            return;
          }
          setWordError({ id: Date.now(), message: msg.body });
        });

        client.publish({ destination: `/app/game/${roomId}/join`, body: JSON.stringify({}) });
      }
    });

    client.activate();
    stompClientRef.current = client;
    return () => { client.deactivate().catch(() => {}); };
  }, [roomId, playerName, playerId]);

  const cleanPublic = useMemo(() => {
    if (!publicRoom) return null;
    return publicRoom.body ? JSON.parse(publicRoom.body) : publicRoom;
  }, [publicRoom]);

  const resolvedGameType = useMemo(() => {
    if (!cleanPublic) return "WORDLE";
    return cleanPublic.type || cleanPublic.gameType || "WORDLE";
  }, [cleanPublic]);

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

  const synchronizedPlayers = useMemo(() => {
    if (!cleanPublic || !Array.isArray(cleanPublic.players)) {
      console.warn("DEBUG: No players found in cleanPublic!");
      return [];
    }
    return cleanPublic.players;
  }, [cleanPublic]);

  const sortedPlayers = useMemo(() => {
    if (!synchronizedPlayers || synchronizedPlayers.length === 0) return [];
    return getSortedPlayers(synchronizedPlayers, resolvedGameType);
  }, [synchronizedPlayers, resolvedGameType]);

  if (!admissionChecked) {
    return <div className="h-screen bg-black" />;
  }

  if (showJoinPrompt) {
    const roomCode = Array.isArray(roomId) ? roomId[0] : roomId;
    return <main className="flex min-h-screen items-center justify-center bg-[#090a0f] p-5 text-white"><section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-950 p-7 shadow-2xl"><p className="font-mono text-[10px] font-bold uppercase tracking-[.35em] text-cyan-400">FunFriday / room access</p><h1 className="mt-3 text-3xl font-black uppercase">Join the room</h1><p className="mt-2 text-sm text-zinc-400">Confirm your name to enter this multiplayer room.</p><form onSubmit={joinRoomFromLink} className="mt-7 space-y-4"><label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Room code</span><input value={roomCode || ""} readOnly className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 font-mono font-black tracking-[.25em] text-zinc-300 outline-none" /></label><label className="block"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Your name</span><input value={joinName} onChange={event => setJoinName(event.target.value)} autoFocus required maxLength={40} placeholder="Enter your name" className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 font-semibold outline-none focus:border-cyan-400" /></label>{joinError && <p className="text-sm text-rose-300">{joinError}</p>}<button disabled={joiningRoom} className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50">{joiningRoom ? "Joining…" : "Join room"}</button></form></section></main>;
  }

  if (!playerName || !playerId || !connected || !cleanPublic) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white font-mono">
        <div className="animate-pulse tracking-[0.4em] uppercase text-xs">CONNECTING UNIVERSE...</div>
      </div>
    );
  }

  const currentStatus = cleanPublic?.status || "WAITING";
  const roomPlayers = cleanPublic?.players || [];
  const isRoomHost = cleanPublic?.host?.id === playerId
    || cleanPublic?.hostId === playerId
    || roomPlayers.some((player: any) => String(player?.id) === String(playerId) && (player?.host === true || player?.isHost === true));

// roomId/page.tsx

return (
  <div className={`flex w-full bg-black text-white font-sans select-none ${currentStatus === "WAITING" ? "min-h-[100dvh] overflow-y-auto" : "h-[100dvh] overflow-hidden"}`}>
    
    {/* MAIN GAME ARENA CONTAINER */}
    <main className={`relative flex-grow min-h-0 flex flex-col items-stretch justify-between pt-6 ${currentStatus === "WAITING" ? "overflow-visible" : "overflow-hidden"}`}> 
      
      {/* GAME WRAPPER */}
      <div className={`flex-1 min-h-0 w-full flex flex-col items-stretch px-4 pb-4 ${currentStatus === "WAITING" ? "justify-start overflow-visible" : "justify-center overflow-hidden"}`}>
        
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
            isHost={isRoomHost}
          />
        ) : resolvedGameType === "DOBBLE" ? (
          <Dobble
            roomId={roomId as string}
            playerName={playerName}
            playerId={playerId!}
            stompClient={stompClientRef.current!}
            publicState={cleanPublic}
            privateState={privateData?.body ? JSON.parse(privateData.body) : privateData}
            synchronizedPlayers={synchronizedPlayers}
            moveError={wordError}
          />
        ) : resolvedGameType === "QUIZ_ROYALE" ? (
          <QuizRoyale roomId={roomId as string} playerId={playerId!} playerName={playerName} stompClient={stompClientRef.current!} publicState={cleanPublic} synchronizedPlayers={synchronizedPlayers} />
        ) : (
        <div className="w-full h-full flex flex-col overflow-hidden">
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
            isHost={isRoomHost}
          />
      </div>
          
        )}

      </div>
    </main>

    {/* RIGHT SIDEBAR LAYOUT CONTAINER */}
    <aside className="w-80 border-l border-zinc-900 bg-black hidden lg:block overflow-y-auto shrink-0">
      <Leaderboard scoreBoard={sortedPlayers} localPlayerName={playerName} activePlayerId={cleanPublic?.gameSpecificPublicData?.currentPlayerId} gameType={resolvedGameType} />
    </aside>
  </div>
);
}
