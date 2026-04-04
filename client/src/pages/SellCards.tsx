import { useState, useRef, useEffect, useCallback } from "react";
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
  DollarSign,
  User,
  Phone,
  Tv,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const CARD_PRICE = 0.50;
const CARDS_PER_PAGE = 12;

type GeneratedCard = {
  id: number;
  token: string;
  qrCode: string;
  cardUrl: string;
  grid: number[][];
  numbers?: number[];
};

function getColLabelSell(n: number) {
  if (n <= 15) return "B";
  if (n <= 30) return "I";
  if (n <= 45) return "N";
  if (n <= 60) return "G";
  return "O";
}

function buildPrintHtml(
  cards: GeneratedCard[],
  playerName: string,
  roomName: string,
  showUrl: string,
  showQrCode: string
): string {
  const cardHtml = cards
    .map((card, idx) => {
      const cardNums: number[] = card.numbers ?? card.grid.flat().filter(n => n !== 0);
      const numRows = Array.from({ length: Math.ceil(cardNums.length / 5) }, (_, row) =>
        cardNums.slice(row * 5, row * 5 + 5)
          .map(num => `<td style="border:1px solid #000;text-align:center;padding:2mm;font-size:12px;font-weight:bold">
            <div style="font-size:7px;color:#888;line-height:1">${getColLabelSell(num)}</div><div>${num}</div></td>`)
          .join("")
      );
      const separator = idx < cards.length - 1
        ? `<div style="border-top:1px dashed #000;margin-top:3mm;padding-top:1mm;text-align:center;font-size:8px;color:#999">✂ ─────────────────────────────────</div>`
        : "";
      return `
        <div style="width:72mm;padding:4mm;margin-bottom:4mm;page-break-inside:avoid;font-family:monospace;font-size:10px;border:1px solid #000">
          <div style="text-align:center;margin-bottom:3mm;border-bottom:1px dashed #000;padding-bottom:2mm">
            <div style="font-size:15px;font-weight:bold">BINGO DIGITAL</div>
            <div style="font-size:12px;font-weight:bold">${roomName}</div>
            <div style="font-size:9px">Cartela #${idx + 1} de ${cards.length} &mdash; ${cardNums.length} números</div>
            <div style="font-size:9px">Jogador: ${playerName}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:3mm">
            <thead><tr><th colspan="5" style="border:1px solid #000;text-align:center;padding:1.5mm;font-size:11px;font-weight:bold;background:#000;color:#fff">SEUS NÚMEROS</th></tr></thead>
            <tbody>${numRows.map((r) => `<tr>${r}</tr>`).join("")}</tbody>
          </table>
          <div style="display:flex;align-items:center;gap:3mm">
            ${card.qrCode ? `<img src="${card.qrCode}" alt="QR" style="width:20mm;height:20mm;flex-shrink:0"/>` : ""}
            <div style="flex:1;font-size:8px">
              <div style="margin-bottom:1mm">Escaneie para acompanhar ao vivo</div>
              <div style="font-size:7px;word-break:break-all;color:#555">${card.cardUrl}</div>
              <div style="margin-top:1mm;font-weight:bold">ID: ${card.token.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>
          ${separator}
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Cartelas - ${roomName}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body { margin: 0; padding: 0; background: #fff; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${cardHtml}
  <div style="width:72mm;padding:4mm;margin-top:4mm;border:1px solid #000;font-family:monospace;text-align:center">
    <div style="font-size:11px;font-weight:bold;margin-bottom:2mm">ACOMPANHE AO VIVO NA TV</div>
    ${showQrCode ? `<img src="${showQrCode}" alt="QR TV" style="width:28mm;height:28mm;margin:0 auto;display:block"/>` : ""}
    <div style="font-size:8px;margin-top:2mm;word-break:break-all;color:#555">${showUrl}</div>
    <div style="font-size:9px;margin-top:1mm">Escaneie e assista ao bingo ao vivo!</div>
  </div>
</body>
</html>`;
}

// Detecta se está rodando no app nativo Android com impressora PagSeguro
function isAndroidPOS(): boolean {
  return typeof (window as any).AndroidPrinter !== 'undefined';
}

// Imprime via app nativo Android (PagSeguro Moderninha Smart)
function printViaNative(cards: GeneratedCard[], playerName: string, roomName: string): void {
  const printer = (window as any).AndroidPrinter;
  if (!printer) return;
  try {
    const cardsData = cards.map(card => ({
      numbers: card.numbers ?? card.grid.flat().filter((n: number) => n !== 0),
      playerName,
      cardId: card.token.slice(0, 8).toUpperCase(),
      roomName,
    }));
    printer.printCards(JSON.stringify(cardsData));
  } catch (err) {
    toast.error("Erro na impressão nativa: " + String(err));
  }
}

function printViaIframe(html: string) {
  // Remove iframe anterior se existir
  const existing = document.getElementById("__bingo_print_frame__");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "__bingo_print_frame__";
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    // Fallback para popup se iframe não funcionar
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) { toast.error("Não foi possível imprimir. Verifique as permissões do navegador."); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Aguarda imagens e recursos carregarem antes de imprimir
  const tryPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      toast.error("Erro ao imprimir. Tente novamente.");
    } finally {
      // Remove o iframe após a impressão
      setTimeout(() => iframe.remove(), 2000);
    }
  };

  if (iframe.contentDocument?.readyState === "complete") {
    setTimeout(tryPrint, 300);
  } else {
    iframe.onload = () => setTimeout(tryPrint, 300);
    // Timeout de segurança: imprime mesmo se onload não disparar
    setTimeout(tryPrint, 1500);
  }
}

