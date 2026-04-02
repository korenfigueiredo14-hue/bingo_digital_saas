import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Printer,
  ArrowLeft,
  Ticket,
  Trophy,
  DollarSign,
  User,
  Phone,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const CARD_PRICE = 0.01;
const CARDS_PER_PAGE = 9;

const COLUMN_COLORS: Record<string, string> = {
  B: "bg-blue-600",
  I: "bg-red-600",
  N: "bg-yellow-500",
  G: "bg-green-600",
  O: "bg-purple-600",
};

type GeneratedCard = {
  id: number;
  token: string;
  qrCode: string;
  cardUrl: string;
  grid: number[][];
};

function PrintableCards({
  cards,
  playerName,
  roomName,
  liveUrl,
}: {
  cards: GeneratedCard[];
  playerName: string;
  roomName: string;
  liveUrl: string;
}) {
  return (
    <div className="hidden print:block">
      {cards.map((card, idx) => (
        <div
          key={card.id}
          className="print-card"
          style={{
            width: "72mm",
            padding: "4mm",
            marginBottom: "4mm",
            pageBreakInside: "avoid",
            fontFamily: "monospace",
            fontSize: "10px",
            border: "1px solid #000",
          }}
        >
          {/* Cabeçalho */}
          <div style={{ textAlign: "center", marginBottom: "3mm", borderBottom: "1px dashed #000", paddingBottom: "2mm" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>🎰 BINGO DIGITAL</div>
            <div style={{ fontSize: "11px", fontWeight: "bold" }}>{roomName}</div>
            <div style={{ fontSize: "9px" }}>Cartela #{idx + 1} de {cards.length}</div>
            <div style={{ fontSize: "9px" }}>Jogador: {playerName}</div>
          </div>

          {/* Grid B-I-N-G-O */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "3mm" }}>
            <thead>
              <tr>
                {["B", "I", "N", "G", "O"].map((col) => (
                  <th
                    key={col}
                    style={{
                      border: "1px solid #000",
                      textAlign: "center",
                      padding: "1.5mm",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor: "#000",
                      color: "#fff",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }, (_, row) => (
                <tr key={row}>
                  {card.grid.map((col, ci) => {
                    const num = col[row];
                    const isFree = num === 0;
                    return (
                      <td
                        key={ci}
                        style={{
                          border: "1px solid #000",
                          textAlign: "center",
                          padding: "2mm",
                          fontSize: "12px",
                          fontWeight: "bold",
                          backgroundColor: isFree ? "#ddd" : "#fff",
                        }}
                      >
                        {isFree ? "★" : num}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* QR Code e rodapé */}
          <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
            {card.qrCode && (
              <img
                src={card.qrCode}
                alt="QR Code"
                style={{ width: "20mm", height: "20mm" }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "8px", marginBottom: "1mm" }}>
                Escaneie para acompanhar ao vivo
              </div>
              <div style={{ fontSize: "7px", wordBreak: "break-all", color: "#555" }}>
                {card.cardUrl}
              </div>
              <div style={{ fontSize: "8px", marginTop: "1mm", fontWeight: "bold" }}>
                ID: {card.token.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Separador entre cartelas */}
          {idx < cards.length - 1 && (
            <div style={{ borderTop: "1px dashed #000", marginTop: "3mm", paddingTop: "1mm", textAlign: "center", fontSize: "8px", color: "#999" }}>
              ✂ ─────────────────────────────
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SellCards() {
  const { id } = useParams<{ id: string }>();
  const roomId = parseInt(id);
  const [, navigate] = useLocation();

  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [page, setPage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: room, isLoading } = trpc.rooms.getById.useQuery({ id: roomId });
  const { data: cardsData } = trpc.cards.listByRoom.useQuery({ roomId });

  const generateMutation = trpc.cards.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedCards(data as GeneratedCard[]);
      setShowPayment(false);
      setShowSuccess(true);
      // Imprimir automaticamente após gerar
      setTimeout(() => {
        window.print();
      }, 500);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const soldCount = cardsData?.length ?? 0;
  const available = (room?.maxCards ?? 0) - soldCount;
  const totalPages = Math.ceil(Math.min(available, 50) / CARDS_PER_PAGE);
  const startNum = page * CARDS_PER_PAGE + 1;
  const endNum = Math.min(startNum + CARDS_PER_PAGE - 1, available);
  const pageNumbers = Array.from({ length: Math.max(0, endNum - startNum + 1) }, (_, i) => startNum + i);
  const totalPrice = quantity * CARD_PRICE;
  const liveUrl = room ? `${window.location.origin}/live/${room.publicSlug}` : "";

  function handleSelectQuantity(n: number) {
    setQuantity(n);
  }

  function handleNext() {
    if (!playerName.trim()) { toast.error("Informe o nome do jogador"); return; }
    if (!playerPhone.trim()) { toast.error("Informe o telefone"); return; }
    if (quantity < 1) { toast.error("Selecione pelo menos 1 cartela"); return; }
    setShowConfirm(true);
  }

  function handleGoToPayment() {
    setShowConfirm(false);
    setShowPayment(true);
  }

  function handleConfirmPayment() {
    generateMutation.mutate({
      roomId,
      playerName: playerName.trim(),
      playerPhone: playerPhone.trim(),
      quantity,
    });
  }

  function handleNewSale() {
    setPlayerName("");
    setPlayerPhone("");
    setQuantity(0);
    setPage(0);
    setGeneratedCards([]);
    setShowSuccess(false);
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!room) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-muted-foreground">Bingo não encontrado.</div>
      </DashboardLayout>
    );
  }

  // Tela de sucesso / impressão
  if (showSuccess && generatedCards.length > 0) {
    return (
      <DashboardLayout>
        {/* Conteúdo de impressão (oculto na tela, visível ao imprimir) */}
        <PrintableCards
          cards={generatedCards}
          playerName={playerName}
          roomName={room.name}
          liveUrl={liveUrl}
        />

        {/* Tela de confirmação */}
        <div className="max-w-lg space-y-5 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/rooms/${roomId}`)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à Sala
            </Button>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Venda Realizada!</h2>
            <p className="text-white/70">
              <span className="font-semibold text-white">{generatedCards.length} cartela(s)</span> geradas para{" "}
              <span className="font-semibold text-white">{playerName}</span>
            </p>
            {totalPrice > 0 && (
              <p className="text-yellow-400 font-bold text-lg">
                Total cobrado: R$ {totalPrice.toFixed(2)}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" /> Reimprimir
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleNewSale}
            >
              <Ticket className="w-4 h-4" /> Nova Venda
            </Button>
          </div>

          {/* Preview das cartelas */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">Cartelas geradas:</p>
            {generatedCards.map((card, idx) => (
              <div key={card.id} className="bg-card border border-border/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {card.qrCode && (
                    <img src={card.qrCode} alt="QR" className="w-16 h-16 rounded bg-white p-1 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Cartela #{idx + 1}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{card.token.slice(0, 12).toUpperCase()}...</p>
                    <div className="grid grid-cols-5 gap-0.5 mt-2">
                      {["B","I","N","G","O"].map((col, ci) => (
                        <div key={col} className="space-y-0.5">
                          <div className={`${COLUMN_COLORS[col]} text-white text-[9px] font-bold text-center rounded-sm py-0.5`}>{col}</div>
                          {(card.grid[ci] ?? []).map((num, ri) => (
                            <div key={ri} className="bg-secondary text-foreground text-[9px] text-center rounded-sm py-0.5 font-mono">
                              {num === 0 ? "★" : num}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/rooms/${roomId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Vender Cartelas</h1>
            <p className="text-sm text-muted-foreground">{room.name}</p>
          </div>
        </div>

        {/* Info da sala */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Ticket className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-bold">CARTELA</span>
            </div>
            <span className="text-foreground font-black">R$ 0,01</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-yellow-500 text-xs font-bold">PRÊMIO</span>
            </div>
            <span className="text-foreground font-black text-sm">R$ {Number(room.prize).toFixed(2)}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 text-xs font-bold">RESTAM</span>
            </div>
            <span className="text-foreground font-black">{available}</span>
          </div>
        </div>

        {/* Dados do jogador */}
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <User className="w-4 h-4 text-primary" /> Dados do Jogador
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome *</Label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nome completo"
                className="bg-input h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Telefone *
              </Label>
              <Input
                value={playerPhone}
                onChange={(e) => setPlayerPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                type="tel"
                className="bg-input h-10"
              />
            </div>
          </div>
        </div>

        {/* Seleção de quantidade estilo Moderninha */}
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Ticket className="w-4 h-4 text-primary" /> Quantidade de Cartelas
          </p>

          {available === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Todas as cartelas foram vendidas</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {pageNumbers.map((n) => {
                  const isSelected = quantity === n;
                  const price = n * CARD_PRICE;
                  return (
                    <button
                      key={n}
                      onClick={() => handleSelectQuantity(n)}
                      className={`
                        relative rounded-xl p-3 flex flex-col items-center justify-center gap-1
                        border-2 transition-all active:scale-95
                        ${isSelected
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105"
                          : "bg-secondary/50 border-border text-foreground hover:border-primary/50"
                        }
                      `}
                    >
                      <span className="text-2xl font-black">{n}</span>
                      <span className={`text-xs font-semibold ${isSelected ? "text-white/90" : "text-muted-foreground"}`}>
                        R$ {price.toFixed(2)}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </Button>
                  <span className="text-muted-foreground text-xs">Pág. {page + 1}/{totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="gap-1"
                  >
                    Próxima <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Botão de avançar */}
        {quantity > 0 && (
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{quantity} cartela(s) × R$ 0,01</span>
              <span className="font-bold text-yellow-400 text-lg">R$ {totalPrice.toFixed(2)}</span>
            </div>
            <Button
              className="w-full h-12 text-base font-bold gap-2"
              onClick={handleNext}
              disabled={!playerName.trim() || !playerPhone.trim()}
            >
              <ChevronRight className="w-5 h-5" />
              Cobrar R$ {totalPrice.toFixed(2)} na Maquininha
            </Button>
          </div>
        )}
      </div>

      {/* Modal de confirmação dos dados */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jogador</span>
                <span className="font-semibold">{playerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span className="font-semibold">{playerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cartelas</span>
                <span className="font-semibold">{quantity}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground font-medium">Total a cobrar</span>
                <span className="font-black text-yellow-400 text-base">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Voltar</Button>
            <Button onClick={handleGoToPayment} className="gap-2">
              <DollarSign className="w-4 h-4" /> Ir para Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de pagamento na maquininha */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              Cobrar na Maquininha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
              <p className="text-muted-foreground text-sm mb-1">Valor a cobrar</p>
              <p className="text-4xl font-black text-yellow-400">R$ {totalPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{quantity} cartela(s) × R$ 0,01</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>1. Insira o valor <strong className="text-foreground">R$ {totalPrice.toFixed(2)}</strong> na maquininha</p>
              <p>2. Aguarde o pagamento ser aprovado</p>
              <p>3. Clique em <strong className="text-foreground">"Pagamento Aprovado"</strong></p>
              <p>4. As cartelas serão geradas e impressas automaticamente</p>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-col">
            <Button
              className="w-full h-12 text-base font-bold gap-2 bg-green-600 hover:bg-green-700"
              onClick={handleConfirmPayment}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gerando cartelas...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Pagamento Aprovado — Gerar e Imprimir
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPayment(false)}
              disabled={generateMutation.isPending}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
