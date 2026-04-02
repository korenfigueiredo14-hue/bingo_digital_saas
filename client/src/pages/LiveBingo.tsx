import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

const COL_LABELS = ["B", "I", "N", "G", "O"];
const COL_COLORS = [
  "bg-blue-500", "bg-yellow-500", "bg-red-500", "bg-green-500", "bg-purple-500"
];

function getColumnColor(num: number): string {
  if (num <= 15) return COL_COLORS[0];
  if (num <= 30) return COL_COLORS[1];
  if (num <= 45) return COL_COLORS[2];
  if (num <= 60) return COL_COLORS[3];
  return COL_COLORS[4];
}

function getColumnLabel(num: number): string {
  if (num <= 15) return "B";
  if (num <= 30) return "I";
  if (num <= 45) return "N";
  if (num <= 60) return "G";
  return "O";
}

export default function LiveBingo() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const socketRef = useRef<Socket | null>(null);

  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [roomStatus, setRoomStatus] = useState<string>("draft");
  const [winners, setWinners] = useState<any[]>([]);
  const [animating, setAnimating] = useState(false);
  const [roomId, setRoomId] = useState<number | null>(null);

  const { data, isLoading } = trpc.rooms.getPublic.useQuery({ slug });

  useEffect(() => {
    if (!data) return;
    setDrawnNumbers(data.drawnNumbers);
    setRoomStatus(data.status);
    setRoomId(data.id);
    setWinners(data.winners ?? []);
    if (data.currentBall) setCurrentBall(data.currentBall);

    const socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_room", data.id);

    socket.on("number_drawn", (payload: { number: number; allDrawn: number[]; winners: any[] }) => {
      setDrawnNumbers(payload.allDrawn);
      setCurrentBall(payload.number);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 800);
      if (payload.winners?.length) {
        setWinners((prev) => [...prev, ...payload.winners]);
      }
    });

    socket.on("room_status_changed", (payload: { status: string }) => {
      setRoomStatus(payload.status);
    });

    socket.on("winner_announced", (payload: { winner: any }) => {
      setWinners((prev) => [...prev, payload.winner]);
    });

    return () => { socket.disconnect(); };
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">🎱</span>
          </div>
          <p className="text-muted-foreground">Carregando bingo ao vivo...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Sala não encontrada.</p>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, string> = {
    draft: "Aguardando",
    open: "Aberto",
    running: "AO VIVO",
    paused: "Pausado",
    finished: "Encerrado",
  };

  // Organizar números por coluna para o painel
  const byColumn: Record<string, number[]> = { B: [], I: [], N: [], G: [], O: [] };
  for (const n of drawnNumbers) {
    byColumn[getColumnLabel(n)].push(n);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={roomStatus === "running" ? "bg-primary/20 text-primary animate-pulse" : "bg-muted text-muted-foreground"}>
                {STATUS_LABELS[roomStatus] ?? roomStatus}
              </Badge>
              {data.prize && Number(data.prize) > 0 && (
                <span className="text-sm text-accent font-semibold">🏆 R${Number(data.prize).toFixed(2)}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Números sorteados</p>
            <p className="text-2xl font-bold text-foreground">{drawnNumbers.length}<span className="text-muted-foreground text-sm">/75</span></p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Número atual em destaque */}
        <div className="flex flex-col items-center gap-4">
          {currentBall ? (
            <>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Último número sorteado</p>
              <div className={`relative w-36 h-36 rounded-full flex items-center justify-center shadow-2xl ${getColumnColor(currentBall)} ${animating ? "ball-pop" : ""}`}>
                <div className="text-center">
                  <div className="text-lg font-bold text-white/80">{getColumnLabel(currentBall)}</div>
                  <div className="text-5xl font-extrabold text-white leading-none">{currentBall}</div>
                </div>
                {animating && (
                  <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />
                )}
              </div>
            </>
          ) : (
            <div className="w-36 h-36 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center">
              <p className="text-muted-foreground text-sm text-center px-4">Aguardando primeiro número...</p>
            </div>
          )}
        </div>

        {/* Painel de números por coluna */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4 text-center">Painel de Números</p>
          <div className="grid grid-cols-5 gap-2">
            {COL_LABELS.map((col, ci) => (
              <div key={col} className="space-y-2">
                <div className={`${COL_COLORS[ci]} text-white text-center font-extrabold text-lg py-2 rounded-lg`}>{col}</div>
                {Array.from({ length: 15 }, (_, i) => {
                  const num = ci * 15 + i + 1;
                  const isDrawn = drawnNumbers.includes(num);
                  const isCurrent = num === currentBall;
                  return (
                    <div
                      key={num}
                      className={`
                        aspect-square flex items-center justify-center rounded text-xs font-bold transition-all duration-300
                        ${isCurrent ? `${COL_COLORS[ci]} text-white shadow-lg scale-110` : ""}
                        ${isDrawn && !isCurrent ? "bg-primary/30 text-primary" : ""}
                        ${!isDrawn ? "bg-secondary text-muted-foreground" : ""}
                      `}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Histórico recente */}
        {drawnNumbers.length > 1 && (
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Histórico Recente</p>
            <div className="flex flex-wrap gap-2">
              {[...drawnNumbers].reverse().slice(0, 20).map((n, i) => (
                <div
                  key={`${n}-${i}`}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getColumnColor(n)} ${i === 0 ? "ring-2 ring-white/50 scale-110" : "opacity-80"}`}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ganhadores */}
        {winners.length > 0 && (
          <div className="bg-primary/10 rounded-xl border border-primary/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-accent" />
              <p className="font-bold text-foreground">Ganhadores</p>
            </div>
            <div className="space-y-2">
              {winners.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-primary/10">
                  <span className="text-sm font-medium text-foreground">
                    {w.playerName || `Cartela #${w.cardId}`}
                  </span>
                  <Badge className="bg-primary/20 text-primary text-xs">
                    {w.winType === "full_card" ? "Cartela Cheia" : w.winType === "line" ? "Linha" : "Coluna"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status encerrado */}
        {roomStatus === "finished" && (
          <div className="text-center py-8">
            <p className="text-2xl font-bold text-foreground mb-2">Bingo Encerrado!</p>
            <p className="text-muted-foreground">Obrigado por participar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
