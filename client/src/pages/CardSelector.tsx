import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, ArrowRight, Printer, ShoppingCart,
  ChevronLeft, ChevronRight, DollarSign, Trophy, Clock
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CARDS_PER_PAGE = 9;

export default function CardSelector() {
  const params = useParams<{ id: string }>();
  const roomId = Number(params.id);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const [page, setPage] = useState(0);
  const [selectedQty, setSelectedQty] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [showPrint, setShowPrint] = useState(false);
  const [currentPrintIndex, setCurrentPrintIndex] = useState(0);

  const { data: room } = trpc.rooms.getById.useQuery(
    { id: roomId },
    { enabled: !!roomId && isAuthenticated }
  );
  const { data: cards, refetch: refetchCards } = trpc.cards.listByRoom.useQuery(
    { roomId },
    { enabled: !!roomId && isAuthenticated }
  );

  const generateMutation = trpc.cards.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedCards(data);
      setShowConfirm(false);
      setShowPrint(true);
      setCurrentPrintIndex(0);
      refetchCards();
      toast.success(`${data.length} cartela(s) gerada(s) com sucesso!`);
    },
    onError: (e) => toast.error(e.message),
  });

  const cardPrice = Number(room?.cardPrice ?? 0);
  const totalPrice = selectedQty * cardPrice;
  const soldCards = cards?.length ?? 0;
  const maxCards = room?.maxCards ?? 200;
  const availableSlots = maxCards - soldCards;

  // Calcular quantas páginas de botões temos
  // Cada botão representa 1 cartela, mostramos CARDS_PER_PAGE por página
  const totalButtons = Math.min(availableSlots, 100); // máximo 100 botões visíveis
  const totalPages = Math.ceil(totalButtons / CARDS_PER_PAGE);
  const startNum = page * CARDS_PER_PAGE + 1;
  const endNum = Math.min(startNum + CARDS_PER_PAGE - 1, totalButtons);

  const handleSelectQty = (qty: number) => {
    if (qty > availableSlots) {
      toast.error(`Apenas ${availableSlots} vagas disponíveis`);
      return;
    }
    setSelectedQty(qty);
  };

  const handleConfirm = () => {
    if (!selectedQty) {
      toast.error("Selecione a quantidade de cartelas");
      return;
    }
    setShowConfirm(true);
  };

  const handleGenerate = () => {
    generateMutation.mutate({
      roomId,
      quantity: selectedQty,
      playerName: playerName || undefined,
      playerPhone: playerPhone || undefined,
    });
  };

  const handlePrint = (token: string) => {
    window.open(`/print/${token}`, "_blank");
  };

  const prizes = [
    room?.prizeDescription ? { label: "PRÊMIO 1", value: room.prizeDescription } : null,
    room?.prize && Number(room.prize) > 0 ? { label: "PRÊMIO PRINCIPAL", value: `R$ ${Number(room.prize).toFixed(2)}` } : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.02_240)] text-foreground flex flex-col">
      {/* Header estilo app POS */}
      <div className="bg-[oklch(0.18_0.08_145)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate(`/rooms/${roomId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-white font-bold text-sm leading-none">{room?.name ?? "Bingo"}</p>
            <p className="text-white/60 text-xs mt-0.5">Venda de Cartelas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => navigate(`/operator/${roomId}`)}
            title="Operar Bingo"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Info do sorteio estilo Moderninha */}
      <div className="bg-[oklch(0.22_0.06_200)] px-4 py-3 text-center border-b border-white/10">
        <p className="text-white/80 text-xs">Sorteio: <strong className="text-white">{room?.id ? String(room.id).padStart(6, "0") : "------"}</strong></p>
        <div className="flex items-center justify-center gap-1 mt-1 text-white/60 text-xs">
          <Clock className="w-3 h-3" />
          <span>{format(new Date(), "dd/MM HH:mm", { locale: ptBR })}</span>
        </div>
      </div>

      {/* Prêmios */}
      {prizes.length > 0 && (
        <div className="px-3 py-2 bg-[oklch(0.16_0.04_240)] border-b border-white/10">
          <div className="flex gap-2 flex-wrap">
            {prizes.map((p, i) => p && (
              <div key={i} className="flex-1 min-w-[100px] bg-[oklch(0.22_0.08_145)] rounded-lg p-2 text-center border border-primary/30">
                <p className="text-primary text-[10px] font-bold uppercase">{p.label}</p>
                <p className="text-white text-xs font-bold mt-0.5">{p.value}</p>
              </div>
            ))}
            <div className="flex-1 min-w-[100px] bg-[oklch(0.22_0.04_240)] rounded-lg p-2 text-center border border-white/10">
              <p className="text-white/60 text-[10px] font-bold uppercase">Disponíveis</p>
              <p className="text-white text-xs font-bold mt-0.5">{availableSlots} vagas</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid de botões numerados estilo Moderninha */}
      <div className="flex-1 px-3 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-white/60 text-xs uppercase tracking-widest">Quantidade de Cartelas</p>
          {totalPages > 1 && (
            <p className="text-white/40 text-xs">{page + 1}/{totalPages}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: endNum - startNum + 1 }, (_, i) => {
            const qty = startNum + i;
            const price = qty * cardPrice;
            const isSelected = qty === selectedQty;
            const isDisabled = qty > availableSlots;

            return (
              <button
                key={qty}
                disabled={isDisabled}
                onClick={() => handleSelectQty(qty)}
                className={`
                  relative flex flex-col items-center justify-center rounded-xl py-4 px-2 font-bold transition-all duration-150 active:scale-95
                  ${isSelected
                    ? "bg-primary shadow-lg shadow-primary/40 border-2 border-white/30 scale-105"
                    : isDisabled
                    ? "bg-[oklch(0.20_0.02_240)] text-white/20 cursor-not-allowed border border-white/5"
                    : "bg-[oklch(0.25_0.04_240)] hover:bg-[oklch(0.30_0.06_240)] border border-white/10 active:bg-primary/50"
                  }
                `}
              >
                <span className={`text-xl leading-none ${isSelected ? "text-white" : isDisabled ? "text-white/20" : "text-white"}`}>
                  {qty}
                </span>
                {cardPrice > 0 && (
                  <span className={`text-[11px] mt-1 ${isSelected ? "text-white/80" : isDisabled ? "text-white/20" : "text-white/50"}`}>
                    R$ {price.toFixed(2)}
                  </span>
                )}
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <span className="text-primary text-[10px] font-black">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[oklch(0.25_0.04_240)] border border-white/10 text-white disabled:opacity-30 hover:bg-[oklch(0.30_0.06_240)] active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[oklch(0.22_0.04_240)] border border-white/10">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-white text-sm font-bold">Mais</span>
            </div>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[oklch(0.25_0.04_240)] border border-white/10 text-white disabled:opacity-30 hover:bg-[oklch(0.30_0.06_240)] active:scale-95 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Rodapé com total e botão de compra */}
      <div className="bg-[oklch(0.16_0.04_240)] border-t border-white/10 px-4 py-4 space-y-3">
        {selectedQty > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">{selectedQty} cartela(s) selecionada(s)</span>
            <span className="text-primary font-bold text-lg">
              {cardPrice > 0 ? `R$ ${totalPrice.toFixed(2)}` : "Grátis"}
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={() => { setSelectedQty(0); setPlayerName(""); setPlayerPhone(""); }}
            disabled={!selectedQty}
          >
            Limpar
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 font-bold gap-2"
            disabled={!selectedQty || generateMutation.isPending}
            onClick={handleConfirm}
          >
            <ShoppingCart className="w-4 h-4" />
            {generateMutation.isPending ? "Gerando..." : "Gerar Cartelas"}
          </Button>
        </div>
      </div>

      {/* Modal de confirmação com dados do jogador */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-card border-border/50 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Confirmar Compra</DialogTitle>
            <DialogDescription>
              {selectedQty} cartela(s) — {cardPrice > 0 ? `R$ ${totalPrice.toFixed(2)}` : "Grátis"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="playerName">Nome do Jogador (opcional)</Label>
              <Input
                id="playerName"
                placeholder="Ex: João Silva"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="playerPhone">Telefone (opcional)</Label>
              <Input
                id="playerPhone"
                placeholder="Ex: (11) 99999-9999"
                value={playerPhone}
                onChange={(e) => setPlayerPhone(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            {/* Resumo */}
            <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantidade</span>
                <span className="font-medium">{selectedQty} cartela(s)</span>
              </div>
              {cardPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor unitário</span>
                  <span className="font-medium">R$ {cardPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-bold">Total</span>
                <span className="font-bold text-primary">{cardPrice > 0 ? `R$ ${totalPrice.toFixed(2)}` : "Grátis"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? "Gerando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de impressão das cartelas geradas */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="bg-card border-border/50 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Cartelas Geradas!
            </DialogTitle>
            <DialogDescription>
              {generatedCards.length} cartela(s) prontas para impressão
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {generatedCards.length > 1 && (
              <div className="flex items-center justify-between text-sm">
                <Button
                  variant="ghost" size="icon"
                  disabled={currentPrintIndex === 0}
                  onClick={() => setCurrentPrintIndex((i) => i - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-muted-foreground">
                  Cartela {currentPrintIndex + 1} de {generatedCards.length}
                </span>
                <Button
                  variant="ghost" size="icon"
                  disabled={currentPrintIndex >= generatedCards.length - 1}
                  onClick={() => setCurrentPrintIndex((i) => i + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {generatedCards[currentPrintIndex] && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary/20 text-primary text-xs">
                    Cartela #{generatedCards[currentPrintIndex].id}
                  </Badge>
                  {playerName && <span className="text-xs text-muted-foreground">{playerName}</span>}
                </div>
                {/* Mini preview da cartela */}
                <div className="grid grid-cols-5 gap-0.5 text-center text-[10px]">
                  {["B","I","N","G","O"].map((col) => (
                    <div key={col} className="bg-primary text-primary-foreground font-bold py-0.5 rounded-sm">{col}</div>
                  ))}
                  {Array.from({ length: 5 }, (_, row) =>
                    (generatedCards[currentPrintIndex].grid as number[][]).map((colArr, ci) => {
                      const num = colArr[row];
                      return (
                        <div key={`${ci}-${row}`} className={`py-0.5 rounded-sm font-medium ${num === 0 ? "bg-accent/20 text-accent" : "bg-secondary text-foreground"}`}>
                          {num === 0 ? "★" : num}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handlePrint(generatedCards[currentPrintIndex].token)}
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => window.open(`/play/${generatedCards[currentPrintIndex].token}`, "_blank")}
                  >
                    Acompanhar
                  </Button>
                </div>
              </div>
            )}

            {generatedCards.length > 1 && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  generatedCards.forEach((c: any, i: number) => {
                    setTimeout(() => window.open(`/print/${c.token}`, "_blank"), i * 300);
                  });
                }}
              >
                <Printer className="w-4 h-4" /> Imprimir Todas ({generatedCards.length})
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={() => setShowPrint(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
