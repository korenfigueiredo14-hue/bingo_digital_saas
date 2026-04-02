import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, Dices } from "lucide-react";

export default function RoomCreate() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    description: "",
    cardPrice: "10",
    prize: "0",
    prizeDescription: "",
    drawIntervalSeconds: "5",
    maxCards: "200",
    winCondition: "any" as "line" | "column" | "full_card" | "any",
    autoDrawEnabled: false,
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
    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      cardPrice: parseFloat(form.cardPrice) || 10,
      prize: parseFloat(form.prize) || 0,
      prizeDescription: form.prizeDescription || undefined,
      drawIntervalSeconds: parseInt(form.drawIntervalSeconds) || 5,
      maxCards: parseInt(form.maxCards) || 200,
      winCondition: form.winCondition,
      autoDrawEnabled: form.autoDrawEnabled,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/rooms")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Novo Bingo</h1>
            <p className="text-sm text-muted-foreground">Configure as regras e valores do seu bingo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Dices className="w-4 h-4 text-primary" /> Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Bingo *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Bingo de Natal 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o evento..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-input resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardPrice">Valor da Cartela (R$)</Label>
                  <Input
                    id="cardPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cardPrice}
                    onChange={(e) => setForm({ ...form, cardPrice: e.target.value })}
                    className="bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prize">Prêmio (R$)</Label>
                  <Input
                    id="prize"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.prize}
                    onChange={(e) => setForm({ ...form, prize: e.target.value })}
                    className="bg-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prizeDescription">Descrição do Prêmio</Label>
                <Input
                  id="prizeDescription"
                  placeholder="Ex: TV 55 polegadas + R$500 em dinheiro"
                  value={form.prizeDescription}
                  onChange={(e) => setForm({ ...form, prizeDescription: e.target.value })}
                  className="bg-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 mt-4">
            <CardHeader>
              <CardTitle className="text-base">Regras do Sorteio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Condição de Vitória</Label>
                <Select
                  value={form.winCondition}
                  onValueChange={(v) => setForm({ ...form, winCondition: v as any })}
                >
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer (Linha, Coluna ou Cartela Cheia)</SelectItem>
                    <SelectItem value="line">Apenas Linha</SelectItem>
                    <SelectItem value="column">Apenas Coluna</SelectItem>
                    <SelectItem value="full_card">Apenas Cartela Cheia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxCards">Máximo de Cartelas</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="drawInterval">Intervalo do Sorteio (seg)</Label>
                  <Input
                    id="drawInterval"
                    type="number"
                    min="3"
                    max="60"
                    value={form.drawIntervalSeconds}
                    onChange={(e) => setForm({ ...form, drawIntervalSeconds: e.target.value })}
                    className="bg-input"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Sorteio Automático</p>
                  <p className="text-xs text-muted-foreground">Sorteia automaticamente no intervalo definido</p>
                </div>
                <Switch
                  checked={form.autoDrawEnabled}
                  onCheckedChange={(v) => setForm({ ...form, autoDrawEnabled: v })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate("/rooms")} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending || !form.name}>
              {createMutation.isPending ? "Criando..." : "Criar Bingo"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
