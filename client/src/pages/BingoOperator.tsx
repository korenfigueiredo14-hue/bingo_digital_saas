import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play, Pause, Square, Zap, ZapOff, Trophy,
  ArrowLeft, Users, TicketCheck, Volume2, VolumeX
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const COL_LABELS = ["B", "I", "N", "G", "O"];
const COL_COLORS = [
  "bg-blue-600", "bg-yellow-500", "bg-red-600", "bg-green-600", "bg-purple-600"
];
const COL_TEXT = [
  "text-blue-400", "text-yellow-400", "text-red-400", "text-green-400", "text-purple-400"
];

function getColIndex(num: number) {
  if (num <= 15) return 0;
  if (num <= 30) return 1;
  if (num <= 45) return 2;
  if (num <= 60) return 3;
  return 4;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "pt-BR";
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

export default function BingoOperator() {
  const params = useParams<{ id: string }>();
  const roomId = Number(params.id);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [roomStatus, setRoomStatus] = useState<string>("draft");
  const [winners, setWinners] = useState<any[]>([]);
  const [animating, setAnimating] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [drawInterval, setDrawInterval] = useState(5);

  const { data: room, refetch: refetchRoom } = trpc.rooms.getById.useQuery(
    { id: roomId },
    { enabled: !!roomId && isAuthenticated }
  );
  const { data: cards } = trpc.cards.listByRoom.useQuery(
    { roomId },
    { enabled: !!roomId && isAuthenticated }
  );

  const startMutation = trpc.rooms.start.useMutation({
    onSuccess: () => { setRoomStatus("running"); refetchRoom(); toast.success("Bingo iniciado!"); },
    onError: (e) => toast.error(e.message),
  });
  const pauseMutation = trpc.rooms.pause.useMutation({
    onSuccess: () => { setRoomStatus("paused"); refetchRoom(); toast.info("Bingo pausado."); },
    onError: (e) => toast.error(e.message),
  });
  const finishMutation = trpc.rooms.finish.useMutation({
    onSuccess: () => { setRoomStatus("finished"); refetchRoom(); toast.success("Bingo encerrado!"); },
    onError: (e) => toast.error(e.message),
  });
  const drawMutation = trpc.draw.manual.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const autoStartMutation = trpc.draw.startAuto.useMutation({
    onSuccess: () => { setAutoEnabled(true); toast.success("Sorteio automático ativado!"); },
    onError: (e) => toast.error(e.message),
  });
  const autoStopMutation = trpc.draw.stopAuto.useMutation({
    onSuccess: () => { setAutoEnabled(false); toast.info("Sorteio automático parado."); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!room) return;
    setRoomStatus(room.status);
    setDrawInterval(room.drawIntervalSeconds ?? 5);
    if (room.autoDrawEnabled) setAutoEnabled(true);
  }, [room]);

  useEffect(() => {
    if (cards) setCardCount(cards.length);
  }, [cards]);

  useEffect(() => {
    if (!roomId) return;
    const socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_room", roomId);

    socket.on("number_drawn", (payload: { number: number; allDrawn: number[]; winners: any[] }) => {
      setDrawnNumbers(payload.allDrawn);
      setCurrentBall(payload.number);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 800);

      if (voiceEnabled) {
        const label = COL_LABELS[getColIndex(payload.number)];
        speak(`${label} ${payload.number}`);
      }

      if (payload.winners?.length) {
        setWinners((prev) => [...prev, ...payload.winners]);
        payload.winners.forEach((w: any) => {
          toast.success(`🏆 BINGO! ${w.playerName || `Cartela #${w.cardId}`} — ${w.winType === "full_card" ? "Cartela Cheia" : w.winType === "line" ? "Linha" : "Coluna"}`, { duration: 8000 });
          if (voiceEnabled) speak(`Bingo! Temos um ganhador!`);
        });
      }
    });

    socket.on("room_status_changed", (payload: { status: string }) => {
      setRoomStatus(payload.status);
    });

    return () => { socket.disconnect(); };
  }, [roomId]);

  // Countdown visual para sorteio automático
  useEffect(() => {
    if (!autoEnabled || roomStatus !== "running") {
      setCountdown(0);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    setCountdown(drawInterval);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return drawInterval;
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [autoEnabled, roomStatus, drawInterval]);

  const handleDraw = useCallback(() => {
    if (roomStatus !== "running") return;
    drawMutation.mutate({ roomId });
  }, [roomStatus, roomId]);

  const handleToggleAuto = () => {
    if (autoEnabled) {
      autoStopMutation.mutate({ roomId });
    } else {
      autoStartMutation.mutate({ roomId });
    }
  };

  const STATUS_LABELS: Record<string, string> = {
    draft: "Rascunho", open: "Aberto", running: "Ao Vivo 🔴", paused: "Pausado", finished: "Encerrado"
  };

  const drawnSet = new Set(drawnNumbers);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border/50 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/rooms/${roomId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-bold text-foreground text-sm leading-none">{room?.name ?? "Bingo"}</h1>
              <Badge className={`text-xs mt-1 ${roomStatus === "running" ? "bg-primary/20 text-primary animate-pulse" : "bg-muted text-muted-foreground"}`}>
                {STATUS_LABELS[roomStatus] ?? roomStatus}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><TicketCheck className="w-3.5 h-3.5" />{cardCount} cartelas</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{drawnNumbers.length}/75</span>
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={() => setVoiceEnabled((v) => !v)}
              title={voiceEnabled ? "Desativar voz" : "Ativar voz"}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
            {room?.publicSlug && (
              <Button size="sm" variant="outline" onClick={() => window.open(`/live/${room.publicSlug}`, "_blank")}>
                Tela Pública
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Coluna esquerda: controles + bola atual */}
          <div className="space-y-4">
            {/* Controles de status */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Controles</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    className="flex-col h-14 gap-1 text-xs"
                    disabled={roomStatus === "running" || roomStatus === "finished"}
                    onClick={() => startMutation.mutate({ id: roomId })}
                  >
                    <Play className="w-4 h-4" />
                    {roomStatus === "paused" ? "Retomar" : "Iniciar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-col h-14 gap-1 text-xs"
                    disabled={roomStatus !== "running"}
                    onClick={() => pauseMutation.mutate({ id: roomId })}
                  >
                    <Pause className="w-4 h-4" />
                    Pausar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-col h-14 gap-1 text-xs"
                    disabled={roomStatus === "finished" || roomStatus === "draft"}
                    onClick={() => finishMutation.mutate({ id: roomId })}
                  >
                    <Square className="w-4 h-4" />
                    Encerrar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bola atual */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4 flex flex-col items-center gap-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Último Número</p>
                {currentBall ? (
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl ${COL_COLORS[getColIndex(currentBall)]} ${animating ? "ball-pop" : ""} transition-all`}>
                    <div className="text-center">
                      <div className="text-sm font-bold text-white/80">{COL_LABELS[getColIndex(currentBall)]}</div>
                      <div className="text-4xl font-extrabold text-white leading-none">{currentBall}</div>
                    </div>
                    {animating && <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />}
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center">
                    <p className="text-muted-foreground text-xs text-center px-3">Aguardando...</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{drawnNumbers.length} de 75 sorteados</p>
              </CardContent>
            </Card>

            {/* Sorteio */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Sorteio</p>

                {/* Botão manual grande */}
                <Button
                  className="w-full h-16 text-lg font-bold relative overflow-hidden"
                  disabled={roomStatus !== "running" || autoEnabled || drawMutation.isPending}
                  onClick={handleDraw}
                >
                  {drawMutation.isPending ? (
                    <span className="animate-spin">🎱</span>
                  ) : (
                    <>🎱 Sortear Número</>
                  )}
                </Button>

                {/* Automático */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={autoEnabled ? "destructive" : "outline"}
                    className="flex-1 gap-2"
                    disabled={roomStatus !== "running"}
                    onClick={handleToggleAuto}
                  >
                    {autoEnabled ? <><ZapOff className="w-4 h-4" /> Parar Auto</> : <><Zap className="w-4 h-4" /> Auto ({drawInterval}s)</>}
                  </Button>
                  {autoEnabled && countdown > 0 && (
                    <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary font-bold text-sm">
                      {countdown}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ganhadores */}
            {winners.length > 0 && (
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-accent" />
                    <p className="text-sm font-bold text-foreground">Ganhadores ({winners.length})</p>
                  </div>
                  {winners.map((w, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-primary/10 text-xs">
                      <span className="font-medium text-foreground">{w.playerName || `Cartela #${w.cardId}`}</span>
                      <Badge className="bg-accent/20 text-accent text-xs">
                        {w.winType === "full_card" ? "Cheia" : w.winType === "line" ? "Linha" : "Coluna"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna direita: painel B-I-N-G-O completo */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border/50 h-full">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4 text-center">Painel B-I-N-G-O</p>
                <div className="grid grid-cols-5 gap-2">
                  {COL_LABELS.map((col, ci) => (
                    <div key={col} className="space-y-1.5">
                      {/* Header da coluna */}
                      <div className={`${COL_COLORS[ci]} text-white text-center font-extrabold text-xl py-2 rounded-lg shadow-md`}>
                        {col}
                      </div>
                      {/* Números */}
                      {Array.from({ length: 15 }, (_, i) => {
                        const num = ci * 15 + i + 1;
                        const isDrawn = drawnSet.has(num);
                        const isCurrent = num === currentBall;
                        return (
                          <div
                            key={num}
                            className={`
                              aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-300 cursor-default
                              ${isCurrent ? `${COL_COLORS[ci]} text-white shadow-lg scale-110 ring-2 ring-white/40` : ""}
                              ${isDrawn && !isCurrent ? `bg-primary/25 ${COL_TEXT[ci]} border border-primary/30` : ""}
                              ${!isDrawn ? "bg-secondary text-muted-foreground hover:bg-secondary/80" : ""}
                            `}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Histórico recente */}
                {drawnNumbers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Últimos sorteados</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[...drawnNumbers].reverse().slice(0, 15).map((n, i) => (
                        <div
                          key={`${n}-${i}`}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${COL_COLORS[getColIndex(n)]} ${i === 0 ? "ring-2 ring-white/50 scale-110" : "opacity-70"}`}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
