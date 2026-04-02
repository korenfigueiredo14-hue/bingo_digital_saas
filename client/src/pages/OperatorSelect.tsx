import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, ShoppingCart, Eye, Plus } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  open: { label: "Aberto", color: "bg-blue-500/20 text-blue-400" },
  running: { label: "Ao Vivo 🔴", color: "bg-primary/20 text-primary animate-pulse" },
  paused: { label: "Pausado", color: "bg-yellow-500/20 text-yellow-400" },
  finished: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

export default function OperatorSelect() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: rooms, isLoading } = trpc.rooms.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const activeRooms = rooms?.filter((r) => ["draft", "open", "running", "paused"].includes(r.status)) ?? [];
  const finishedRooms = rooms?.filter((r) => r.status === "finished") ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Operar Bingo</h1>
            <p className="text-muted-foreground text-sm mt-1">Selecione uma sala para operar ao vivo ou vender cartelas</p>
          </div>
          <Button onClick={() => navigate("/rooms/new")} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Bingo
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : activeRooms.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-8 text-center">
              <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum bingo ativo no momento.</p>
              <Button className="mt-4" onClick={() => navigate("/rooms/new")}>
                Criar Bingo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Salas Ativas</p>
            {activeRooms.map((room) => {
              const statusInfo = STATUS_LABELS[room.status] ?? { label: room.status, color: "bg-muted text-muted-foreground" };
              return (
                <Card key={room.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
                          <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {room.cardPrice && Number(room.cardPrice) > 0 && (
                            <span>R$ {Number(room.cardPrice).toFixed(2)}/cartela</span>
                          )}
                          {room.prize && Number(room.prize) > 0 && (
                            <span>Prêmio: R$ {Number(room.prize).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => navigate(`/sell/${room.id}`)}
                          title="Vender cartelas"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Vender</span>
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => navigate(`/operator/${room.id}`)}
                          title="Operar ao vivo"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Operar</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {finishedRooms.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Encerrados</p>
            {finishedRooms.slice(0, 3).map((room) => (
              <Card key={room.id} className="bg-card/50 border-border/30 opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-foreground text-sm">{room.name}</h3>
                      <Badge className="text-xs bg-muted text-muted-foreground mt-1">Encerrado</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => navigate(`/rooms/${room.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
