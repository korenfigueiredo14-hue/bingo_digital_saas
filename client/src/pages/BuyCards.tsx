import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Clock,
  Ticket,
  CheckCircle2,
  Printer,
  Share2,
  ArrowLeft,
} from "lucide-react";

const COLUMN_COLORS: Record<string, string> = {
  B: "bg-blue-600",
  I: "bg-red-600",
  N: "bg-yellow-500",
  G: "bg-green-600",
  O: "bg-purple-600",
};

function getColumn(n: number) {
  if (n >= 1 && n <= 15) return "B";
  if (n >= 16 && n <= 30) return "I";
  if (n >= 31 && n <= 45) return "N";
  if (n >= 46 && n <= 60) return "G";
  return "O";
}

type PurchasedCard = {
  id: number;
  token: string;
  qrCode: string;
  cardUrl: string;
  grid: number[][];
};

const CARDS_PER_PAGE = 9;

export default function BuyCards() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  // Form state
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [page, setPage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purchasedCards, setPurchasedCards] = useState<PurchasedCard[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewingCard, setViewingCard] = useState<PurchasedCard | null>(null);

  const { data: roomInfo, isLoading, error } = trpc.publicBuy.getRoomInfo.useQuery(
    { slug: slug! },
    { enabled: !!slug, retry: false }
  );

  const buyMutation = trpc.publicBuy.buyCards.useMutation({
    onSuccess: (data) => {
      setPurchasedCards(data.cards as PurchasedCard[]);
      setShowConfirm(false);
      setShowSuccess(true);
      toast.success(`${data.cards.length} cartela(s) comprada(s) com sucesso!`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const maxPerPage = CARDS_PER_PAGE;
  const available = roomInfo?.availableCount ?? 0;
  const cardPrice = Number(roomInfo?.cardPrice ?? 0);
  const totalPages = Math.ceil(Math.min(available, 50) / maxPerPage);
  const startNum = page * maxPerPage + 1;
  const endNum = Math.min(startNum + maxPerPage - 1, available);
  const pageNumbers = Array.from({ length: endNum - startNum + 1 }, (_, i) => startNum + i);

  const totalPrice = quantity * cardPrice;

  function handleSelectQuantity(n: number) {
    setQuantity(n);
  }

  function handleConfirm() {
    if (!playerName.trim()) { toast.error("Informe seu nome"); return; }
    if (!playerPhone.trim()) { toast.error("Informe seu telefone"); return; }
    if (quantity < 1) { toast.error("Selecione pelo menos 1 cartela"); return; }
    setShowConfirm(true);
  }

  function handleBuy() {
    buyMutation.mutate({
      slug: slug!,
      playerName: playerName.trim(),
      playerPhone: playerPhone.trim(),
      quantity,
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: roomInfo?.name, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60">Carregando bingo...</p>
        </div>
      </div>
    );
  }

  if (error || !roomInfo) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-6xl">🎰</div>
          <h2 className="text-xl font-bold text-white">Bingo não encontrado</h2>
          <p className="text-white/60 text-sm">
            {error?.message ?? "Este bingo não está disponível para compra no momento."}
          </p>
        </div>
      </div>
    );
  }

  // Tela de sucesso após compra
  if (showSuccess && purchasedCards.length > 0) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white">
        {/* Header */}
        <div className="bg-[#0d1f3c] border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="font-bold text-green-400">Compra Realizada!</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 border-white/20 text-white hover:bg-white/10" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-white/20 text-white hover:bg-white/10" onClick={handleShare}>
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {/* Resumo */}
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-green-300 font-semibold text-lg">{purchasedCards.length} cartela(s) para</p>
            <p className="text-white font-bold text-xl">{playerName}</p>
            <p className="text-white/60 text-sm mt-1">{roomInfo.name}</p>
            {cardPrice > 0 && (
              <p className="text-yellow-400 font-bold text-lg mt-2">
                Total: R$ {totalPrice.toFixed(2)}
              </p>
            )}
          </div>

          {/* Cartelas */}
          <p className="text-white/60 text-sm text-center">Toque em uma cartela para ver os detalhes</p>
          <div className="grid grid-cols-1 gap-3">
            {purchasedCards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => setViewingCard(card)}
                className="bg-[#0d1f3c] border border-white/10 rounded-xl p-4 text-left hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-semibold">Cartela #{idx + 1}</span>
                  <Badge className="bg-primary/20 text-primary text-xs">Ver QR Code</Badge>
                </div>
                {/* Mini grid */}
                <div className="grid grid-cols-5 gap-1">
                  {["B","I","N","G","O"].map((col, ci) => (
                    <div key={col} className="space-y-1">
                      <div className={`${COLUMN_COLORS[col]} text-white text-xs font-bold text-center rounded py-0.5`}>{col}</div>
                      {(card.grid[ci] ?? []).map((num, ri) => (
                        <div key={ri} className="bg-white/10 text-white text-xs text-center rounded py-1 font-mono">
                          {num === 0 ? "★" : num}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <Button
            className="w-full"
            variant="outline"
            onClick={() => navigate(`/live/${slug}`)}
          >
            Ver Bingo ao Vivo
          </Button>
        </div>

        {/* Modal de cartela individual */}
        {viewingCard && (
          <Dialog open={!!viewingCard} onOpenChange={() => setViewingCard(null)}>
            <DialogContent className="bg-[#0d1f3c] border-white/10 text-white max-w-sm">
              <DialogHeader>
                <DialogTitle>Sua Cartela</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {viewingCard.qrCode && (
                  <div className="flex justify-center">
                    <img src={viewingCard.qrCode} alt="QR Code" className="w-40 h-40 rounded-lg bg-white p-2" />
                  </div>
                )}
                <p className="text-center text-xs text-white/50">Escaneie para acompanhar ao vivo</p>
                <div className="grid grid-cols-5 gap-1">
                  {["B","I","N","G","O"].map((col, ci) => (
                    <div key={col} className="space-y-1">
                      <div className={`${COLUMN_COLORS[col]} text-white text-xs font-bold text-center rounded py-1`}>{col}</div>
                      {(viewingCard.grid[ci] ?? []).map((num, ri) => (
                        <div key={ri} className="bg-white/10 text-white text-sm text-center rounded py-1.5 font-bold">
                          {num === 0 ? "★" : num}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={() => navigate(`/play/${viewingCard.token}`)}>
                  Acompanhar ao Vivo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex flex-col">
      {/* Header estilo Moderninha */}
      <div className="bg-[#0d1f3c] border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate("/")} className="text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">{roomInfo.name}</span>
          </div>
          <button onClick={handleShare} className="text-white/60 hover:text-white">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Prêmios */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {Number(roomInfo.prize) > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Trophy className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-400 text-xs font-bold">PRÊMIO</span>
              </div>
              <span className="text-white font-bold text-sm">R$ {Number(roomInfo.prize).toFixed(2)}</span>
            </div>
          )}
          {cardPrice > 0 && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Ticket className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-xs font-bold">CARTELA</span>
              </div>
              <span className="text-white font-bold text-sm">R$ {cardPrice.toFixed(2)}</span>
            </div>
          )}
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Clock className="w-3 h-3 text-blue-400" />
              <span className="text-blue-400 text-xs font-bold">RESTAM</span>
            </div>
            <span className="text-white font-bold text-sm">{available}</span>
          </div>
        </div>
      </div>

      {/* Formulário de dados */}
      <div className="px-4 py-3 bg-[#0d1f3c]/50 border-b border-white/10 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-white/70 text-xs mb-1 block">Seu nome</Label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nome completo"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-white/70 text-xs mb-1 block">Telefone</Label>
            <Input
              value={playerPhone}
              onChange={(e) => setPlayerPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              type="tel"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Grade de seleção estilo Moderninha */}
      <div className="flex-1 p-4">
        <p className="text-white/60 text-xs text-center mb-3">
          Selecione a quantidade de cartelas
        </p>

        <div className="grid grid-cols-3 gap-3">
          {pageNumbers.map((n) => {
            const isSelected = quantity === n;
            const price = n * cardPrice;
            return (
              <button
                key={n}
                onClick={() => handleSelectQuantity(n)}
                className={`
                  relative rounded-xl p-3 flex flex-col items-center justify-center gap-1
                  border-2 transition-all active:scale-95
                  ${isSelected
                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105"
                    : "bg-[#0d1f3c] border-white/20 text-white hover:border-primary/50 hover:bg-primary/10"
                  }
                `}
              >
                <span className="text-2xl font-black">{n}</span>
                {cardPrice > 0 && (
                  <span className={`text-xs font-semibold ${isSelected ? "text-white/90" : "text-white/60"}`}>
                    R$ {price.toFixed(2)}
                  </span>
                )}
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="border-white/20 text-white hover:bg-white/10 gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="text-white/50 text-xs">Pág. {page + 1}/{totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="border-white/20 text-white hover:bg-white/10 gap-1"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Footer com total e botão de compra */}
      <div className="p-4 bg-[#0d1f3c] border-t border-white/10 space-y-3">
        {quantity > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">{quantity} cartela(s) selecionada(s)</span>
            {cardPrice > 0 && (
              <span className="text-yellow-400 font-bold text-lg">
                R$ {totalPrice.toFixed(2)}
              </span>
            )}
          </div>
        )}
        <Button
          className="w-full h-12 text-base font-bold gap-2"
          disabled={quantity < 1 || !playerName.trim() || !playerPhone.trim()}
          onClick={handleConfirm}
        >
          <ShoppingCart className="w-5 h-5" />
          {quantity < 1 ? "Selecione as cartelas" : `Comprar ${quantity} cartela(s)`}
        </Button>
      </div>

      {/* Modal de confirmação */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-[#0d1f3c] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Confirmar Compra
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">Nome</span>
                <span className="font-semibold">{playerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Telefone</span>
                <span className="font-semibold">{playerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Bingo</span>
                <span className="font-semibold">{roomInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Cartelas</span>
                <span className="font-semibold">{quantity}</span>
              </div>
              {cardPrice > 0 && (
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-white/60">Total</span>
                  <span className="font-bold text-yellow-400 text-base">R$ {totalPrice.toFixed(2)}</span>
                </div>
              )}
            </div>
            <p className="text-white/50 text-xs text-center">
              Após confirmar, suas cartelas serão geradas com QR Code único.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button onClick={handleBuy} disabled={buyMutation.isPending} className="gap-2">
              {buyMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
