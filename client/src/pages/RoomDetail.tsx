import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowLeft, Play, Pause, Square, Dices, TicketCheck,
  Trophy, ExternalLink, Printer, RefreshCw, Zap, ZapOff, Copy
} from "lucide-react";

const COL_LABELS = ["B", "I", "N", "G", "O"];
const COL_COLORS = [
  "text-blue-400", "text-yellow-400", "text-red-400", "text-green-400", "text-purple-400"
];

function BingoGrid({ grid }: { grid: number[][] }) {
  return (
    <div className="grid grid-cols-5 gap-1 w-full max-w-xs mx-auto">
      {COL_LABELS.map((col, ci) => (
        <div key={col} className={`text-center font-bold text-sm py-1 ${COL_COLORS[ci]}`}>{col}</div>
      ))}
      {Array.from({ length: 5 }, (_, row) =>
        grid.map((col, ci) => {
          const num = col[row];
          const isFree = num === 0;
          return (
            <div
              key={`${ci}-${row}`}
              className={`aspect-square flex items-center justify-center rounded text-xs font-bold border
                ${isFree ? "bg-accent text-accent-foreground border-accent" : "bg-secondary text-secondary-foreground border-border"}`}
            >
              {isFree ? "★" : num}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function RoomDetail() {
  const params = useParams<{ id: string }>();
  const roomId = parseInt(params.id);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [genForm, setGenForm] = useState({ playerName: "", playerPhone: "", quantity: "1" });
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);

  const { data: room, isLoading } = trpc.rooms.getById.useQuery({ id: roomId });
  const { data: cards } = trpc.cards.listByRoom.useQuery({ roomId });
  const { data: drawnData } = trpc.draw.getNumbers.useQuery({ roomId }, {
    refetchInterval: room?.status === "running" ? 3000 : false,
  });
  const { data: winners } = trpc.admin.winners.useQuery({ roomId });

  const startMutation = trpc.rooms.start.useMutation({ onSuccess: () => { utils.rooms.getById.invalidate({ id: roomId }); toast.success("Bingo iniciado!"); }, onError: (e) => toast.error(e.message) });
  const pauseMutation = trpc.rooms.pause.useMutation({ onSuccess: () => { utils.rooms.getById.invalidate({ id: roomId }); toast.success("Pausado."); }, onError: (e) => toast.error(e.message) });
  const finishMutation = trpc.rooms.finish.useMutation({ onSuccess: () => { utils.rooms.getById.invalidate({ id: roomId }); toast.success("Encerrado."); }, onError: (e) => toast.error(e.message) });
  const openMutation = trpc.rooms.open.useMutation({ onSuccess: () => { utils.rooms.getById.invalidate({ id: roomId }); toast.success("Sala aberta para vendas!"); }, onError: (e) => toast.error(e.message) });
  const drawMutation = trpc.draw.manual.useMutation({
    onSuccess: (data) => {
      utils.draw.getNumbers.invalidate({ roomId });
      utils.cards.listByRoom.invalidate({ roomId });
      utils.admin.winners.invalidate({ roomId });
      if (data.number) toast.success(`Número sorteado: ${data.number}`);
      if (data.newWinners?.length) toast.success(`🎉 Temos um ganhador!`, { duration: 5000 });
    },
    onError: (e) => toast.error(e.message),
  });
  const startAutoMutation = trpc.draw.startAuto.useMutation({ onSuccess: () => toast.success("Sorteio automático iniciado!"), onError: (e) => toast.error(e.message) });
  const stopAutoMutation = trpc.draw.stopAuto.useMutation({ onSuccess: () => toast.success("Sorteio automático parado."), onError: (e) => toast.error(e.message) });
  const resetMutation = trpc.draw.reset.useMutation({ onSuccess: () => { utils.draw.getNumbers.invalidate({ roomId }); toast.success("Sorteio resetado."); }, onError: (e) => toast.error(e.message) });
  const generateMutation = trpc.cards.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedCards(data);
      utils.cards.listByRoom.invalidate();
      toast.success(`${data.length} cartela(s) gerada(s)!`);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <DashboardLayout><div className="h-64 rounded-xl bg-muted animate-pulse" /></DashboardLayout>;
  }
  if (!room) {
    return <DashboardLayout><p className="text-muted-foreground">Sala não encontrada.</p></DashboardLayout>;
  }

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
    open: { label: "Aberto", color: "bg-blue-500/20 text-blue-400" },
    running: { label: "Ao Vivo", color: "bg-primary/20 text-primary" },
    paused: { label: "Pausado", color: "bg-yellow-500/20 text-yellow-400" },
    finished: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
  };
  const statusInfo = STATUS_LABELS[room.status] ?? STATUS_LABELS.draft;

  const drawnNumbers = drawnData?.map((d) => d.number) ?? [];
  const liveUrl = `${window.location.origin}/live/${room.publicSlug}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/rooms")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{room.name}</h1>
                <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                R${Number(room.cardPrice).toFixed(2)}/cartela · Prêmio: R${Number(room.prize).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open(liveUrl, "_blank")}>
              <ExternalLink className="w-3 h-3 mr-1" /> Tela Ao Vivo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(liveUrl); toast.success("Link copiado!"); }}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Controles */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {room.status === "draft" && (
                <Button onClick={() => openMutation.mutate({ id: roomId })}>Abrir para Vendas</Button>
              )}
              {(room.status === "open" || room.status === "paused") && (
                <Button onClick={() => startMutation.mutate({ id: roomId })}>
                  <Play className="w-4 h-4 mr-2" /> Iniciar Sorteio
                </Button>
              )}
              {room.status === "running" && (
                <>
                  <Button onClick={() => drawMutation.mutate({ roomId })} disabled={drawMutation.isPending}>
                    <Dices className="w-4 h-4 mr-2" /> Sortear Número
                  </Button>
                  <Button variant="outline" onClick={() => startAutoMutation.mutate({ roomId })}>
                    <Zap className="w-4 h-4 mr-2" /> Auto
                  </Button>
                  <Button variant="outline" onClick={() => stopAutoMutation.mutate({ roomId })}>
                    <ZapOff className="w-4 h-4 mr-2" /> Parar Auto
                  </Button>
                  <Button variant="outline" onClick={() => pauseMutation.mutate({ id: roomId })}>

                    <Pause className="w-4 h-4 mr-2" /> Pausar
                  </Button>
                  <Button variant="outline" onClick={() => finishMutation.mutate({ id: roomId })}>
                    <Square className="w-4 h-4 mr-2" /> Encerrar
                  </Button>
                </>
              )}
              {(room.status === "paused" || room.status === "open") && (
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Resetar todos os números sorteados?")) resetMutation.mutate({ roomId }); }}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Resetar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Último número */}
        {room.currentBall && (
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 ball-pop">
              <div className="text-center">
                <div className="text-xs font-bold text-primary-foreground/70">
                  {room.currentBall <= 15 ? "B" : room.currentBall <= 30 ? "I" : room.currentBall <= 45 ? "N" : room.currentBall <= 60 ? "G" : "O"}
                </div>
                <div className="text-3xl font-extrabold text-primary-foreground">{room.currentBall}</div>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="draw">
          <TabsList className="bg-secondary">
            <TabsTrigger value="draw">Sorteio ({drawnNumbers.length}/75)</TabsTrigger>
            <TabsTrigger value="cards">Cartelas ({cards?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="winners">Ganhadores ({winners?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="generate">Gerar Cartelas</TabsTrigger>
          </TabsList>

          {/* Sorteio */}
          <TabsContent value="draw">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-sm">Números Sorteados</CardTitle></CardHeader>
              <CardContent>
                {drawnNumbers.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">Nenhum número sorteado ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {drawnNumbers.map((n, i) => (
                      <div key={n} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border
                        ${i === drawnNumbers.length - 1 ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30" : "bg-secondary text-secondary-foreground border-border"}`}>
                        {n}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cartelas */}
          <TabsContent value="cards">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-sm">Cartelas Vendidas</CardTitle></CardHeader>
              <CardContent>
                {!cards?.length ? (
                  <p className="text-muted-foreground text-sm text-center py-6">Nenhuma cartela vendida ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {cards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <p className="text-sm font-medium">{card.playerName || `Cartela #${card.id}`}</p>
                          <p className="text-xs text-muted-foreground font-mono">{card.token.slice(0, 16)}...</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={card.status === "winner" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}>
                            {card.status === "winner" ? "🏆 Ganhador" : card.status === "cancelled" ? "Cancelada" : "Ativa"}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={() => window.open(`/print/${card.token}`, "_blank")}>
                            <Printer className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ganhadores */}
          <TabsContent value="winners">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-sm">Ganhadores</CardTitle></CardHeader>
              <CardContent>
                {!winners?.length ? (
                  <div className="text-center py-10">
                    <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Nenhum ganhador ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {winners.map((w) => (
                      <div key={w.winner.id} className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4 text-accent" />
                          <span className="font-semibold text-foreground">
                            {w.card?.playerName || `Cartela #${w.winner.cardId}`}
                          </span>
                          <Badge className="bg-primary/20 text-primary text-xs">
                            {w.winner.winType === "full_card" ? "Cartela Cheia" : w.winner.winType === "line" ? "Linha" : "Coluna"}
                          </Badge>
                        </div>
                        {w.winner.prizeAmount && (
                          <p className="text-sm text-muted-foreground">Prêmio: R${Number(w.winner.prizeAmount).toFixed(2)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gerar Cartelas */}
          <TabsContent value="generate">
            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-sm">Gerar Novas Cartelas</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Jogador</Label>
                    <Input
                      placeholder="Opcional"
                      value={genForm.playerName}
                      onChange={(e) => setGenForm({ ...genForm, playerName: e.target.value })}
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={genForm.playerPhone}
                      onChange={(e) => setGenForm({ ...genForm, playerPhone: e.target.value })}
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={genForm.quantity}
                      onChange={(e) => setGenForm({ ...genForm, quantity: e.target.value })}
                      className="bg-input"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => generateMutation.mutate({
                    roomId,
                    playerName: genForm.playerName || undefined,
                    playerPhone: genForm.playerPhone || undefined,
                    quantity: parseInt(genForm.quantity) || 1,
                  })}
                  disabled={generateMutation.isPending}
                >
                  <TicketCheck className="w-4 h-4 mr-2" />
                  {generateMutation.isPending ? "Gerando..." : "Gerar Cartela(s)"}
                </Button>

                {/* Cartelas geradas */}
                {generatedCards.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <p className="text-sm font-medium text-foreground">{generatedCards.length} cartela(s) gerada(s):</p>
                    {generatedCards.map((card) => (
                      <div key={card.id} className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">ID: #{card.id}</p>
                            <p className="text-xs font-mono text-muted-foreground">{card.token.slice(0, 20)}...</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => window.open(`/play/${card.token}`, "_blank")}>
                              <ExternalLink className="w-3 h-3 mr-1" /> Jogar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => window.open(`/print/${card.token}`, "_blank")}>
                              <Printer className="w-3 h-3 mr-1" /> Imprimir
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-4 items-start">
                          {card.qrCode && (
                            <img src={card.qrCode} alt="QR Code" className="w-24 h-24 rounded border border-border bg-white p-1" />
                          )}
                          <BingoGrid grid={card.grid} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
