import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { io, Socket } from "socket.io-client";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const COLS = [
  { label: "B", min: 1,  max: 15,  color: "#1565c0", glow: "#1e90ff" },
  { label: "I", min: 16, max: 30,  color: "#6a1b9a", glow: "#ab47bc" },
  { label: "N", min: 31, max: 45,  color: "#b71c1c", glow: "#ef5350" },
  { label: "G", min: 46, max: 60,  color: "#1b5e20", glow: "#66bb6a" },
  { label: "O", min: 61, max: 75,  color: "#e65100", glow: "#ffa726" },
];

function getColIdx(n: number) {
  if (n <= 15) return 0;
  if (n <= 30) return 1;
  if (n <= 45) return 2;
  if (n <= 60) return 3;
  return 4;
}
function getColLabel(n: number) { return COLS[getColIdx(n)].label; }
function getColColor(n: number) { return COLS[getColIdx(n)].color; }
function getColGlow(n: number)  { return COLS[getColIdx(n)].glow; }

// ─── BingoBall ────────────────────────────────────────────────────────────────
function BingoBall({ n, size = 48 }: { n: number; size?: number }) {
  const color = getColColor(n);
  const glow  = getColGlow(n);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `radial-gradient(circle at 32% 28%, ${glow}cc, ${color} 58%, #000b 100%)`,
      boxShadow: `0 0 ${size*0.25}px ${glow}88, inset 0 -3px 8px #0007`,
      border: `2px solid ${glow}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: "14%", left: "20%",
        width: "28%", height: "18%", borderRadius: "50%",
        background: "rgba(255,255,255,0.42)", filter: "blur(2px)",
      }}/>
      <span style={{ color: "#fff", fontWeight: 900, fontSize: size * 0.38, textShadow: "0 1px 4px #000a", lineHeight: 1 }}>
        {n}
      </span>
    </div>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 130 }, () => ({
  x: Math.random() * 100, y: Math.random() * 100,
  s: Math.random() * 2.2 + 0.4,
  o: Math.random() * 0.65 + 0.2,
  d: Math.random() * 4,
}));

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BingoShow() {
  const { slug } = useParams<{ slug: string }>();
  const [drawn, setDrawn]           = useState<number[]>([]);
  const [current, setCurrent]       = useState<number | null>(null);
  const [animKey, setAnimKey]       = useState(0);
  const [winners, setWinners]       = useState<any[]>([]);
  const [showBingo, setShowBingo]   = useState(false);
  const [bingoName, setBingoName]   = useState("");
  const prevBall   = useRef<number | null>(null);
  const prevWinLen = useRef(0);
  const socketRef  = useRef<Socket | null>(null);

  const { data: room, refetch } = trpc.publicBuy.getShowData.useQuery(
    { slug: slug! },
    { enabled: !!slug, refetchInterval: 3500 }
  );

  useEffect(() => {
    if (!room) return;
    const nums = (room.drawnNumbers ?? []).map((d: any) => typeof d === "number" ? d : d.number).filter(Boolean);
    setDrawn(nums);
    if (room.currentBall && room.currentBall !== prevBall.current) {
      prevBall.current = room.currentBall;
      setCurrent(room.currentBall);
      setAnimKey(k => k + 1);
      // Voz
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(`${getColLabel(room.currentBall)} ${room.currentBall}`);
        u.lang = "pt-BR"; u.rate = 0.85;
        window.speechSynthesis.speak(u);
      }
    }
    const w = room.winners ?? [];
    setWinners(w);
    if (w.length > prevWinLen.current) {
      prevWinLen.current = w.length;
      const last = w[w.length - 1];
      setBingoName(last?.card?.playerName ?? "Ganhador!");
      setShowBingo(true);
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance("BINGO! Temos um ganhador!");
        u.lang = "pt-BR"; window.speechSynthesis.speak(u);
      }
      setTimeout(() => setShowBingo(false), 5000);
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

  const prize      = Number(room?.prize ?? 0);
  const cardPrice  = Number(room?.cardPrice ?? 0.01);
  const soldCount  = room?.soldCount ?? 0;
  const accumulated = soldCount * cardPrice;
  const recentBalls = [...drawn].reverse().filter(n => n !== current).slice(0, 9);

  return (
    <div style={{
      minHeight: "100vh", height: "100vh",
      background: "linear-gradient(135deg,#020c1e 0%,#041637 40%,#071f4e 70%,#0a2762 100%)",
      color: "#fff", fontFamily: "'Segoe UI',Arial,sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
      userSelect: "none",
    }}>
      <style>{`
        @keyframes twinkle { 0%{opacity:.15} 100%{opacity:.9} }
        @keyframes ballIn  { 0%{transform:scale(.2) rotate(-30deg);opacity:0} 65%{transform:scale(1.18) rotate(4deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes winPop  { 0%{transform:scale(.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        .ball-in  { animation: ballIn .85s cubic-bezier(.175,.885,.32,1.275) forwards; }
        .blink    { animation: blink 1.2s ease-in-out infinite; }
        .win-pop  { animation: winPop .6s ease forwards; }
      `}</style>

      {/* Stars */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        {STARS.map((s,i) => (
          <div key={i} style={{
            position:"absolute", left:`${s.x}%`, top:`${s.y}%`,
            width:s.s, height:s.s, borderRadius:"50%", background:"#fff",
            opacity:s.o, animation:`twinkle 3s ${s.d}s infinite alternate`,
          }}/>
        ))}
      </div>

      {/* ── HEADER ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"8px 18px", flexShrink:0,
        background:"linear-gradient(90deg,#0b1d45 0%,#0a2560 50%,#0b1d45 100%)",
        borderBottom:"2px solid #1e90ff33", position:"relative", zIndex:10,
      }}>
        {/* AO VIVO + Nome */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div className="blink" style={{
            background:"#c62828", color:"#fff", fontWeight:900,
            fontSize:12, padding:"3px 9px", borderRadius:4, letterSpacing:1,
          }}>AO VIVO</div>
          <div>
            <div style={{
              fontSize:26, fontWeight:900, letterSpacing:2, textTransform:"uppercase",
              background:"linear-gradient(90deg,#fff 0%,#90caf9 50%,#fff 100%)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>{room?.name ?? "BINGO"}</div>
            {room?.prizeDescription && (
              <div style={{ fontSize:11, color:"#90caf9", marginTop:-2 }}>{room.prizeDescription}</div>
            )}
          </div>
        </div>

        {/* Prêmios */}
        <div style={{ display:"flex", gap:6 }}>
          {[
            { label:"Cartela",      value:`R$ ${cardPrice.toFixed(2)}`,                                     border:"#1e90ff44", lc:"#90caf9" },
            { label:"Acumulado",    value:`R$ ${accumulated.toFixed(2)}`,                                   border:"#ffa72644", lc:"#ffa726" },
            ...(Number(room?.prizeQuadra) > 0 ? [{ label:"\u25a0 Quadra",       value:`R$ ${Number(room?.prizeQuadra).toFixed(2)}`,  border:"#ff980044", lc:"#ff9800" }] : []),
            ...(Number(room?.prizeQuina)  > 0 ? [{ label:"\u25a0 Quina",        value:`R$ ${Number(room?.prizeQuina).toFixed(2)}`,   border:"#42a5f544", lc:"#42a5f5" }] : []),
            ...(Number(room?.prizeFullCard) > 0 ? [{ label:"\u25a0 Cartela Cheia", value:`R$ ${Number(room?.prizeFullCard).toFixed(2)}`, border:"#66bb6a44", lc:"#66bb6a" }] : []),
            ...(Number(room?.prizeQuadra) === 0 && Number(room?.prizeQuina) === 0 && Number(room?.prizeFullCard) === 0 ? [{ label:"Prêmio Total", value:`R$ ${prize.toFixed(2)}`, border:"#66bb6a44", lc:"#66bb6a" }] : []),
          ].map(item => (
            <div key={item.label} style={{
              background:"rgba(13,27,62,.9)", border:`1px solid ${item.border}`,
              borderRadius:8, padding:"5px 12px", textAlign:"center", minWidth:100,
            }}>
              <div style={{ fontSize:9, color:item.lc, textTransform:"uppercase", letterSpacing:1 }}>{item.label}</div>
              <div style={{ fontSize:16, fontWeight:900, color:"#fff" }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{
        flex:1, display:"grid",
        gridTemplateColumns:"200px 1fr 1fr",
        gap:8, padding:"8px 12px",
        position:"relative", zIndex:5, minHeight:0,
      }}>

        {/* ── ESQUERDA: lista de ganhadores / jogadores ── */}
        <div style={{
          background:"rgba(10,22,55,.88)", border:"1px solid #1e90ff2a",
          borderRadius:10, overflow:"hidden", display:"flex", flexDirection:"column",
        }}>
          <div style={{
            background:"linear-gradient(90deg,#1a3a7e,#0a2560)",
            padding:"7px 10px", fontSize:11, fontWeight:700,
            color:"#90caf9", textTransform:"uppercase", letterSpacing:1,
            borderBottom:"1px solid #1e90ff2a",
            display:"flex", justifyContent:"space-between",
          }}>
            <span>Jogadores</span>
            <span style={{ color:"#fff" }}>{soldCount}</span>
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {winners.length === 0 && soldCount === 0 && (
              <div style={{ textAlign:"center", color:"#3a5a8a", padding:"16px 8px", fontSize:11 }}>
                Aguardando vendas...
              </div>
            )}
            {winners.map((w: any, i: number) => {
              const card = w.card;
              const wt   = w.winner?.winType;
                  const wColor = wt === "full_card" ? "#ffa726" : wt === "quina" ? "#42a5f5" : wt === "quadra" ? "#ff9800" : wt === "line" ? "#66bb6a" : "#42a5f5";
                  const wLabel = wt === "full_card" ? "BINGO!" : wt === "quina" ? "QUINA" : wt === "quadra" ? "QUADRA" : wt === "line" ? "LINHA" : "COL";
                  return (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"5px 9px", borderBottom:"1px solid #1e90ff12",
                      background: i%2===0 ? "rgba(26,58,126,.18)" : "transparent",
                    }}>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>
                          {card?.playerName ?? `#${card?.id}`}
                        </div>
                        <div style={{ fontSize:9, color:"#3a5a8a" }}>
                          {card?.token?.slice(0,8).toUpperCase()}
                        </div>
                      </div>
                      <div style={{
                        background:wColor, color:"#fff", fontSize:9, fontWeight:700,
                        padding:"2px 5px", borderRadius:3, textTransform:"uppercase",
                      }}>
                        {wLabel}
                      </div>
                    </div>
                  );
            })}
          </div>
        </div>

        {/* ── CENTRO: Bola + histórico ── */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          {/* Contador */}
          <div style={{
            background:"rgba(10,22,55,.88)", border:"1px solid #1e90ff2a",
            borderRadius:10, padding:"6px 20px",
            display:"flex", alignItems:"center", gap:10, width:"100%", justifyContent:"center",
          }}>
            <span style={{ fontSize:30, fontWeight:900 }}>{drawn.length}</span>
            <span style={{ fontSize:12, color:"#90caf9", textTransform:"uppercase", letterSpacing:1 }}>
              BOLAS SORTEADAS
            </span>
          </div>

          {/* Bola grande */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {current ? (
              <div key={animKey} className="ball-in" style={{
                width:170, height:170, borderRadius:"50%",
                background:`radial-gradient(circle at 32% 28%,${getColGlow(current)}cc,${getColColor(current)} 55%,#000c 100%)`,
                boxShadow:`0 0 70px ${getColGlow(current)}88, 0 0 130px ${getColGlow(current)}33, inset 0 -10px 24px #0009`,
                border:`3px solid ${getColGlow(current)}88`,
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", position:"relative",
              }}>
                <div style={{
                  position:"absolute", top:"14%", left:"22%",
                  width:"28%", height:"18%", borderRadius:"50%",
                  background:"rgba(255,255,255,.45)", filter:"blur(5px)",
                }}/>
                <div style={{ fontSize:18, fontWeight:900, color:"rgba(255,255,255,.85)", letterSpacing:3 }}>
                  {getColLabel(current)}
                </div>
                <div style={{ fontSize:68, fontWeight:900, color:"#fff", lineHeight:1, textShadow:"0 2px 10px #000a" }}>
                  {current}
                </div>
              </div>
            ) : (
              <div style={{
                width:170, height:170, borderRadius:"50%",
                background:"radial-gradient(circle at 32% 28%,#1a3a7e,#0a1e3e)",
                border:"3px solid #1e90ff22",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#3a5a8a", fontSize:14, flexDirection:"column", gap:4,
              }}>
                <span style={{ fontSize:36 }}>?</span>
                <span>Aguardando</span>
              </div>
            )}
          </div>

          {/* Últimas bolas */}
          <div style={{
            background:"rgba(10,22,55,.88)", border:"1px solid #1e90ff2a",
            borderRadius:10, padding:"8px 10px", width:"100%",
          }}>
            <div style={{ fontSize:10, color:"#90caf9", textTransform:"uppercase", letterSpacing:1, textAlign:"center", marginBottom:6 }}>
              Últimas bolas
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
              {recentBalls.map((n,i) => <BingoBall key={n} n={n} size={i===0?46:38} />)}
              {recentBalls.length === 0 && (
                <span style={{ color:"#3a5a8a", fontSize:12 }}>Nenhuma bola sorteada</span>
              )}
            </div>
          </div>
        </div>

        {/* ── DIREITA: Painel B-I-N-G-O ── */}
        <div style={{
          background:"rgba(10,22,55,.88)", border:"1px solid #1e90ff2a",
          borderRadius:10, overflow:"hidden", display:"flex", flexDirection:"column",
        }}>
          {/* Cabeçalho colunas */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", flexShrink:0 }}>
            {COLS.map(col => (
              <div key={col.label} style={{
                background:col.color, textAlign:"center",
                padding:"7px 0", fontSize:22, fontWeight:900,
                color:"#fff", textShadow:"0 1px 5px #000a", letterSpacing:2,
              }}>{col.label}</div>
            ))}
          </div>

          {/* Grid de números */}
          <div style={{
            flex:1, display:"grid",
            gridTemplateColumns:"repeat(5,1fr)",
            gridTemplateRows:"repeat(15,1fr)",
            gap:2, padding:4,
          }}>
            {COLS.flatMap((col, ci) =>
              Array.from({ length: 15 }, (_, i) => {
                const num   = col.min + i;
                const isDrawn   = drawn.includes(num);
                const isCurrent = num === current;
                return (
                  <div key={num} style={{
                    display:"flex", alignItems:"center", justifyContent:"center",
                    borderRadius:4, fontSize:13,
                    fontWeight: isDrawn ? 900 : 400,
                    background: isCurrent
                      ? col.glow
                      : isDrawn
                        ? `${col.color}88`
                        : "rgba(255,255,255,.04)",
                    color: isDrawn ? "#fff" : "#2a4a7a",
                    border: isCurrent ? `2px solid ${col.glow}` : "1px solid transparent",
                    boxShadow: isCurrent ? `0 0 12px ${col.glow}aa` : "none",
                    transition:"all .3s ease",
                    aspectRatio:"1",
                  }}>
                    {String(num).padStart(2,"0")}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── RODAPÉ: Mini-cartelas dos ganhadores ── */}
      {winners.length > 0 && (
        <div style={{
          background:"rgba(10,22,55,.92)", borderTop:"1px solid #ffa72633",
          padding:"6px 12px", display:"flex", gap:10, overflowX:"auto",
          flexShrink:0, position:"relative", zIndex:5, alignItems:"center",
        }}>
          <div style={{
            fontSize:11, color:"#ffa726", fontWeight:700,
            textTransform:"uppercase", letterSpacing:1, flexShrink:0,
          }}>🏆 Ganhadores</div>
          {winners.slice(0,4).map((w: any, i: number) => {
            const card = w.card;
            const grid: number[][] = card?.grid ?? [];
            const marked: number[] = card?.markedNumbers ?? drawn;
            return (
              <div key={i} style={{
                background:"rgba(26,58,126,.5)", border:"1px solid #ffa72633",
                borderRadius:8, padding:"5px 7px", flexShrink:0,
              }}>
                <div style={{ fontSize:10, color:"#ffa726", fontWeight:700, marginBottom:3 }}>
                  {card?.playerName ?? `#${card?.id}`}
                  <span style={{ marginLeft:5, color:"#aaa", fontWeight:400 }}>
                    {w.winner?.winType === "full_card" ? "BINGO!" : w.winner?.winType === "quina" ? "QUINA" : w.winner?.winType === "quadra" ? "QUADRA" : w.winner?.winType === "line" ? "LINHA" : "COLUNA"}
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:1 }}>
                  {COLS.map((col, ci) => (
                    <div key={col.label}>
                      <div style={{
                        background:col.color, color:"#fff", fontSize:8,
                        fontWeight:900, textAlign:"center",
                        borderRadius:"2px 2px 0 0", padding:"1px 0",
                      }}>{col.label}</div>
                      {(grid[ci] ?? []).map((num: number, ri: number) => {
                        const isM = num === 0 || marked.includes(num);
                        return (
                          <div key={ri} style={{
                            background: num===0 ? "#555" : isM ? col.color : "#0a1e3e",
                            color:"#fff", fontSize:9, fontWeight:700,
                            textAlign:"center", padding:"2px 1px",
                            border:"1px solid #ffffff0f",
                          }}>
                            {num===0 ? "★" : num}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── OVERLAY BINGO ── */}
      {showBingo && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.75)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:200,
        }}>
          <div className="win-pop" style={{
            background:"linear-gradient(135deg,#e65100,#ffa726)",
            borderRadius:20, padding:"28px 56px", textAlign:"center",
            boxShadow:"0 0 80px #ffa72699",
          }}>
            <div style={{ fontSize:56 }}>🎉</div>
            <div style={{ fontSize:40, fontWeight:900, color:"#fff" }}>BINGO!</div>
            <div style={{ fontSize:20, color:"rgba(255,255,255,.9)", marginTop:4 }}>{bingoName}</div>
          </div>
          {/* Confetes */}
          <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
            {Array.from({length:24}).map((_,i) => (
              <div key={i} style={{
                position:"absolute",
                left:`${Math.random()*100}%`,
                top:`${Math.random()*100}%`,
                width:10, height:10, borderRadius:2,
                background:["#ffd700","#ff4444","#44ff44","#4488ff","#ff44ff"][i%5],
                animation:`twinkle .5s ${Math.random()*.8}s infinite alternate`,
              }}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
