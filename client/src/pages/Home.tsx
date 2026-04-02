import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Zap, Shield, Users, BarChart3, Smartphone, Globe,
  CheckCircle2, ArrowRight, Play
} from "lucide-react";
import { useLocation } from "wouter";

const FEATURES = [
  { icon: Zap, title: "Sorteio em Tempo Real", desc: "Motor de sorteio automático com sincronização instantânea via WebSocket para todos os jogadores." },
  { icon: Shield, title: "Cartelas Seguras", desc: "Tokens criptografados e QR Codes únicos garantem a autenticidade de cada cartela." },
  { icon: Users, title: "Multiusuário SaaS", desc: "Cada operador tem sua conta isolada com dados, bingos e jogadores completamente separados." },
  { icon: BarChart3, title: "Relatórios Completos", desc: "Acompanhe vendas, faturamento e desempenho de cada bingo em tempo real." },
  { icon: Smartphone, title: "Área do Jogador", desc: "Jogadores acessam sua cartela via QR Code e acompanham o bingo no celular com marcação automática." },
  { icon: Globe, title: "Tela Pública ao Vivo", desc: "Tela de transmissão com animações, histórico de números e atualização em tempo real." },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: plans } = trpc.subscriptions.plans.useQuery();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">B</div>
            <span className="font-bold text-lg text-foreground">BingoDigital</span>
            <Badge variant="secondary" className="text-xs">SaaS</Badge>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} size="sm">
                Painel <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleStart} size="sm">
                Entrar / Cadastrar
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />
        <div className="container text-center relative z-10">
          <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 hover:bg-primary/20">
            🎱 Plataforma Profissional de Bingo Digital
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Gerencie seus Bingos
            <br />
            <span className="text-primary">de forma profissional</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Sistema completo SaaS para operadores de bingo. Gere cartelas com QR Code, sorteie em tempo real, acompanhe ganhadores e gerencie tudo pelo painel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleStart} className="text-base px-8">
              <Play className="w-5 h-5 mr-2" />
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })} className="text-base px-8">
              Ver Planos
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "75", label: "Números" },
              { value: "∞", label: "Cartelas" },
              { value: "100%", label: "Tempo Real" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tudo que você precisa</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Uma plataforma completa para gerenciar bingos do início ao fim.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="bg-card border-border/50 hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 px-4">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Planos e Preços</h2>
            <p className="text-muted-foreground">Escolha o plano ideal para o seu volume de operação.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {plans?.map((plan) => {
              const features = Array.isArray(plan.features) ? plan.features as string[] : [];
              const isPopular = plan.slug === "professional";
              return (
                <Card
                  key={plan.id}
                  className={`relative border ${isPopular ? "border-primary shadow-lg shadow-primary/20" : "border-border/50"} bg-card`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs px-3">Mais Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-foreground">
                        {Number(plan.monthlyPrice) === 0 ? "Grátis" : `R$${Number(plan.monthlyPrice).toFixed(2)}`}
                      </span>
                      {Number(plan.monthlyPrice) > 0 && <span className="text-muted-foreground text-sm">/mês</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feat}</span>
                      </div>
                    ))}
                    <Button
                      className="w-full mt-4"
                      variant={isPopular ? "default" : "outline"}
                      onClick={handleStart}
                    >
                      Começar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary/10 border-t border-primary/20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Crie sua conta gratuitamente e comece a gerenciar seus bingos hoje mesmo.
          </p>
          <Button size="lg" onClick={handleStart} className="px-10">
            Criar conta grátis <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">B</div>
            <span>BingoDigital SaaS</span>
          </div>
          <span>© 2026 BingoDigital. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
