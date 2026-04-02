import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, Dices, Ticket, Trophy, Clock } from "lucide-react";

const CARD_PRICE = 0.01; // R$ 0,01 fixo por cartela

const PRESET_QUANTITIES = [50, 100, 200, 300, 500, 1000];

export default function RoomCreate() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    maxCards: "100",
    prize: "0",
    prizeDescription: "",
    drawIntervalSeconds: "5",
    winCondition: "any" as "line" | "column" | "full_card" | "any",
  });

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: (data) => {
      toast.success("Bingo criado com sucesso!");
      navigate(`/rooms/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome do bingo"); return; }
    const maxCards = parseInt(form.maxCards) || 100;
    if (maxCards < 1 || maxCards > 9999) { toast.error("Quantidade de cartelas deve ser entre 1 e 9999"); return; }

    createMutation.mutate({
      name: form.name.trim(),
      cardPrice: CARD_PRICE,
      prize: parseFloat(form.prize) || 0,
      prizeDescription: form.prizeDescription || undefined,
      drawIntervalSeconds: parseInt(form.drawIntervalSeconds) || 5,
      maxCards,
      winCondition: form.winCondition,
      autoDrawEnabled: false,
    });
  };

  const maxCards = parseInt(form.maxCards) || 0;
  const totalRevenue = maxCards * CARD_PRICE;

  return (
    <DashboardLayout>
      <div className="max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/rooms")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Novo Bingo</h1>
            <p className="text-sm text-muted-foreground">Configure rapidamente seu bingo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <Card className="bg-card border-border/50">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1.5">
                  <Dices className="w-3.5 h-3.5 text-primary" /> Nome do Bingo *
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Bingo de Natal 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-input text-base"
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>

          {/* Quantidade de cartelas */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" /> Quantidade de Cartelas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Presets rápidos */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Seleção rápida:</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_QUANTITIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setForm({ ...form, maxCards: String(q) })}
                      className={`
                        rounded-lg py-2.5 px-3 text-sm font-bold border-2 transition-all
                        ${form.maxCards === String(q)
                          ? "bg-primary border-primary text-white"
                          : "bg-secondary/50 border-border text-foreground hover:border-primary/50"
                        }
                      `}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input manual */}
              <div className="space-y-1.5">
                <Label htmlFor="maxCards" className="text-xs text-muted-foreground">Ou digite a quantidade:</Label>
                <Input
                  id="maxCards"
                  type="number"
                  min="1"
                  max="9999"
                  value={form.maxCards}
                  onChange={(e) => setForm({ ...form, maxCards: e.target.value })}
                  className="bg-input"
                />
              </div>

              {/* Resumo financeiro */}
              {maxCards > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preço por cartela</span>
                    <span className="font-semibold text-foreground">R$ 0,01</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de cartelas</span>
                    <span className="font-semibold text-foreground">{maxCards}</span>
                  </div>
                  <div className="flex justify-between border-t border-primary/20 pt-1.5">
                    <span className="text-muted-foreground">Receita máxima</span>
                    <span className="font-bold text-primary">R$ {totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prêmio */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Prêmio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="prize">Valor do Prêmio (R$)</Label>
                <Input
                  id="prize"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prize}
                  onChange={(e) => setForm({ ...form, prize: e.target.value })}
                  className="bg-input"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prizeDescription">Descrição do Prêmio</Label>
                <Input
                  id="prizeDescription"
                  placeholder="Ex: TV 55'' + R$ 500 em dinheiro"
                  value={form.prizeDescription}
                  onChange={(e) => setForm({ ...form, prizeDescription: e.target.value })}
                  className="bg-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sorteio */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Sorteio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="drawInterval">Intervalo entre números (segundos)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 8, 10].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, drawIntervalSeconds: String(s) })}
                      className={`
                        rounded-lg py-2 text-sm font-bold border-2 transition-all
                        ${form.drawIntervalSeconds === String(s)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-secondary/50 border-border text-foreground hover:border-blue-400/50"
                        }
                      `}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Condição de Vitória</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "any", label: "Qualquer" },
                    { value: "line", label: "Linha" },
                    { value: "column", label: "Coluna" },
                    { value: "full_card", label: "Cartela Cheia" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, winCondition: opt.value as any })}
                      className={`
                        rounded-lg py-2 text-sm font-bold border-2 transition-all
                        ${form.winCondition === opt.value
                          ? "bg-primary border-primary text-white"
                          : "bg-secondary/50 border-border text-foreground hover:border-primary/50"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/rooms")} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 text-base font-bold"
              disabled={createMutation.isPending || !form.name.trim() || maxCards < 1}
            >
              {createMutation.isPending ? "Criando..." : "Criar Bingo"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
