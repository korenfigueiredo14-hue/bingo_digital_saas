import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { io, Socket } from "socket.io-client";
import { Trophy, Ticket, Users } from "lucide-react";

// Mapeamento de coluna por número
function getColumn(n: number): string {
  if (n >= 1 && n <= 15) return "B";
  if (n >= 16 && n <= 30) return "I";
  if (n >= 31 && n <= 45) return "N";
  if (n >= 46 && n <= 60) return "G";
  return "O";
}

const COLUMN_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  B: { bg: "bg-blue-600",   text: "text-blue-400",   glow: "shadow-blue-500/60" },
  I: { bg: "bg-red-600",    text: "text-red-400",    glow: "shadow-red-500/60" },
  N: { bg: "bg-yellow-500", text: "text-yellow-400", glow: "shadow-yellow-500/60" },
  G: { bg: "bg-green-600",  text: "text-green-400",  glow: "shadow-green-500/60" },
  O: { bg: "bg-purple-600", text: "text-purple-400", glow: "shadow-purple-500/60" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:    { label: "Aguardando",  color: "text-white/50" },
  open:     { label: "Aberto",      color: "text-blue-400" },
  running:  { label: "AO VIVO 🔴", color: "text-red-400 animate-pulse" },
  paused:   { label: "Pausado",     color: "text-yellow-400" },
  finished: { label: "Encerrado",   color: "text-white/50" },
};

type WinnerEntry = {
  winner: {
    id: number;
    cardId: number;
    winType: string;
    prizeAmount: string | null;
    confirmedAt: Date;
  };
  card: {
    id: number;
    playerName?: string | null;
    playerPhone?: string | null;
  } | null;
};

type ShowData = {
  id: number;
  name: string;
  description?: string | null;
  status: string;
  currentBall: number | null;
  winCondition: string;
  prize: string | number | null;
  prizeDescription?: string | null;
  drawIntervalSeconds: number;
  drawnNumbers: number[];
  winners: WinnerEntry[];
  soldCount: number;
  publicSlug: string;
};

