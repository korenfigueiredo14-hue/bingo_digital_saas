import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, Dices, Ticket, Trophy, Clock, Calendar, CheckCircle } from "lucide-react";

const CARD_PRICE = 0.50; // R$ 0,50 fixo por cartela

const PRESET_QUANTITIES = [50, 100, 200, 300, 500, 1000];

export default function RoomCreate() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    maxCards: "100",
    prizeQuadra: "",
    prizeQuina: "",
    prizeFullCard: "",
    prizeDescription: "",
    drawIntervalSeconds: "5",
    winCondition: "any" as "line" | "column" | "full_card" | "any",
    useSchedule: false,
    scheduledDate: "",
    scheduledTime: "",
  });

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: (data) => {
      if (data.scheduled) {
        toast.success("Bingo agendado com sucesso!");
      } else {
        toast.success("Bingo criado com sucesso!");
      }
      navigate(`/rooms/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome do bingo"); return; }
    const maxCards = parseInt(form.maxCards) || 100;
    if (maxCards < 1 || maxCards > 9999) { toast.error("Quantidade de cartelas deve ser entre 1 e 9999"); return; }

    const prizeQuadra = parseFloat(form.prizeQuadra) || 0;
    const prizeQuina = parseFloat(form.prizeQuina) || 0;
    const prizeFullCard = parseFloat(form.prizeFullCard) || 0;

    // Montar scheduledAt se agendamento habilitado
    let scheduledAt: string | undefined;
    if (form.useSchedule && form.scheduledDate && form.scheduledTime) {
      const dt = new Date(`${form.scheduledDate}T${form.scheduledTime}:00`);
      if (isNaN(dt.getTime())) {
        toast.error("Data/hora de agendamento inválida");
        return;
      }
      if (dt <= new Date()) {
        toast.error("A data de agendamento deve ser no futuro");
        return;
      }
      scheduledAt = dt.toISOString();
    } else if (form.useSchedule && (!form.scheduledDate || !form.scheduledTime)) {
      toast.error("Informe a data e hora do agendamento");
      return;
    }

    createMutation.mutate({
      name: form.name.trim(),
      cardPrice: CARD_PRICE,
      prize: prizeFullCard,
      prizeDescription: form.prizeDescription || undefined,
      prizeQuadra,
      prizeQuina,
      prizeFullCard,
      drawIntervalSeconds: parseInt(form.drawIntervalSeconds) || 5,
      maxCards,
      winCondition: form.winCondition,
      autoDrawEnabled: false,
      scheduledAt,
    });
  };

  const maxCards = parseInt(form.maxCards) || 0;
  const totalRevenue = maxCards * CARD_PRICE;

  // Calcular data/hora mínima (agora + 5 min)
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000);
  const minDate = minDateTime.toISOString().slice(0, 10);
  const minTime = minDateTime.toTimeString().slice(0, 5);

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
                  placeholder="Ex: Bingo da Sorte"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-input text-base"
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>

          {/* Agendamento */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" /> Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle de agendamento */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Programar por horário</p>
                  <p className="text-xs text-muted-foreground">
                    {form.useSchedule ? "Bingo será criado como agendado" : "Bingo será criado imediatamente"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, useSchedule: !form.useSchedule })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.useSchedule ? "bg-purple-600" : "bg-muted"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    form.useSchedule ? "translate-x-6" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {form.useSchedule && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="scheduledDate" className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Data
                    </Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      min={minDate}
                      value={form.scheduledDate}
                      onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                      className="bg-input"
                      required={form.useSchedule}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scheduledTime" className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Horário
                    </Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={form.scheduledTime}
                      onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                      className="bg-input"
                      required={form.useSchedule}
                    />
                  </div>
                </div>
              )}

              {form.useSchedule && form.scheduledDate && form.scheduledTime && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm">
                  <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-purple-300">
                    Bingo agendado para{" "}
                    <strong>
                      {new Date(`${form.scheduledDate}T${form.scheduledTime}:00`).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </strong>
                  </span>
                </div>
              )}
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

              {maxCards > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preço por cartela</span>
                    <span className="font-semibold text-foreground">R$ 0,50</span>
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

          {/* Prêmios */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Prêmios por Modalidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Configure o valor de cada prêmio. Deixe em branco ou zero se não quiser oferecer aquela modalidade.
              </p>

              {/* Quadra */}
              <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm">4</span>
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="prizeQuadra" className="text-sm font-semibold text-orange-400">
                    Quadra — 4 números em linha/coluna
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">R$</span>
                    <Input
                      id="prizeQuadra"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.prizeQuadra}
                      onChange={(e) => setForm({ ...form, prizeQuadra: e.target.value })}
                      className="bg-input h-8 text-sm"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Quina */}
              <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm">5</span>
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="prizeQuina" className="text-sm font-semibold text-blue-400">
                    Quina — linha ou coluna completa
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">R$</span>
                    <Input
                      id="prizeQuina"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.prizeQuina}
                      onChange={(e) => setForm({ ...form, prizeQuina: e.target.value })}
                      className="bg-input h-8 text-sm"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Cartela Cheia */}
              <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="prizeFullCard" className="text-sm font-semibold text-yellow-400">
                    Cartela Cheia — todos os números
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">R$</span>
                    <Input
                      id="prizeFullCard"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.prizeFullCard}
                      onChange={(e) => setForm({ ...form, prizeFullCard: e.target.value })}
                      className="bg-input h-8 text-sm"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prizeDescription">Descrição adicional do prêmio (opcional)</Label>
                <Input
                  id="prizeDescription"
                  placeholder="Ex: TV 55'' + vale-presente"
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
              {createMutation.isPending
                ? "Criando..."
                : form.useSchedule
                ? "Agendar Bingo"
                : "Criar Bingo"
              }
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
