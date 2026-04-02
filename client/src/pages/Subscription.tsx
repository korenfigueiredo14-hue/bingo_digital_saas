import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CreditCard, Zap } from "lucide-react";
import { toast } from "sonner";

const PLAN_FEATURES: Record<string, string[]> = {
  free:         ["1 sala ativa", "50 cartelas/sala", "Sorteio manual", "Tela pública básica"],
  basic:        ["3 salas ativas", "200 cartelas/sala", "Sorteio automático", "QR Code nas cartelas", "Relatórios básicos"],
  professional: ["10 salas ativas", "500 cartelas/sala", "Tudo do Básico", "Impressão térmica", "Relatórios avançados", "Suporte prioritário"],
  premium:      ["Salas ilimitadas", "Cartelas ilimitadas", "Tudo do Profissional", "API PagSeguro", "White-label", "Suporte dedicado"],
};

export default function Subscription() {
  const utils = trpc.useUtils();
  const { data: current } = trpc.subscriptions.current.useQuery();
  const { data: plans, isLoading } = trpc.subscriptions.plans.useQuery();

  const upgradeMutation = trpc.subscriptions.upgrade.useMutation({
    onSuccess: (data) => {
      utils.subscriptions.current.invalidate();
      toast.success(`Plano ${data.plan} ativado com sucesso!`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seu plano e limites de uso</p>
        </div>

        {/* Plano atual */}
        {current && (
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plano Atual</p>
                    <p className="font-bold text-foreground capitalize text-lg">{current.plan}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Limites</p>
                  <p className="text-sm text-foreground">{current.limits.maxRooms} sala(s) · {current.limits.maxCardsPerRoom} cartelas/sala</p>
                  {current.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expira: {new Date(current.expiresAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aviso PagSeguro */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <Zap className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-400">
            <strong>Modo demonstração:</strong> Os upgrades são simulados. A integração com PagSeguro está preparada e pode ser ativada com as credenciais da API.
          </p>
        </div>

        {/* Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))
          ) : (
            plans?.map((plan) => {
              const isCurrentPlan = current?.plan === plan.slug;
              const isPopular = plan.slug === "professional";
              const features = PLAN_FEATURES[plan.slug] ?? [];

              return (
                <Card
                  key={plan.id}
                  className={`relative border ${isCurrentPlan ? "border-primary shadow-lg shadow-primary/20" : isPopular ? "border-accent/50" : "border-border/50"} bg-card`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs px-3">Plano Atual</Badge>
                    </div>
                  )}
                  {isPopular && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-accent-foreground text-xs px-3">Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base capitalize">{plan.name}</CardTitle>
                    <div className="mt-1">
                      <span className="text-2xl font-bold text-foreground">
                        {Number(plan.monthlyPrice) === 0 ? "Grátis" : `R$${Number(plan.monthlyPrice).toFixed(2)}`}
                      </span>
                      {Number(plan.monthlyPrice) > 0 && <span className="text-muted-foreground text-xs">/mês</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feat}</span>
                      </div>
                    ))}
                    <Button
                      className="w-full mt-4"
                      size="sm"
                      variant={isCurrentPlan ? "secondary" : "default"}
                      disabled={isCurrentPlan || upgradeMutation.isPending}
                      onClick={() => {
                        if (!isCurrentPlan) {
                          upgradeMutation.mutate({ plan: plan.slug as any });
                        }
                      }}
                    >
                      {isCurrentPlan ? "Plano Ativo" : upgradeMutation.isPending ? "Processando..." : "Selecionar"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Info PagSeguro */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Integração com PagSeguro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O sistema está preparado para integração completa com a API do PagSeguro. Para ativar pagamentos reais, configure as credenciais:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "PAGSEGURO_TOKEN", desc: "Token de autenticação da conta PagSeguro" },
                { key: "PAGSEGURO_EMAIL", desc: "E-mail da conta PagSeguro" },
                { key: "PAGSEGURO_SANDBOX", desc: "true para ambiente de testes" },
              ].map((item) => (
                <div key={item.key} className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-xs font-mono text-primary">{item.key}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