export default function SellCards() {
  const { id } = useParams<{ id: string }>();
  const roomId = parseInt(id);
  const [, navigate] = useLocation();

  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [page, setPage] = useState(0);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [showQrCode, setShowQrCode] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Dialog states — controlados separadamente do fluxo de tela
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Fila de impressão: preenchida no onSuccess, consumida após Dialog fechar
  const printQueueRef = useRef<{
    cards: GeneratedCard[];
    playerName: string;
    roomName: string;
    showUrl: string;
    showQr: string;
  } | null>(null);

  // Quando paymentOpen muda para false E há dados na fila → muda para tela de sucesso
  // Isso garante que o Dialog já fechou antes de qualquer mudança de árvore
  useEffect(() => {
    if (!paymentOpen && printQueueRef.current) {
      const pending = printQueueRef.current;
      printQueueRef.current = null;
      // Dois frames para garantir que o Portal do Radix foi completamente desmontado
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShowSuccess(true);
          // Impressão depois de mais um frame (tela de sucesso já renderizou)
          setTimeout(() => {
            if (isAndroidPOS()) {
              // Usa impressora nativa do POS PagSeguro
              printViaNative(pending.cards, pending.playerName, pending.roomName);
            } else {
              // Usa impressão via iframe para navegador web
              printViaIframe(
                buildPrintHtml(pending.cards, pending.playerName, pending.roomName, pending.showUrl, pending.showQr)
              );
            }
          }, 200);
        });
      });
    }
  }, [paymentOpen]);

  const { data: room, isLoading } = trpc.rooms.getById.useQuery({ id: roomId });
  const { data: cardsData } = trpc.cards.listByRoom.useQuery({ roomId });

  const generateMutation = trpc.cards.generate.useMutation({
    onSuccess: async (data) => {
      const cards = data as GeneratedCard[];
      setGeneratedCards(cards);

      let sUrl = "";
      let qr = "";
      if (room?.publicSlug) {
        sUrl = `${window.location.origin}/show/${room.publicSlug}`;
        try {
          const QRCode = await import("qrcode");
          qr = await QRCode.toDataURL(sUrl, { width: 200, margin: 1 });
          setShowQrCode(qr);
        } catch { /* sem QR */ }
      }

      // Salva na fila ANTES de fechar o Dialog
      printQueueRef.current = {
        cards,
        playerName,
        roomName: room?.name ?? "Bingo",
        showUrl: sUrl,
        showQr: qr,
      };

      // Fecha o Dialog — o useEffect acima detecta paymentOpen=false e age
      setPaymentOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const soldCount = cardsData?.length ?? 0;
  const available = (room?.maxCards ?? 0) - soldCount;
  const totalPages = Math.ceil(Math.min(available, 120) / CARDS_PER_PAGE);
  const startNum = page * CARDS_PER_PAGE + 1;
  const endNum = Math.min(startNum + CARDS_PER_PAGE - 1, available);
  const pageNumbers = Array.from({ length: Math.max(0, endNum - startNum + 1) }, (_, i) => startNum + i);
  const totalPrice = quantity * CARD_PRICE;
  const showUrl = room ? `${window.location.origin}/show/${room.publicSlug}` : "";

  function handleNext() {
    if (!playerName.trim()) { toast.error("Informe o nome do jogador"); return; }
    if (!playerPhone.trim()) { toast.error("Informe o telefone"); return; }
    if (quantity < 1) { toast.error("Selecione pelo menos 1 cartela"); return; }
    setConfirmOpen(true);
  }

  function handleConfirmPayment() {
    generateMutation.mutate({
      roomId,
      playerName: playerName.trim(),
      playerPhone: playerPhone.trim(),
      quantity,
    });
  }

  const handleReprint = useCallback(() => {
    if (!room) return;
    if (isAndroidPOS()) {
      printViaNative(generatedCards, playerName, room.name);
    } else {
      printViaIframe(buildPrintHtml(generatedCards, playerName, room.name, showUrl, showQrCode));
    }
  }, [generatedCards, playerName, room, showUrl, showQrCode]);

  function handleNewSale() {
    setPlayerName("");
    setPlayerPhone("");
    setQuantity(0);
    setPage(0);
    setGeneratedCards([]);
    setShowQrCode("");
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

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (showSuccess && generatedCards.length > 0) {
    return (
      <DashboardLayout>
        <div className="max-w-lg space-y-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/rooms/${roomId}`)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à Sala
            </Button>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Venda Realizada!</h2>
            <p className="text-white/70">
              <span className="font-semibold text-white">{generatedCards.length} cartela(s)</span> geradas para{" "}
              <span className="font-semibold text-white">{playerName}</span>
            </p>
            <p className="text-yellow-400 font-bold text-lg">
              Total cobrado: R$ {totalPrice.toFixed(2)}
            </p>
          </div>

          {room.publicSlug && (
            <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
              <Tv className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Tela de transmissão (TV)</p>
                <p className="text-xs text-blue-400 truncate">{showUrl}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.open(showUrl, "_blank")}>
                Abrir
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button className="flex-1 gap-2" onClick={handleReprint}>
              <Printer className="w-4 h-4" /> Reimprimir
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={handleNewSale}>
              <Ticket className="w-4 h-4" /> Nova Venda
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">Cartelas geradas:</p>
            {generatedCards.map((card, idx) => {
              const nums = card.numbers ?? card.grid.flat().filter(n => n !== 0);
              return (
                <div key={card.id} className="bg-card border border-border/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Cartela #{idx + 1} — ID: {card.token.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {nums.map((num) => (
                      <div key={num} className="aspect-square flex flex-col items-center justify-center rounded text-xs font-bold bg-secondary border border-border">
                        <span className="text-[8px] text-muted-foreground leading-none">{getColLabelSell(num)}</span>
                        <span>{num}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Tela principal de venda ──────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/rooms/${roomId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Vender Cartelas</h1>
            <p className="text-xs text-muted-foreground">{room.name} — R$ {CARD_PRICE.toFixed(2)}/cartela</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-foreground">{soldCount}</p>
            <p className="text-xs text-muted-foreground">Vendidas</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-green-400">{available}</p>
            <p className="text-xs text-muted-foreground">Disponíveis</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-yellow-400">R$ {(soldCount * CARD_PRICE).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Faturado</p>
          </div>
        </div>

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
              <div className="grid grid-cols-4 gap-2">
                {pageNumbers.map((n) => {
                  const isSelected = quantity === n;
                  const price = n * CARD_PRICE;
                  return (
                    <button
                      key={n}
                      onClick={() => setQuantity(n)}
                      className={`
                        relative rounded-xl p-3 flex flex-col items-center justify-center gap-1
                        border-2 transition-all active:scale-95
                        ${isSelected
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105"
                          : "bg-secondary/50 border-border text-foreground hover:border-primary/50"
                        }
                      `}
                    >
                      <span className="text-xl font-black">{n}</span>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="gap-1">
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </Button>
                  <span className="text-muted-foreground text-xs">Pág. {page + 1}/{totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="gap-1">
                    Próxima <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {quantity > 0 && (
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{quantity} cartela(s) × R$ 0,50</span>
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

      {/* Modal de confirmação — sempre montado, controlado por confirmOpen */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="bg-card border-border text-foreground max-w-sm"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
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
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Voltar</Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                // Pequeno delay para o Dialog de confirmação fechar antes de abrir o de pagamento
                setTimeout(() => setPaymentOpen(true), 150);
              }}
              className="gap-2"
            >
              <DollarSign className="w-4 h-4" /> Ir para Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de pagamento — sempre montado, controlado por paymentOpen */}
      <Dialog
        open={paymentOpen}
        onOpenChange={(open) => {
          // Só permite fechar manualmente se não estiver processando
          if (!open && !generateMutation.isPending) {
            setPaymentOpen(false);
          }
        }}
      >
        <DialogContent
          className="bg-card border-border text-foreground max-w-sm"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
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
              <p className="text-xs text-muted-foreground mt-1">{quantity} cartela(s) × R$ 0,50</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1 text-left">
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
              onClick={() => setPaymentOpen(false)}
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
