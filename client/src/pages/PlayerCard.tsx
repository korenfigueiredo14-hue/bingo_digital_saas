import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Dices, ExternalLink } from "lucide-react";
import { toast } from "sonner";

function getColLabel(n: number) {
  if (n <= 15) return "B";
  if (n <= 30) return "I";
  if (n <= 45) return "N";
  if (n <= 60) return "G";
  return "O";
}

function getColColor(n: number) {
  if (n <= 15) return "bg-blue-600 text-white";
  if (n <= 30) return "bg-yellow-500 text-white";
  if (n <= 45) return "bg-red-600 text-white";
  if (n <= 60) return "bg-green-600 text-white";
  return "bg-purple-600 text-white";
}

export default function PlayerCard() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const socketRef = useRef<Socket | null>(null);

  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [roomStatus, setRoomStatus] = useState<string>("draft");
  const [isWinner, setIsWinner] = useState(false);
  const [winType, setWinType] = useState<string | null>(null);
  const [newBall, setNewBall] = useState(false);

  const { data, isLoading, error } = trpc.cards.getByToken.useQuery({ token });

  useEffect(() => {
    if (!data) return;
    setDrawnNumbers(data.drawnNumbers);
    setRoomStatus(data.room?.status ?? "draft");
    if (data.card.status === "winner") {
      setIsWinner(true);
    }

    const socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_card", token);

    socket.on("number_drawn", (payload: { number: number; allDrawn: number[] }) => {
      setDrawnNumbers(payload.allDrawn);
      setCurrentBall(payload.number);
      setNewBall(true);
      setTimeout(() => setNewBall(false), 1500);

      // Verificar se o número está na cartela (cardNumbers ou grid)
      const cardNums = (data?.card as any)?.cardNumbers as number[] | null;
      const grid = data?.card?.grid as number[][] | null;
      const isInCard = cardNums
        ? cardNums.includes(payload.number)
        : grid?.some((col) => col.includes(payload.number));
      if (isInCard) {
        toast.success(`🎱 ${payload.number} está na sua cartela!`, { duration: 2000 });
      }
    });

    socket.on("room_status_changed", (payload: { status: string }) => {
      setRoomStatus(payload.status);
    });

    socket.on("you_won", (payload: { winner: any }) => {
      setIsWinner(true);
      setWinType(payload.winner.winType);
      toast.success("🎉 BINGO! Você ganhou!", { duration: 10000 });
    });

    socket.on("winner_announced", (payload: { winner: any }) => {
      if (payload.winner.cardToken !== token) {
        toast.info(`🏆 Temos um ganhador!`, { duration: 5000 });
      }
    });

    return () => { socket.disconnect(); };
  }, [data, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Dices className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Carregando sua cartela...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-semibold">Cartela não encontrada.</p>
          <p className="text-muted-foreground text-sm mt-2">Verifique o QR Code e tente novamente.</p>
        </div>
      </div>
    );
  }

  const { card, room } = data;
  const drawnSet = new Set(drawnNumbers);

  // Suporte a ambos os formatos: 15 números (novo) ou grid 5x5 (legado)
  const cardNums: number[] = ((card as any).cardNumbers as number[] | null) ??
    (card.grid as number[][]).flat().filter((n: number) => n !== 0);

  const markedCount = cardNums.filter(n => drawnSet.has(n)).length;
  const totalNumbers = cardNums.length;
  const progressPct = totalNumbers > 0 ? Math.round((markedCount / totalNumbers) * 100) : 0;

  const winLabel = winType === "full_card" ? "Cartela Cheia!" :
    winType === "quina" ? "QUINA! 5 números!" :
    winType === "quadra" ? "QUADRA! 4 números!" :
    winType === "line" ? "Linha Completa" : "Coluna Completa";

  const prizeForWinType = winType === "full_card"
    ? (room as any)?.prizeFullCard
    : winType === "quina"
    ? (room as any)?.prizeQuina
    : winType === "quadra"
    ? (room as any)?.prizeQuadra
    : room?.prize;

  const STATUS_LABELS: Record<string, string> = {
    draft: "Aguardando início",
    open: "Aberto para vendas",
    running: "Ao Vivo! 🔴",
    paused: "Pausado",
    finished: "Encerrado",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border/50 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">B</div>
              <span className="font-bold text-sm text-foreground">{room?.name ?? "Bingo"}</span>
            </div>
            <Badge className={`text-xs mt-1 ${roomStatus === "running" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {STATUS_LABELS[roomStatus] ?? roomStatus}
            </Badge>
          </div>
          {room?.publicSlug && (
            <Button size="sm" variant="ghost" onClick={() => window.open(`/show/${room.publicSlug}`, "_blank")}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Ganhador */}
        {isWinner && (
          <div className="p-6 rounded-xl bg-primary/20 border border-primary text-center">
            <Trophy className="w-12 h-12 text-accent mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold text-foreground">BINGO!</h2>
            <p className="text-muted-foreground mt-1">{winLabel}</p>
            {prizeForWinType && Number(prizeForWinType) > 0 && (
              <p className="text-accent font-bold text-lg mt-2">Prêmio: R${Number(prizeForWinType).toFixed(2)}</p>
            )}
          </div>
        )}

        {/* Último número */}
        {currentBall && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Último número</p>
            <div className={`w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 ${newBall ? "ball-pop" : ""}`}>
              <div className="text-center">
                <div className="text-xs font-bold text-primary-foreground/70">{getColLabel(currentBall)}</div>
                <div className="text-2xl font-extrabold text-primary-foreground">{currentBall}</div>
              </div>
            </div>
          </div>
        )}

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{markedCount}/{totalNumbers} números marcados</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          {/* Indicadores de prêmio */}
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span className={markedCount >= 4 ? "text-orange-400 font-bold" : ""}>4 = Quadra</span>
            <span className={markedCount >= 5 ? "text-blue-400 font-bold" : ""}>5 = Quina</span>
            <span className={markedCount >= totalNumbers ? "text-green-400 font-bold" : ""}>{totalNumbers} = Bingo!</span>
          </div>
        </div>

        {/* Cartela com 15 números */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          {card.playerName && (
            <p className="text-center text-sm text-muted-foreground mb-3">
              Cartela de <strong className="text-foreground">{card.playerName}</strong>
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground mb-3 uppercase tracking-widest">Seus 15 números</p>

          {/* Grid de 15 números: 5 colunas × 3 linhas */}
          <div className="grid grid-cols-5 gap-2">
            {cardNums.map((num) => {
              const isMarked = drawnSet.has(num);
              const isNew = num === currentBall && newBall;
              return (
                <div
                  key={num}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-bold transition-all duration-300
                    ${isMarked ? getColColor(num) + " shadow-md scale-105" : "bg-secondary text-secondary-foreground border border-border"}
                    ${isNew ? "ball-pop ring-2 ring-white" : ""}
                  `}
                >
                  <span className="text-[9px] opacity-70 leading-none">{getColLabel(num)}</span>
                  <span className="leading-tight">{num}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prêmios disponíveis */}
        {!isWinner && (
          <div className="grid grid-cols-3 gap-2">
            {(room as any)?.prizeQuadra && Number((room as any).prizeQuadra) > 0 && (
              <div className="text-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-xs text-orange-400 font-bold">Quadra</p>
                <p className="text-sm font-bold text-foreground">R${Number((room as any).prizeQuadra).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">4 acertos</p>
              </div>
            )}
            {(room as any)?.prizeQuina && Number((room as any).prizeQuina) > 0 && (
              <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-blue-400 font-bold">Quina</p>
                <p className="text-sm font-bold text-foreground">R${Number((room as any).prizeQuina).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">5 acertos</p>
              </div>
            )}
            {(room as any)?.prizeFullCard && Number((room as any).prizeFullCard) > 0 && (
              <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <p className="text-xs text-green-400 font-bold">Bingo!</p>
                <p className="text-sm font-bold text-foreground">R${Number((room as any).prizeFullCard).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{totalNumbers} acertos</p>
              </div>
            )}
            {!(room as any)?.prizeQuadra && !(room as any)?.prizeQuina && !(room as any)?.prizeFullCard && room?.prize && Number(room.prize) > 0 && (
              <div className="col-span-3 text-center p-4 rounded-xl bg-accent/10 border border-accent/20">
                <p className="text-xs text-muted-foreground">Prêmio</p>
                <p className="text-xl font-bold text-accent">R${Number(room.prize).toFixed(2)}</p>
                {room.prizeDescription && <p className="text-xs text-muted-foreground mt-1">{room.prizeDescription}</p>}
              </div>
            )}
          </div>
        )}

        {/* Números sorteados */}
        {drawnNumbers.length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest">Números Sorteados ({drawnNumbers.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {drawnNumbers.map((n) => {
                const inCard = cardNums.includes(n);
                return (
                  <span
                    key={n}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${inCard ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
