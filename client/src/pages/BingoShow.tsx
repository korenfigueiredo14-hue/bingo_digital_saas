import { useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { io, Socket } from "socket.io-client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getColIdx(n: number) {
  if (n <= 18) return 0;
  if (n <= 36) return 1;
  if (n <= 54) return 2;
  if (n <= 72) return 3;
  return 4;
}

const COL_LABELS = ["B", "I", "N", "G", "O"];
const COL_COLORS = [
  { bg: "#1565c0", glow: "#1e90ff", light: "#90caf9" },
  { bg: "#6a1b9a", glow: "#ab47bc", light: "#ce93d8" },
  { bg: "#b71c1c", glow: "#ef5350", light: "#ef9a9a" },
  { bg: "#1b5e20", glow: "#66bb6a", light: "#a5d6a7" },
  { bg: "#e65100", glow: "#ffa726", light: "#ffcc80" },
];

function getColLabel(n: number) { return COL_LABELS[getColIdx(n)]; }
function getColBg(n: number)    { return COL_COLORS[getColIdx(n)].bg; }
function getColGlow(n: number)  { return COL_COLORS[getColIdx(n)].glow; }
function getColLight(n: number) { return COL_COLORS[getColIdx(n)].light; }

function formatR$(val: any) {
  const n = Number(val ?? 0);
  return n > 0 ? `R$ ${n.toFixed(2)}` : "—";
}

function winLabel(wt: string) {
  if (wt === "full_card") return "BINGO!";
  if (wt === "quina") return "QUINA";
  if (wt === "quadra") return "QUADRA";
  return wt?.toUpperCase() ?? "";
}

// ─── Stars ────────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 120 }, () => ({
  x: Math.random() * 100, y: Math.random() * 100,
  s: Math.random() * 2.2 + 0.4,
  o: Math.random() * 0.55 + 0.2,
  d: (Math.random() * 4).toFixed(1),
}));

// ─── BigBall ──────────────────────────────────────────────────────────────────
function BigBall({ n, animKey }: { n: number | null; animKey: number }) {
  if (!n) return (
    <div style={{
      width: 160, height: 160, borderRadius: "50%",
      background: "radial-gradient(circle at 35% 30%, #1e3a6a, #060e24)",
      border: "4px solid #1e90ff22",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 40px #1e90ff22",
    }}>
      <span style={{ color: "#1e3a6a", fontSize: 48, fontWeight: 900 }}>?</span>
    </div>
  );
  const bg   = getColBg(n);
  const glow = getColGlow(n);
  return (
    <div key={animKey} className="ball-in" style={{
      width: 160, height: 160, borderRadius: "50%", flexShrink: 0,
      background: `radial-gradient(circle at 32% 28%, ${glow}cc, ${bg} 55%, #000b 100%)`,
      boxShadow: `0 0 60px ${glow}88, 0 0 20px ${glow}44, inset 0 -6px 18px #0009`,
      border: `4px solid ${glow}55`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: "14%", left: "20%",
        width: "30%", height: "20%", borderRadius: "50%",
        background: "rgba(255,255,255,0.38)", filter: "blur(3px)",
      }} />
      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
        {getColLabel(n)}
      </span>
      <span style={{ color: "#fff", fontSize: 64, fontWeight: 900, lineHeight: 1, textShadow: "0 2px 8px #0008" }}>
        {n}
      </span>
    </div>
  );
}

