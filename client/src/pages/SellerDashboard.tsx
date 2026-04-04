import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Ticket,
  Store,
  LogOut,
  ShoppingCart,
  CheckCircle,
  Loader2,
  Phone,
  User,
  Hash,
  Building2,
  RefreshCw,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:    { label: "Aberto",    color: "bg-green-500/20 text-green-400 border-green-500/30" },
  running: { label: "Rodando",   color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  paused:  { label: "Pausado",   color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

type Step = "list" | "form" | "success";

interface GeneratedCard {
  id: number;
  token: string;
  qrCode: string;
  cardUrl: string;
  numbers: number[];
}

export default function SellerDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("list");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [showEstablishment, setShowEstablishment] = useState(false);

  const { data: rooms, isLoading, refetch } = trpc.seller.listActiveRooms.useQuery();
  const { data: profile } = trpc.seller.getProfile.useQuery();

  const generateMutation = trpc.seller.generateCards.useMutation({
    onSuccess: (data) => {
      setGeneratedCards(data.cards as GeneratedCard[]);
      setStep("success");
      // Imprimir após um curto delay
      setTimeout(() => {
        handlePrint(data.cards as GeneratedCard[], data.roomName, data.prizeQuadra, data.prizeQuina, data.prizeFullCard);
      }, 400);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateEstablishmentMutation = trpc.seller.updateEstablishment.useMutation({
    onSuccess: () => {
      toast.success("Dados do estabelecimento atualizados!");
      setShowEstablishment(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const [estName, setEstName] = useState("");
  const [estAddress, setEstAddress] = useState("");
  const [estPhone, setEstPhone] = useState("");

  function openEstablishment() {
    setEstName(profile?.establishmentName ?? "");
    setEstAddress(profile?.establishmentAddress ?? "");
    setEstPhone(profile?.establishmentPhone ?? "");
    setShowEstablishment(true);
  }

  function handleSelectRoom(room: any) {
    setSelectedRoom(room);
    setPlayerName("");
    setPlayerPhone("");
    setQuantity(1);
    setStep("form");
  }

  function handleGenerate() {
    if (!playerName.trim() || !playerPhone.trim()) {
      toast.error("Preencha nome e telefone do jogador");
      return;
    }
    generateMutation.mutate({
      roomId: selectedRoom.id,
      playerName: playerName.trim(),
      playerPhone: playerPhone.trim(),
      quantity,
    });
  }

  function handlePrint(cards: GeneratedCard[], roomName: string, prizeQ?: any, prizeQi?: any, prizeFull?: any) {
    const estLabel = profile?.establishmentName ? `<div style="font-size:11px;color:#888;margin-bottom:4px;">${profile.establishmentName}</div>` : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cartelas</title>
    <style>
      body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 10px; }
      .card { border: 2px solid #1e3a8a; border-radius: 8px; padding: 12px; margin-bottom: 16px; page-break-inside: avoid; }
      .header { text-align: center; margin-bottom: 8px; }
      .title { font-size: 18px; font-weight: bold; color: #1e3a8a; }
      .subtitle { font-size: 11px; color: #666; }
      .numbers { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 10px 0; }
      .num { width: 36px; height: 36px; border-radius: 50%; background: #1e3a8a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; }
      .prizes { display: flex; gap: 8px; justify-content: center; font-size: 10px; color: #555; margin-top: 6px; }
      .prize { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
      .player { font-size: 11px; color: #444; text-align: center; margin-top: 6px; }
      .token { font-size: 9px; color: #aaa; text-align: center; margin-top: 4px; }
      @media print { body { padding: 0; } }
    </style></head><body>
    ${cards.map((c) => `
      <div class="card">
        <div class="header">
          ${estLabel}
          <div class="title">🎱 ${roomName}</div>
          <div class="subtitle">Cartela Digital de Bingo</div>
        </div>
        <div class="numbers">${(c.numbers || []).map((n: number) => `<div class="num">${n}</div>`).join("")}</div>
        <div class="prizes">
          <span class="prize">Quadra: R$${Number(prizeQ ?? 0).toFixed(2)}</span>
          <span class="prize">Quina: R$${Number(prizeQi ?? 0).toFixed(2)}</span>
          <span class="prize">Bingo: R$${Number(prizeFull ?? 0).toFixed(2)}</span>
        </div>
        <div class="player">Jogador: ${playerName} · Tel: ${playerPhone}</div>
        <div class="token">Token: ${c.token}</div>
      </div>`).join("")}
    </body></html>`;

    const win = window.open("", "_blank", "width=600,height=800");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.print(); };
    }
  }

  function handleNewSale() {
    setStep("list");
    setSelectedRoom(null);
    setGeneratedCards([]);
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <header className="bg-[#0d1530] border-b border-blue-900/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Bingo Digital</p>
            <p className="text-xs text-blue-400">Vendedor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-300 hover:text-white hover:bg-blue-900/40 text-xs"
            onClick={openEstablishment}
          >
            <Building2 className="w-3.5 h-3.5 mr-1" />
            {profile?.establishmentName ?? "Meu Estabelecimento"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* STEP: Lista de bingos */}
        {step === "list" && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-white">Bingos Disponíveis</h1>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-blue-400">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-blue-900/20 animate-pulse" />
                ))}
              </div>
            ) : !rooms?.length ? (
              <Card className="bg-blue-900/20 border-blue-800/40 text-center py-12">
                <CardContent>
                  <Ticket className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <p className="text-blue-300 text-sm">Nenhum bingo ativo no momento.</p>
                  <p className="text-blue-500 text-xs mt-1">Aguarde o administrador iniciar um bingo.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => {
                  const statusInfo = STATUS_LABELS[room.status] ?? STATUS_LABELS.open;
                  return (
                    <Card
                      key={room.id}
                      className="bg-[#0d1530] border-blue-800/40 cursor-pointer hover:border-blue-500/60 transition-all"
                      onClick={() => handleSelectRoom(room)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-white">{room.name}</p>
                            <p className="text-xs text-blue-400 mt-0.5">
                              R$ {Number(room.cardPrice).toFixed(2)} por cartela
                            </p>
                          </div>
                          <Badge className={`text-xs border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-blue-300">
                          <span>🎯 Quadra: R$ {Number(room.prizeQuadra ?? 0).toFixed(2)}</span>
                          <span>🎰 Quina: R$ {Number(room.prizeQuina ?? 0).toFixed(2)}</span>
                          <span>🏆 Bingo: R$ {Number(room.prizeFullCard ?? 0).toFixed(2)}</span>
                        </div>
                        <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white">
                          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Vender Cartelas
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* STEP: Formulário de venda */}
        {step === "form" && selectedRoom && (
          <>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep("list")} className="text-blue-400 p-1">
                ← Voltar
              </Button>
              <h1 className="text-lg font-bold text-white">{selectedRoom.name}</h1>
            </div>

            <Card className="bg-[#0d1530] border-blue-800/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" /> Dados do Jogador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-blue-300 text-xs">Nome do Jogador</Label>
                  <Input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Nome completo"
                    className="bg-blue-950/40 border-blue-800/60 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-blue-300 text-xs">Telefone</Label>
                  <Input
                    value={playerPhone}
                    onChange={(e) => setPlayerPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="bg-blue-950/40 border-blue-800/60 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-blue-300 text-xs">Quantidade de Cartelas</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="border-blue-800/60 text-white bg-blue-950/40 w-9 h-9 p-0"
                    >
                      −
                    </Button>
                    <span className="text-2xl font-bold text-white w-8 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.min(50, quantity + 1))}
                      className="border-blue-800/60 text-white bg-blue-950/40 w-9 h-9 p-0"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-900/30 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-300">Valor por cartela</span>
                    <span className="text-white">R$ {Number(selectedRoom.cardPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-blue-800/40 pt-2 mt-2">
                    <span className="text-blue-200">Total</span>
                    <span className="text-green-400">R$ {(Number(selectedRoom.cardPrice) * quantity).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar e Imprimir</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* STEP: Sucesso */}
        {step === "success" && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Venda Realizada!</h2>
              <p className="text-blue-300 text-sm mt-1">
                {generatedCards.length} cartela(s) gerada(s) para {playerName}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {generatedCards.slice(0, 6).map((card) => (
                <div key={card.id} className="bg-[#0d1530] border border-blue-800/40 rounded-lg p-2">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {(card.numbers || []).slice(0, 9).map((n: number) => (
                      <span key={n} className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">
                        {n}
                      </span>
                    ))}
                    {(card.numbers || []).length > 9 && (
                      <span className="text-xs text-blue-400">+{(card.numbers || []).length - 9}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-blue-800/60 text-blue-300"
                onClick={() => handlePrint(generatedCards, selectedRoom?.name ?? "", selectedRoom?.prizeQuadra, selectedRoom?.prizeQuina, selectedRoom?.prizeFullCard)}
              >
                🖨️ Reimprimir
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                onClick={handleNewSale}
              >
                Nova Venda
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de estabelecimento */}
      <Dialog open={showEstablishment} onOpenChange={setShowEstablishment}>
        <DialogContent className="bg-[#0d1530] border-blue-800/40 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-400" /> Meu Estabelecimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-blue-300 text-xs">Nome do Estabelecimento</Label>
              <Input
                value={estName}
                onChange={(e) => setEstName(e.target.value)}
                placeholder="Ex: Bar do João"
                className="bg-blue-950/40 border-blue-800/60 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-blue-300 text-xs">Endereço</Label>
              <Input
                value={estAddress}
                onChange={(e) => setEstAddress(e.target.value)}
                placeholder="Rua, número, bairro"
                className="bg-blue-950/40 border-blue-800/60 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-blue-300 text-xs">Telefone</Label>
              <Input
                value={estPhone}
                onChange={(e) => setEstPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-blue-950/40 border-blue-800/60 text-white mt-1"
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500"
              onClick={() => updateEstablishmentMutation.mutate({
                establishmentName: estName,
                establishmentAddress: estAddress,
                establishmentPhone: estPhone,
              })}
              disabled={updateEstablishmentMutation.isPending}
            >
              {updateEstablishmentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
