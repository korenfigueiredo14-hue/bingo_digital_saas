import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Dices, TicketCheck, DollarSign, TrendingUp, Plus, ArrowRight, Circle } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:    { label: "Rascunho",  color: "bg-muted text-muted-foreground" },
  open:     { label: "Aberto",    color: "bg-blue-500/20 text-blue-400" },
  running:  { label: "Ao Vivo",   color: "bg-primary/20 text-primary" },
  paused:   { label: "Pausado",   color: "bg-yellow-500/20 text-yellow-400" },
  finished: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: dash, isLoading } = trpc.admin.dashboard.useQuery();
  const { data: sub } = trpc.subscriptions.current.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral dos seus bingos</p>
          </div>
          <Button onClick={() => navigate("/rooms/new")}>
            <Plus className="w-4 h-4 mr-2" /> Novo Bingo
          </Button>
        </div>

        {/* Plano atual */}
        {sub && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-foreground">
              Plano <strong className="text-primary capitalize">{sub.plan}</strong> — {sub.limits.maxRooms} sala(s) ativa(s) permitida(s), {sub.limits.maxCardsPerRoom} cartelas/sala
            </span>
            <Button size="sm" variant="ghost" className="ml-auto text-primary" onClick={() => navigate("/subscription")}>
              Fazer upgrade <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Dices, label: "Total de Bingos", value: dash?.totalRooms ?? 0, sub: `${dash?.activeRooms ?? 0} ativos` },
            { icon: TicketCheck, label: "Cartelas Vendidas", value: dash?.totalCards ?? 0, sub: "total" },
            { icon: DollarSign, label: "Faturamento", value: `R$${(dash?.revenue?.total ?? 0).toFixed(2)}`, sub: "aprovado" },
            { icon: TrendingUp, label: "Bingos Finalizados", value: dash?.finishedRooms ?? 0, sub: "encerrados" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {isLoading ? "..." : stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bingos recentes */}
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Bingos Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/rooms")}>
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : dash?.recentRooms?.length === 0 ? (
              <div className="text-center py-10">
                <Dices className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum bingo criado ainda.</p>
                <Button className="mt-4" onClick={() => navigate("/rooms/new")}>
                  <Plus className="w-4 h-4 mr-2" /> Criar primeiro bingo
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {dash?.recentRooms?.map((room) => {
                  const statusInfo = STATUS_LABELS[room.status] ?? STATUS_LABELS.draft;
                  return (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                      onClick={() => navigate(`/rooms/${room.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        {room.status === "running" && (
                          <Circle className="w-2 h-2 fill-primary text-primary animate-pulse" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{room.name}</p>
                          <p className="text-xs text-muted-foreground">
                            R${Number(room.cardPrice).toFixed(2)}/cartela · Prêmio: R${Number(room.prize).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Badge className={`text-xs ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