// ─── MiniBall ─────────────────────────────────────────────────────────────────
function MiniBall({ n, size = 40 }: { n: number; size?: number }) {
  const bg   = getColBg(n);
  const glow = getColGlow(n);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `radial-gradient(circle at 32% 28%, ${glow}cc, ${bg} 55%, #000b 100%)`,
      boxShadow: `0 0 ${size * 0.3}px ${glow}66, inset 0 -2px 6px #0007`,
      border: `2px solid ${glow}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: "#fff", fontSize: size * 0.32, fontWeight: 900 }}>{n}</span>
    </div>
  );
}

// ─── Globo Animado com Bolas ──────────────────────────────────────────────────
function BingoGlobe({ drawn }: { drawn: number[] }) {
  // Bolas orbitando ao redor do globo
  const orbitBalls = drawn.slice(-6);
  return (
    <div style={{ position: "relative", width: 180, height: 180, flexShrink: 0 }}>
      {/* Globo central */}
      <div className="globe-spin" style={{
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle at 30% 25%, #1e5fa8cc, #0a2060 55%, #020c1e 100%)",
        boxShadow: "0 0 60px #1e90ff55, 0 0 120px #1e90ff22, inset 0 -10px 30px #0009",
        border: "3px solid #1e90ff44",
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Linhas do globo */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 18px,
              rgba(30,144,255,0.12) 18px,
              rgba(30,144,255,0.12) 19px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 18px,
              rgba(30,144,255,0.12) 18px,
              rgba(30,144,255,0.12) 19px
            )
          `,
        }} />
        {/* Reflexo */}
        <div style={{
          position: "absolute", top: "12%", left: "18%",
          width: "35%", height: "25%", borderRadius: "50%",
          background: "rgba(255,255,255,0.22)", filter: "blur(6px)",
        }} />
        {/* Bolas dentro do globo */}
        {drawn.slice(-3).map((n, i) => {
          const angle = (i / 3) * Math.PI * 2;
          const r = 42;
          const cx = 90 + Math.cos(angle) * r;
          const cy = 90 + Math.sin(angle) * r;
          return (
            <div key={n} style={{
              position: "absolute",
              left: cx - 18, top: cy - 18,
              width: 36, height: 36, borderRadius: "50%",
              background: `radial-gradient(circle at 32% 28%, ${getColGlow(n)}cc, ${getColBg(n)} 55%, #000b 100%)`,
              boxShadow: `0 0 12px ${getColGlow(n)}88`,
              border: `2px solid ${getColGlow(n)}66`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 900, color: "#fff",
              zIndex: 2,
            }}>{n}</div>
          );
        })}
      </div>
      {/* Bolas orbitando */}
      {orbitBalls.map((n, i) => {
        const angle = (i / orbitBalls.length) * 360;
        return (
          <div key={n} className={`orbit-ball-${i}`} style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: 28, height: 28,
            marginLeft: -14, marginTop: -14,
            borderRadius: "50%",
            background: `radial-gradient(circle at 32% 28%, ${getColGlow(n)}cc, ${getColBg(n)} 55%, #000b 100%)`,
            boxShadow: `0 0 10px ${getColGlow(n)}88`,
            border: `1.5px solid ${getColGlow(n)}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 900, color: "#fff",
            transform: `rotate(${angle}deg) translateX(100px) rotate(-${angle}deg)`,
            animation: `orbit${i} ${6 + i * 0.8}s linear infinite`,
          }}>{n}</div>
        );
      })}
    </div>
  );
}

// ─── WinnerMiniCard ───────────────────────────────────────────────────────────
function WinnerMiniCard({ card, drawnSet, label, labelColor }: {
  card: any; drawnSet: Set<number>; label: string; labelColor: string;
}) {
  const nums: number[] = card.cardNumbers
    ?? (card.grid as number[][]).flat().filter((n: number) => n !== 0);
  return (
    <div style={{
      background: "rgba(10,22,55,.9)", border: `1px solid ${labelColor}55`,
      borderRadius: 10, padding: "8px 10px", minWidth: 200,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: labelColor, fontWeight: 900, fontSize: 11 }}>{label}</span>
        <span style={{ color: "#90caf9", fontSize: 10 }}>#{card.token.slice(0, 8).toUpperCase()}</span>
      </div>
      {card.playerName && (
        <p style={{ color: "#fff", fontWeight: 700, fontSize: 11, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.playerName}
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
        {nums.map((num) => {
          const hit = drawnSet.has(num);
          return (
            <div key={num} style={{
              width: 26, height: 26, borderRadius: 4,
              background: hit
                ? `radial-gradient(circle at 35% 30%, ${getColGlow(num)}cc, ${getColBg(num)} 60%)`
                : "rgba(20,40,80,.7)",
              border: hit ? `1px solid ${getColGlow(num)}55` : "1px solid #1e3a6a",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: hit ? "#fff" : "#3a5a8a",
              fontSize: 9, fontWeight: 900,
            }}>
              {num}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CardMini (cartela compacta para rodapé) ──────────────────────────────────
function CardMini({ card, drawnSet }: { card: any; drawnSet: Set<number> }) {
  const nums: number[] = card.cardNumbers
    ?? (card.grid as number[][]).flat().filter((n: number) => n !== 0);
  const hits = nums.filter(n => drawnSet.has(n));
  return (
    <div style={{
      background: "rgba(8,18,48,.95)",
      border: "1px solid #1e90ff33",
      borderRadius: 10,
      padding: "8px 10px",
      flex: 1,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 6,
      }}>
        <span style={{
          color: "#90caf9", fontWeight: 700, fontSize: 11,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120,
        }}>
          {card.playerName ?? `#${card.token?.slice(0, 8).toUpperCase()}`}
        </span>
        <span style={{ color: "#ffa726", fontSize: 10, fontWeight: 900 }}>
          {hits.length}/{nums.length}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
        {nums.map((num) => {
          const hit = drawnSet.has(num);
          return (
            <div key={num} style={{
              aspectRatio: "1",
              borderRadius: 4,
              background: hit
                ? `radial-gradient(circle at 35% 30%, ${getColGlow(num)}cc, ${getColBg(num)} 60%)`
                : "rgba(20,40,80,.7)",
              border: hit ? `1px solid ${getColGlow(num)}55` : "1px solid #1e3a6a",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: hit ? "#fff" : "#3a5a8a",
              fontSize: 10, fontWeight: 900,
            }}>
              {num}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BingoShow() {
  const { slug } = useParams<{ slug: string }>();
  const [drawn, setDrawn]         = useState<number[]>([]);
  const [current, setCurrent]     = useState<number | null>(null);
  const [animKey, setAnimKey]     = useState(0);
  const [winners, setWinners]     = useState<any[]>([]);
  const [cards, setCards]         = useState<any[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState<string | null>(null);
  const [overlayName, setOverlayName] = useState("");
  const prevBall   = useRef<number | null>(null);
  const prevWinLen = useRef(0);
  const socketRef  = useRef<Socket | null>(null);

  const { data: room, refetch } = trpc.publicBuy.getShowData.useQuery(
    { slug: slug! },
    { enabled: !!slug, refetchInterval: 4000 }
  );

  useEffect(() => {
    if (!room) return;
    const nums = (room.drawnNumbers ?? [])
      .map((d: any) => typeof d === "number" ? d : d.number)
      .filter(Boolean);
    setDrawn(nums);
    if (room.currentBall && room.currentBall !== prevBall.current) {
      prevBall.current = room.currentBall;
      setCurrent(room.currentBall);
      setAnimKey(k => k + 1);
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(`${getColLabel(room.currentBall)} ${room.currentBall}`);
        u.lang = "pt-BR"; u.rate = 0.85;
        window.speechSynthesis.speak(u);
      }
    }
    const w = room.winners ?? [];
    setWinners(w);
    setCards((room as any).cards ?? []);
    if (w.length > prevWinLen.current) {
      prevWinLen.current = w.length;
      const last = w[w.length - 1];
      const wt: string = (last?.winner as any)?.winType ?? (last as any)?.winType ?? "full_card";
      const name: string = last?.card?.playerName ?? (last?.winner as any)?.playerName ?? "Ganhador!";
      setOverlayType(wt);
      setOverlayName(name);
      setShowOverlay(true);
      const msg = wt === "full_card" ? "BINGO! Cartela cheia!" : wt === "quina" ? "Temos uma Quina!" : "Temos uma Quadra!";
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(msg);
        u.lang = "pt-BR"; window.speechSynthesis.speak(u);
      }
      setTimeout(() => setShowOverlay(false), 6000);
    }
  }, [room]);

  useEffect(() => {
    if (!room?.id) return;
    const s = io(window.location.origin, { path: "/socket.io" });
    socketRef.current = s;
    s.emit("join-room", room.id);
    s.on("number-drawn", () => refetch());
    s.on("room-status-changed", () => refetch());
    s.on("winner-declared", () => refetch());
    return () => { s.disconnect(); };
  }, [room?.id]);

  const drawnSet = useMemo(() => new Set(drawn), [drawn]);
  const recentBalls = useMemo(() => [...drawn].reverse().filter(n => n !== current).slice(0, 9), [drawn, current]);
  const cardPrice   = Number(room?.cardPrice ?? 0.50);
  const soldCount   = room?.soldCount ?? 0;
  const accumulated = soldCount * cardPrice;
  const roomName    = room?.name ?? "Bingo da Sorte";
  const accumulatedEnabled = (room as any)?.accumulatedEnabled ?? false;
  const accumulatedPrize   = Number((room as any)?.accumulatedPrize ?? 0);
  const accumulatedEstablishment = (room as any)?.accumulatedEstablishment ?? "";
  const accumulatedMinBalls = Number((room as any)?.accumulatedMinBalls ?? 30);

  const quadraWinner = winners.find((w: any) => (w.winner?.winType ?? w.winType) === "quadra");
  const quinaWinner  = winners.find((w: any) => (w.winner?.winType ?? w.winType) === "quina");
  const bingoWinner  = winners.find((w: any) => (w.winner?.winType ?? w.winType) === "full_card");

  function findWinCard(winner: any) {
    if (!winner) return null;
    const cardId = winner.winner?.cardId ?? winner.cardId;
    return cards.find((c: any) => c.id === cardId) ?? null;
  }

  const numberGrid = useMemo(() =>
    Array.from({ length: 9 }, (_, row) =>
      Array.from({ length: 10 }, (_, col) => row * 10 + col + 1)
    ), []);

  // 3 cartelas para mostrar no rodapé
  const featuredCards = useMemo(() => {
    const winners3 = cards.filter((c: any) => c.status === "winner").slice(0, 3);
    if (winners3.length >= 3) return winners3;
    const nonWinners = cards.filter((c: any) => c.status !== "winner");
    return [...winners3, ...nonWinners].slice(0, 3);
  }, [cards]);

  const overlayColors: Record<string, { bg: string; border: string; label: string; emoji: string }> = {
    quadra:    { bg: "#7c2d12", border: "#f97316", label: "QUADRA!", emoji: "🟠" },
    quina:     { bg: "#1e3a8a", border: "#3b82f6", label: "QUINA!",  emoji: "🔵" },
    full_card: { bg: "#713f12", border: "#eab308", label: "BINGO!",  emoji: "⭐" },
  };
  const oc = (overlayType && overlayColors[overlayType]) ? overlayColors[overlayType] : overlayColors.full_card;

  // Gera keyframes de órbita para até 6 bolas
  const orbitKeyframes = Array.from({ length: 6 }, (_, i) => {
    const startAngle = (i / 6) * 360;
    return `
      @keyframes orbit${i} {
        from { transform: rotate(${startAngle}deg) translateX(100px) rotate(-${startAngle}deg); }
        to   { transform: rotate(${startAngle + 360}deg) translateX(100px) rotate(-${startAngle + 360}deg); }
      }
    `;
  }).join("\n");

  return (
    <div style={{
      minHeight: "100vh", height: "100vh",
      background: "linear-gradient(135deg,#020c1e 0%,#041637 40%,#071f4e 70%,#0a2762 100%)",
      color: "#fff", fontFamily: "'Segoe UI',Arial,sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
    }}>
      <style>{`
        @keyframes twinkle { 0%{opacity:.1} 100%{opacity:.85} }
        @keyframes ballIn  { 0%{transform:scale(.15) rotate(-25deg);opacity:0} 65%{transform:scale(1.2) rotate(3deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes winPop  { 0%{transform:scale(.4);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(255,200,0,.4)} 50%{box-shadow:0 0 0 12px rgba(255,200,0,0)} }
        @keyframes globeSpin { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }
        .ball-in { animation: ballIn .9s cubic-bezier(.175,.885,.32,1.275) forwards; }
        .blink   { animation: blink 1.2s ease-in-out infinite; }
        .win-pop { animation: winPop .6s ease forwards; }
        .globe-spin { animation: globeSpin 8s linear infinite; }
        ${orbitKeyframes}
      `}</style>

      {/* Stars */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {STARS.map((s, i) => (
          <div key={i} style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
            width: s.s, height: s.s, borderRadius: "50%", background: "#fff",
            opacity: s.o, animation: `twinkle 3s ${s.d}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* ── HEADER: KN da Sorte → Nome do Bingo ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", flexShrink: 0, position: "relative", zIndex: 10,
        background: "linear-gradient(90deg,#0b1d45 0%,#0a2560 50%,#0b1d45 100%)",
        borderBottom: "2px solid #1e90ff33",
      }}>
        {/* Logo / Nome do Bingo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="blink" style={{
            background: "#c62828", color: "#fff", fontWeight: 900,
            fontSize: 11, padding: "3px 8px", borderRadius: 4, letterSpacing: 1,
          }}>AO VIVO</div>
          {/* Nome do bingo em destaque — substitui "KN da Sorte" */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{
              fontSize: 30, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase",
              background: "linear-gradient(90deg,#ffd700 0%,#fff 40%,#90caf9 70%,#ffd700 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              textShadow: "none",
              lineHeight: 1,
            }}>{roomName}</div>
            <div style={{
              fontSize: 11, color: "#90caf9", letterSpacing: 4,
              textTransform: "uppercase", marginTop: 2,
            }}>DA SORTE</div>
          </div>
        </div>

        {/* Prêmios */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { label: "Cartela",       value: `R$ ${cardPrice.toFixed(2)}`,    border: "#1e90ff44", lc: "#90caf9" },
            ...(accumulatedEnabled ? [{ label: `★ Acumulado${accumulatedEstablishment ? ` (${accumulatedEstablishment})` : ""}`, value: `R$ ${accumulatedPrize.toFixed(2)}`, border: "#ffd70066", lc: "#ffd700" }] : [{ label: "Arrecadado", value: `R$ ${accumulated.toFixed(2)}`, border: "#ffa72644", lc: "#ffa726" }]),
            ...(Number(room?.prizeQuadra) > 0   ? [{ label: "■ Quadra",  value: `R$ ${Number(room?.prizeQuadra).toFixed(2)}`,   border: "#ff980044", lc: "#ff9800" }] : []),
            ...(Number(room?.prizeQuina) > 0    ? [{ label: "■ Quina",   value: `R$ ${Number(room?.prizeQuina).toFixed(2)}`,    border: "#42a5f544", lc: "#42a5f5" }] : []),
            ...(Number(room?.prizeFullCard) > 0 ? [{ label: "■ Bingo",   value: `R$ ${Number(room?.prizeFullCard).toFixed(2)}`, border: "#66bb6a44", lc: "#66bb6a" }] : []),
          ].map(item => (
            <div key={item.label} style={{
              background: "rgba(13,27,62,.9)", border: `1px solid ${item.border}`,
              borderRadius: 8, padding: "4px 12px", textAlign: "center", minWidth: 90,
            }}>
              <div style={{ fontSize: 9, color: item.lc, textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{item.value}</div>
            </div>
          ))}
          <div style={{
            background: "rgba(13,27,62,.9)", border: "1px solid #1e90ff33",
            borderRadius: 8, padding: "4px 12px", textAlign: "center", minWidth: 70,
          }}>
            <div style={{ fontSize: 9, color: "#90caf9", textTransform: "uppercase", letterSpacing: 1 }}>Bolas</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{drawn.length}/90</div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "210px 1fr 320px",
        gridTemplateRows: "1fr auto",
        gap: 8, padding: "8px 10px",
        position: "relative", zIndex: 5, minHeight: 0,
      }}>

        {/* ── ESQUERDA: Lista de cartelas (VERMELHO — topo a topo, sem gap) ── */}
        <div style={{
          gridRow: "1 / 3",   /* ocupa as 2 linhas do grid — topo a topo */
          background: "rgba(10,22,55,.85)",
          border: "1px solid #c6282844",
          borderLeft: "3px solid #c62828",
          borderRadius: 10, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Cabeçalho vermelho */}
          <div style={{
            background: "linear-gradient(90deg,#7f0000,#c62828,#7f0000)",
            padding: "8px 10px", fontSize: 11, fontWeight: 700,
            color: "#fff", textTransform: "uppercase", letterSpacing: 1,
            borderBottom: "1px solid #c6282866",
            display: "flex", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span>Cartelas Vendidas</span>
            <span style={{ background: "rgba(0,0,0,.3)", borderRadius: 4, padding: "1px 6px" }}>{soldCount}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cards.length === 0 && (
              <div style={{ textAlign: "center", color: "#3a5a8a", padding: "16px 8px", fontSize: 11 }}>
                Aguardando vendas...
              </div>
            )}
            {cards.slice(0, 40).map((card: any) => {
              const nums: number[] = card.cardNumbers
                ?? (card.grid as number[][]).flat().filter((n: number) => n !== 0);
              const hits = nums.filter(n => drawnSet.has(n));
              const isWinner = card.status === "winner";
              const pct = nums.length > 0 ? hits.length / nums.length : 0;
              const barColor = pct >= 1 ? "#ffa726" : pct >= 0.33 ? "#66bb6a" : "#c62828";
              return (
                <div key={card.id} style={{
                  padding: "6px 8px",
                  borderBottom: "1px solid #1a0a0a",
                  background: isWinner ? "rgba(198,40,40,.12)" : "transparent",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{
                      color: isWinner ? "#ffa726" : "#ef9a9a",
                      fontWeight: 700, fontSize: 10,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      maxWidth: 130,
                    }}>
                      {card.playerName ?? `#${card.token.slice(0, 8).toUpperCase()}`}
                    </span>
                    <span style={{
                      fontWeight: 900, fontSize: 10,
                      color: hits.length >= 15 ? "#ffa726" : hits.length >= 5 ? "#66bb6a" : hits.length >= 4 ? "#ff9800" : "#5a2a2a",
                    }}>
                      {hits.length}/{nums.length}
                    </span>
                  </div>
                  <div style={{ height: 3, background: "#1a0a0a", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct * 100}%`, background: barColor, transition: "width .4s" }} />
                  </div>
                  <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap" }}>
                    {hits.slice(-6).map((n: number) => (
                      <div key={n} style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: `radial-gradient(circle at 35% 30%, ${getColGlow(n)}cc, ${getColBg(n)} 60%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 900, color: "#fff",
                      }}>{n}</div>
                    ))}
                  </div>
                </div>
              );
            })}
            {cards.length > 40 && (
              <div style={{ textAlign: "center", color: "#5a2a2a", padding: "6px", fontSize: 10 }}>
                +{cards.length - 40} cartelas
              </div>
            )}
          </div>
        </div>

        {/* ── CENTRO: Globo + Bola + histórico + status ganhadores ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>

          {/* Globo girando + Bola atual */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {/* Globo animado com bolas */}
            <BingoGlobe drawn={drawn} />

            {/* Bola atual saindo do globo */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <BigBall n={current} animKey={animKey} />
            </div>

            <div style={{
              background: "rgba(13,27,62,.9)", border: "1px solid #1e90ff33",
              borderRadius: 10, padding: "6px 20px", textAlign: "center",
            }}>
              <span style={{ color: "#90caf9", fontSize: 13, fontWeight: 700 }}>
                {drawn.length} BOLAS SORTEADAS
              </span>
            </div>
          </div>

          {/* Histórico de bolas — SEM faixa verde, apenas bolas */}
          <div style={{ width: "100%" }}>
            <p style={{ color: "#3a5a8a", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, textAlign: "center", marginBottom: 8 }}>
              Últimas bolas
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {recentBalls.map((n, i) => <MiniBall key={`${n}-${i}`} n={n} size={38} />)}
            </div>
          </div>

          {/* Status dos prêmios */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { winner: quadraWinner, type: "quadra",    label: "QUADRA",  prize: room?.prizeQuadra,   color: "#ff9800", bg: "rgba(255,152,0,.12)" },
              { winner: quinaWinner,  type: "quina",     label: "QUINA",   prize: room?.prizeQuina,    color: "#42a5f5", bg: "rgba(66,165,245,.12)" },
              { winner: bingoWinner,  type: "full_card", label: "BINGO!",  prize: room?.prizeFullCard, color: "#ffa726", bg: "rgba(255,167,38,.12)" },
            ].map(({ winner, label, prize, color, bg }) => {
              const name = winner?.card?.playerName ?? winner?.playerName ?? winner?.winner?.playerName;
              return (
                <div key={label} style={{
                  background: winner ? bg : "rgba(13,27,62,.7)",
                  border: `1px solid ${winner ? color + "55" : "#1e3a6a"}`,
                  borderRadius: 10, padding: "8px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: winner ? color : "#1e3a6a",
                      boxShadow: winner ? `0 0 8px ${color}` : "none",
                    }} />
                    <span style={{ color, fontWeight: 900, fontSize: 13 }}>{label}</span>
                    {Number(prize) > 0 && (
                      <span style={{ color: "#90caf9", fontSize: 11 }}>{formatR$(prize)}</span>
                    )}
                  </div>
                  {winner ? (
                    <span className="win-pop" style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
                      🏆 {name ?? "Ganhador!"}
                    </span>
                  ) : (
                    <span style={{ color: "#1e3a6a", fontSize: 11 }}>Aguardando...</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── DIREITA: Painel 1-90 com GOLF/OMEGA → Nome do Bingo ── */}
        <div style={{
          background: "rgba(10,22,55,.85)", border: "1px solid #1e90ff22",
          borderRadius: 10, padding: "10px 8px",
          display: "flex", flexDirection: "column", gap: 8, overflow: "hidden",
        }}>
          {/* Header azul claro: nome do bingo em vez de GOLF / OMEGA */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "linear-gradient(90deg,#0d47a1,#1565c0,#0d47a1)",
            borderRadius: 8, padding: "6px 12px",
            border: "1px solid #1e90ff44",
            marginBottom: 2,
          }}>
            <span style={{
              color: "#90caf9", fontWeight: 900, fontSize: 13,
              letterSpacing: 2, textTransform: "uppercase",
            }}>
              {roomName}
            </span>
            <span style={{
              color: "#fff", fontWeight: 900, fontSize: 13,
              letterSpacing: 2, textTransform: "uppercase",
            }}>
              DA SORTE
            </span>
          </div>

          {/* Header B-I-N-G-O */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, marginBottom: 2 }}>
            {COL_LABELS.map((col, i) => (
              <div key={col} style={{
                textAlign: "center", fontWeight: 900, fontSize: 16,
                color: COL_COLORS[i].light,
              }}>{col}</div>
            ))}
          </div>

          {/* Grid 9×10 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {numberGrid.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 2 }}>
                {row.map((num) => {
                  const hit = drawnSet.has(num);
                  return (
                    <div key={num} style={{
                      aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 4, fontSize: 10, fontWeight: 700,
                      transition: "all .3s",
                      background: hit
                        ? `radial-gradient(circle at 35% 30%, ${getColGlow(num)}cc, ${getColBg(num)} 60%)`
                        : "rgba(20,40,80,.6)",
                      border: hit ? `1px solid ${getColGlow(num)}44` : "1px solid #0d1f4a",
                      color: hit ? "#fff" : "#1e3a6a",
                      transform: hit ? "scale(1.05)" : "scale(1)",
                      boxShadow: hit ? `0 0 6px ${getColGlow(num)}44` : "none",
                    }}>
                      {num}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Mini-cartelas dos ganhadores */}
          {(quadraWinner || quinaWinner || bingoWinner) && (
            <div style={{ borderTop: "1px solid #1e3a6a", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ color: "#ffa726", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, textAlign: "center" }}>
                Ganhadores
              </p>
              {[
                { winner: quadraWinner, label: "🟠 QUADRA", color: "#ff9800" },
                { winner: quinaWinner,  label: "🔵 QUINA",  color: "#42a5f5" },
                { winner: bingoWinner,  label: "⭐ BINGO!",  color: "#ffa726" },
              ].filter(({ winner }) => winner).map(({ winner, label, color }) => {
                const winCard = findWinCard(winner);
                if (!winCard) return null;
                return (
                  <WinnerMiniCard
                    key={`${winner.cardId}-${winner.winType}`}
                    card={winCard}
                    drawnSet={drawnSet}
                    label={label}
                    labelColor={color}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── RODAPÉ: 3 cartelas em destaque (BRANCO) ── */}
        {featuredCards.length > 0 && (
          <div style={{
            gridColumn: "2 / 3",   /* só na coluna do centro */
            display: "flex", gap: 8, alignItems: "stretch",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10, padding: "8px",
          }}>
            {featuredCards.map((card: any) => (
              <CardMini key={card.id} card={card} drawnSet={drawnSet} />
            ))}
            {/* Preenche espaços vazios se menos de 3 cartelas */}
            {featuredCards.length < 3 && Array.from({ length: 3 - featuredCards.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                flex: 1, borderRadius: 10,
                background: "rgba(20,40,80,.3)",
                border: "1px dashed #1e3a6a",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#1e3a6a", fontSize: 11 }}>Aguardando...</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── OVERLAY DE VITÓRIA ── */}
      {showOverlay && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,10,.82)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowOverlay(false)}
        >
          <div className="win-pop" style={{
            background: `linear-gradient(135deg, ${oc.bg}, #020c1e)`,
            border: `3px solid ${oc.border}`,
            borderRadius: 24, padding: "48px 64px",
            textAlign: "center", maxWidth: 480,
            boxShadow: `0 0 80px ${oc.border}66`,
          }}>
            <div style={{ fontSize: 72, marginBottom: 8 }}>{oc.emoji}</div>
            <div style={{
              fontSize: 56, fontWeight: 900, color: oc.border,
              textShadow: `0 0 30px ${oc.border}`,
              letterSpacing: 4, marginBottom: 8,
            }}>{oc.label}</div>
            <div style={{ fontSize: 22, color: "#fff", fontWeight: 700, marginBottom: 4 }}>
              {overlayName}
            </div>
            <div style={{ fontSize: 13, color: "#90caf9", marginTop: 16 }}>
              Clique para fechar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
