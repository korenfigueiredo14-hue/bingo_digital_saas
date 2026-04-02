import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Dices, ArrowRight, Trash2, Play, Pause, Square, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:    { label: "Rascunho",  color: "bg-muted text-muted-foreground" },
  open:     { label: "Aberto",    color: "bg-blue-500/20 text-blue-400" },
  running:  { label: "Ao Vivo",   color: "bg-primary/20 text-primary" },
  paused:   { label: "Pausado",   color: "bg-yellow-500/20 text-yellow-400" },
  finished: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

export default function RoomList() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: rooms, isLoading } = trpc.rooms.list.useQuery();

  const startMutation = trpc.rooms.start.useMutation({
    onSuccess: () => { utils.rooms.list.invalidate(); toast.success("Bingo iniciado!"); },
    onError: (e) => toast.error(e.message),
  });
  const pauseMutation = trpc.rooms.pause.useMutation({
    onSuccess: () => { utils.rooms.list.invalidate(); toast.success("Bingo pausado."); },
    onError: (e) => toast.error(e.message),
  });
  const finishMutation = trpc.rooms.finish.useMutation({
    onSuccess: () => { utils.rooms.list.invalidate(); toast.success("Bingo encerrado."); },
    onError: (e) => toast.error(e.message),
  });
  const openMutation = trpc.rooms.open.useMutation({
    onSuccess: () => { utils.rooms.list.invalidate(); toast.success("Sala aberta para venda!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.rooms.delete.useMutation({
    onSuccess: () => { utils.rooms.list.invalidate(); toast.success("Bingo removido."); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Bingos</h1>
            <p className="text-sm text-muted-foreground mt-1">{rooms?.length ?? 0} bingo(s) criado(s)</p>
          </div>
          <Button onClick={() => navigate("/rooms/new")}>
            <Plus className="w-4 h-4 mr-2" /> Novo Bingo
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : rooms?.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="py-16 text-center">
              <Dices className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum bingo criado</h3>
              <p className="text-muted-foreground text-sm mb-6">Crie seu primeiro bingo e comece a vender cartelas.</p>
              <Button onClick={() => navigate("/rooms/new")}>
                <Plus className="w-4 h-4 mr-2" /> Criar Bingo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rooms?.map((room) => {
              const statusInfo = STATUS_LABELS[room.status] ?? STATUS_LABELS.draft;
              return (
                <Card key={room.id} className="bg-card border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
                          <Badge className={`text-xs shrink-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>💰 R${Number(room.cardPrice).toFixed(2)}/cartela</span>
                          <span>🏆 Prêmio: R${Number(room.prize).toFixed(2)}</span>
                          <span>🎯 Vitória: {room.winCondition === "any" ? "Qualquer" : room.winCondition === "full_card" ? "Cartela cheia" : room.winCondition === "line" ? "Linha" : "Coluna"}</span>
                          {room.currentBall && <span>🎱 Último: {room.currentBall}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Ações rápidas */}
                        {room.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => openMutation.mutate({ id: room.id })}>
                            Abrir Vendas
                          </Button>
                        )}
                        {(room.status === "open" || room.status === "paused") && (
                          <Button size="sm" onClick={() => startMutation.mutate({ id: room.id })}>
                            <Play className="w-3 h-3 mr-1" /> Iniciar
                          </Button>
                        )}
                        {room.status === "running" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate({ id: room.id })}>
                              <Pause className="w-3 h-3 mr-1" /> Pausar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => finishMutation.mutate({ id: room.id })}>
                              <Square className="w-3 h-3 mr-1" /> Encerrar
                            </Button>
                          </>
                        )}

                        <Button size="sm" variant="ghost" onClick={() => navigate(`/rooms/${room.id}`)}>
                          <ArrowRight className="w-4 h-4" />
                        </Button>

                        {room.publicSlug && (
                          <Button size="sm" variant="ghost" onClick={() => window.open(`/live/${room.publicSlug}`, "_blank")}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}

                        {["draft", "open", "finished"].includes(room.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja excluir este bingo?")) {
                                deleteMutation.mutate({ id: room.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
