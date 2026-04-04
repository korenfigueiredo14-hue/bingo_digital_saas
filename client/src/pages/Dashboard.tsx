import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Dices, TicketCheck, DollarSign, TrendingUp, Plus, ArrowRight,
  Circle, Infinity, CreditCard, Palette, Server, CheckCircle2,
} from "lucide-react";
import { useLocation } from "wouter";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:    { label: "Rascunho",  color: "bg-muted text-muted-foreground" },
  open:     { label: "Aberto",    color: "bg-blue-500/20 text-blue-400" },
  running:  { label: "Ao Vivo",   color: "bg-primary/20 text-primary" },
  paused:   { label: "Pausado",   color: "bg-yellow-500/20 text-yellow-400" },
  finished: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

const PREMIUM_FEATURES = [
  { icon: Infinity,    label: "Salas ilimitadas",     desc: "Crie quantos bingos quiser, sem restrições" },
  { icon: TicketCheck, label: "Cartelas ilimitadas",  desc: "Venda qualquer quantidade de cartelas por bingo" },
  { icon: CreditCard,  label: "API PagSeguro",        desc: "Cobranças automáticas integradas ao PagSeguro" },
  { icon: Palette,     label: "Marca branca",         desc: "Personalize com seu logo e cores da sua empresa" },
  { icon: Server,      label: "Servidor dedicado",    desc: "Infraestrutura exclusiva de alta disponibilidade" },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: dash, isLoading } = trpc.admin.dashboard.useQuery();

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

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Dices,       label: "Total de Bingos",     value: dash?.totalRooms ?? 0,       sub: `${dash?.activeRooms ?? 0} ativos` },
            { icon: TicketCheck, label: "Vendedores",           value: (dash as any)?.totalSellers ?? 0, sub: "cadastrados" },
            { icon: DollarSign,  label: "Bingos Ativos",        value: dash?.activeRooms ?? 0,          sub: "em andamento" },
            { icon: TrendingUp,  label: "Bingos Criados",       value: dash?.totalRooms ?? 0,           sub: "no total" },
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

        {/* Recursos ativos */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Recursos Ativos</CardTitle>
              <Badge className="bg-primary/20 text-primary text-xs">Premium</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PREMIUM_FEATURES.map((feat) => (
                <div
                  key={feat.label}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <feat.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">{feat.label}</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                            R${Number(room.cardPrice).toFixed(2)}/cartela · Bingo: R${Number((room as any).prizeFullCard ?? 0).toFixed(2)}
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