export default function BingoShow() {
  const { slug } = useParams<{ slug: string }>();
  const [showData, setShowData] = useState<ShowData | null>(null);
  const [animBall, setAnimBall] = useState<number | null>(null);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const [latestWinner, setLatestWinner] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevBallRef = useRef<number | null>(null);
  const prevWinnersRef = useRef<number>(0);

  const { data, refetch } = trpc.publicBuy.getShowData.useQuery(
    { slug: slug! },
    { enabled: !!slug, refetchInterval: 3000 }
  );

  useEffect(() => {
    if (data) {
      setShowData(data as ShowData);

      // Detectar novo número sorteado
      if (data.currentBall && data.currentBall !== prevBallRef.current) {
        prevBallRef.current = data.currentBall;
        setAnimBall(data.currentBall);
        // Síntese de voz
        if (typeof window !== "undefined" && window.speechSynthesis) {
          const col = getColumn(data.currentBall);
          const utter = new SpeechSynthesisUtterance(`${col} ${data.currentBall}`);
          utter.lang = "pt-BR";
          utter.rate = 0.85;
          window.speechSynthesis.speak(utter);
        }
        setTimeout(() => setAnimBall(null), 2500);
      }

      // Detectar novo ganhador
      if (data.winners.length > prevWinnersRef.current) {
        const newest = data.winners[data.winners.length - 1] as WinnerEntry | undefined;
        setLatestWinner((newest as any)?.card?.playerName ?? "Ganhador!");
        setShowWinnerOverlay(true);
        prevWinnersRef.current = data.winners.length;
        if (typeof window !== "undefined" && window.speechSynthesis) {
          const utter = new SpeechSynthesisUtterance("BINGO! Temos um ganhador!");
          utter.lang = "pt-BR";
          window.speechSynthesis.speak(utter);
        }
        setTimeout(() => setShowWinnerOverlay(false), 5000);
      }
    }
  }, [data]);

  // Socket.IO para atualizações em tempo real
  useEffect(() => {
    if (!showData?.id) return;
    const socket = io(window.location.origin, { path: "/socket.io" });
    socketRef.current = socket;
    socket.emit("join-room", showData.id);
    socket.on("number-drawn", () => refetch());
    socket.on("room-status-changed", () => refetch());
    socket.on("winner-declared", () => refetch());
    return () => { socket.disconnect(); };
  }, [showData?.id]);

  if (!showData) {
    return (
      <div className="min-h-screen bg-[#050d1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/50 text-lg">Carregando transmissão...</p>
        </div>
      </div>
    );
  }

  const drawn = showData.drawnNumbers ?? [];
  const currentBall = showData.currentBall;
  const currentCol = currentBall ? getColumn(currentBall) : null;
  const colColors = currentCol ? COLUMN_COLORS[currentCol] : null;
  const statusInfo = STATUS_LABELS[showData.status] ?? { label: showData.status, color: "text-white" };
  const prize = Number(showData.prize ?? 0);

  // Últimos 5 números (excluindo o atual)
  const recentNumbers = [...drawn].reverse().filter(n => n !== currentBall).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#050d1a] text-white overflow-hidden select-none">
      {/* Overlay de ganhador */}
      {showWinnerOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-8xl mb-4">🎉</div>
            <div className="text-6xl font-black text-yellow-400 drop-shadow-lg">BINGO!</div>
            {latestWinner && (
              <div className="text-3xl font-bold text-white mt-2">{latestWinner}</div>
            )}
          </div>
          {/* Confetes CSS */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ["#ffd700","#ff4444","#44ff44","#4444ff","#ff44ff"][i % 5],
                  animationDelay: `${Math.random() * 1}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Layout principal */}
      <div className="h-screen flex flex-col p-4 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{showData.name}</h1>
            <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
          <div className="flex items-center gap-4 text-right">
            {prize > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-xs font-bold">PRÊMIO</span>
                </div>
                <span className="text-white font-black text-xl">R$ {prize.toFixed(2)}</span>
              </div>
            )}
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Ticket className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-xs font-bold">CARTELAS</span>
              </div>
              <span className="text-white font-black text-xl">{showData.soldCount}</span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-green-400 text-xs font-bold">SORTEADOS</span>
              </div>
              <span className="text-white font-black text-xl">{drawn.length}/75</span>
            </div>
          </div>
        </div>

        {/* Área central */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Bola atual — destaque grande */}
          <div className="flex flex-col items-center justify-center w-64 shrink-0 gap-4">
            {/* Bola animada */}
            <div
              className={`
                relative flex items-center justify-center rounded-full
                transition-all duration-500
                ${animBall
                  ? `w-52 h-52 shadow-2xl ${colColors?.glow ?? ""}`
                  : "w-44 h-44"
                }
                ${colColors?.bg ?? "bg-white/10"}
              `}
              style={{
                boxShadow: animBall && colColors
                  ? `0 0 60px 20px ${colColors.glow.replace("shadow-","").replace("/60","")}`
                  : undefined,
              }}
            >
              {currentBall ? (
                <div className="text-center">
                  <div className="text-white/80 text-2xl font-black tracking-widest">{currentCol}</div>
                  <div className={`text-white font-black leading-none ${animBall ? "text-7xl" : "text-6xl"}`}>
                    {currentBall}
                  </div>
                </div>
              ) : (
                <div className="text-white/30 text-center">
                  <div className="text-4xl">?</div>
                  <div className="text-sm mt-1">Aguardando</div>
                </div>
              )}
            </div>

            {/* Últimos números */}
            <div className="w-full">
              <p className="text-white/40 text-xs text-center mb-2 uppercase tracking-widest">Últimos sorteados</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {recentNumbers.map((n) => {
                  const col = getColumn(n);
                  const cc = COLUMN_COLORS[col];
                  return (
                    <div
                      key={n}
                      className={`${cc.bg} text-white text-sm font-bold w-9 h-9 rounded-full flex items-center justify-center`}
                    >
                      {n}
                    </div>
                  );
                })}
                {recentNumbers.length === 0 && (
                  <span className="text-white/30 text-xs">Nenhum número sorteado</span>
                )}
              </div>
            </div>

            {/* Ganhadores */}
            {showData.winners.length > 0 && (
              <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-xs font-bold uppercase">Ganhadores</span>
                </div>
                <div className="space-y-1">
                  {showData.winners.slice(-3).map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-white font-semibold">{w.card?.playerName ?? "Jogador"}</span>
                      <span className="text-yellow-400/70">{w.winner.winType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Painel B-I-N-G-O completo */}
          <div className="flex-1 min-w-0">
            {/* Cabeçalho das colunas */}
            <div className="grid grid-cols-5 gap-1.5 mb-1.5">
              {["B","I","N","G","O"].map((col) => {
                const cc = COLUMN_COLORS[col];
                return (
                  <div key={col} className={`${cc.bg} text-white font-black text-center text-2xl py-2 rounded-lg`}>
                    {col}
                  </div>
                );
              })}
            </div>

            {/* Números 1-75 organizados por coluna */}
            <div className="grid grid-cols-5 gap-1.5">
              {["B","I","N","G","O"].map((col, ci) => {
                const start = ci * 15 + 1;
                const nums = Array.from({ length: 15 }, (_, i) => start + i);
                return (
                  <div key={col} className="space-y-1.5">
                    {nums.map((n) => {
                      const isDrawn = drawn.includes(n);
                      const isCurrent = n === currentBall;
                      const cc = COLUMN_COLORS[col];
                      return (
                        <div
                          key={n}
                          className={`
                            flex items-center justify-center rounded-lg font-bold text-sm
                            transition-all duration-300 aspect-square
                            ${isCurrent
                              ? `${cc.bg} text-white scale-110 shadow-lg`
                              : isDrawn
                                ? `${cc.bg} text-white opacity-90`
                                : "bg-white/5 text-white/30"
                            }
                          `}
                        >
                          {n}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between text-xs text-white/30 border-t border-white/10 pt-2">
          <span>bingodash-rclett3e.manus.space/buy/{slug} — Compre sua cartela</span>
          <span>{new Date().toLocaleTimeString("pt-BR")}</span>
        </div>
      </div>
    </div>
  );
}
