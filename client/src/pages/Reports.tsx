import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BarChart3, DollarSign, TicketCheck, Trophy, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Reports() {
  const { data: revenue, isLoading: loadingRevenue } = trpc.transactions.revenue.useQuery();
  const { data: transactions, isLoading: loadingTx } = trpc.transactions.list.useQuery();

  const chartData: any[] = [];  // byRoom não disponível na query simples

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão financeira e de desempenho dos seus bingos</p>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Receita Total", value: `R$${(revenue?.total ?? 0).toFixed(2)}`, color: "text-primary" },
            { icon: TicketCheck, label: "Cartelas Vendidas", value: revenue?.count ?? 0, color: "text-blue-400" },
            { icon: Trophy, label: "Transações", value: transactions?.length ?? 0, color: "text-accent" },
            { icon: TrendingUp, label: "Vendas Aprovadas", value: revenue?.cardSales ? `R$${Number(revenue.cardSales).toFixed(2)}` : "R$0,00", color: "text-purple-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {loadingRevenue ? "..." : stat.value}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráfico por sala */}
        {chartData.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Receita por Bingo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 240)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.6 0.02 240)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.6 0.02 240)" }} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.17 0.025 240)", border: "1px solid oklch(0.28 0.03 240)", borderRadius: "8px" }}
                    labelStyle={{ color: "oklch(0.95 0.01 240)" }}
                    formatter={(value: any, name: string) => [
                      name === "receita" ? `R$${Number(value).toFixed(2)}` : value,
                      name === "receita" ? "Receita" : "Cartelas"
                    ]}
                  />
                  <Bar dataKey="receita" fill="oklch(0.55 0.18 145)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tabela de transações */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTx ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}
              </div>
            ) : !transactions?.length ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma transação registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-muted-foreground font-medium">ID</th>
                      <th className="pb-2 text-muted-foreground font-medium">Jogador</th>
                      <th className="pb-2 text-muted-foreground font-medium">Valor</th>
                      <th className="pb-2 text-muted-foreground font-medium">Status</th>
                      <th className="pb-2 text-muted-foreground font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2 text-muted-foreground font-mono text-xs">#{tx.id}</td>
                        <td className="py-2 text-foreground">{tx.playerName || "-"}</td>
                        <td className="py-2 font-semibold text-primary">R${Number(tx.amount).toFixed(2)}</td>
                        <td className="py-2">
                          <Badge className={
                            tx.status === "approved" ? "bg-primary/20 text-primary" :
                            tx.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-destructive/20 text-destructive"
                          }>
                            {tx.status === "approved" ? "Aprovado" : tx.status === "pending" ? "Pendente" : "Cancelado"}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">
                          {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
