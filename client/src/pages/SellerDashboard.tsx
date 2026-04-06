import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Ticket, LogOut, RefreshCw, ShoppingCart, CheckCircle, Loader2,
  Building2, Store, Trophy, BarChart3, Clock, DollarSign,
  TrendingUp, Package, AlertCircle, Star, Calendar,
} from "lucide-react";

const CARD_PRICE = 0.50; // R$ 0,50 fixo por cartela

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Aberto", color: "text-green-400 border-green-500/40 bg-green-500/10" },
  running: { label: "Em Sorteio", color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" },
  paused: { label: "Pausado", color: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  closed: { label: "Encerrado", color: "text-red-400 border-red-500/40 bg-red-500/10" },
  draft: { label: "Agendado", color: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
};

type Tab = "cartelas" | "rodadas" | "premiados" | "relatorio";

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("cartelas");
  const [step, setStep] = useState<"list" | "form" | "success">("list");
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [showEstablishment, setShowEstablishment] = useState(false);
  const [estName, setEstName] = useState("");
  const [estAddress, setEstAddress] = useState("");
  const [estPhone, setEstPhone] = useState("");
  const [cardPage, setCardPage] = useState(0); // paginação dos botões de quantidade

  // Gera 120 opções de quantidade (1..120), 12 por página
  const CARDS_PER_PAGE = 12;
  const ALL_QUANTITIES = Array.from({ length: 120 }, (_, i) => i + 1);
  const totalPages = Math.ceil(ALL_QUANTITIES.length / CARDS_PER_PAGE);
  const pageQuantities = ALL_QUANTITIES.slice(cardPage * CARDS_PER_PAGE, (cardPage + 1) * CARDS_PER_PAGE);

  const utils = trpc.useUtils();

  const { data: profile } = trpc.seller.getProfile.useQuery();
  const { data: roomsData, isLoading: roomsLoading, refetch: refetchRooms } = trpc.seller.listAllRooms.useQuery();
  const { data: report, isLoading: reportLoading } = trpc.seller.getReport.useQuery();

  const activeRooms = roomsData?.active ?? [];
  const scheduledRooms = roomsData?.scheduled ?? [];

  const { mutate: logout } = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });

  const generateMutation = trpc.seller.generateCards.useMutation({
    onSuccess: (data) => {
      setGeneratedCards(data.cards);
      setStep("success");
      toast.success(`${data.cards.length} cartela(s) gerada(s)!`);
      handlePrint(data.cards, data.roomName, data.prizeQuadra, data.prizeQuina, data.prizeFullCard);
    },
    onError: (err) => toast.error(err.message ?? "Erro ao gerar cartelas"),
  });

  const updateEstablishmentMutation = trpc.seller.updateEstablishment.useMutation({
    onSuccess: () => {
      toast.success("Estabelecimento atualizado!");
      setShowEstablishment(false);
      utils.seller.getProfile.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Erro ao salvar"),
  });

  function openEstablishment() {
    setEstName(profile?.establishmentName ?? "");
    setEstAddress(profile?.establishmentAddress ?? "");
    setEstPhone(profile?.establishmentPhone ?? "");
    setShowEstablishment(true);
  }

  function handleSelectRoom(room: any) {
    setSelectedRoom(room);
    setQuantity(1);
    setStep("form");
  }

  function handleGenerate() {
    generateMutation.mutate({
      roomId: selectedRoom.id,
      playerName: "Cliente",
      playerPhone: "00000000000",
      quantity,
    });
  }

  function handlePrint(cards: any[], roomName: string, prizeQ?: any, prizeQi?: any, prizeFull?: any) {
    const estLabel = profile?.establishmentName
      ? `<div style="font-size:11px;color:#888;margin-bottom:4px;">${profile.establishmentName}</div>`
      : "";
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "cartelas", label: "Cartelas", icon: <Ticket className="w-4 h-4" /> },
    { id: "rodadas", label: "Rodadas", icon: <Clock className="w-4 h-4" /> },
    { id: "premiados", label: "Premiados", icon: <Trophy className="w-4 h-4" /> },
    { id: "relatorio", label: "Relatório", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#0d1530] border-b border-blue-900/40 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Bingo Digital</p>
            <p className="text-xs text-green-400">Vendedor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm"
            className="text-blue-300 hover:text-white hover:bg-blue-900/40 text-xs"
            onClick={openEstablishment}>
            <Building2 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">{profile?.establishmentName ?? "Meu Estabelecimento"}</span>
          </Button>
          <Button variant="ghost" size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={() => logout()}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#0d1530] border-b border-blue-900/40 px-2 shrink-0">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "cartelas") setStep("list"); }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-white"
                  : "border-transparent text-blue-400 hover:text-white"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">

        {/* ─── ABA CARTELAS ─── */}
        {activeTab === "cartelas" && (
          <div className="p-3 space-y-3">

            {/* STEP: Lista de bingos */}
            {step === "list" && (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-bold text-white">Bingos Disponíveis</h1>
                  <Button variant="ghost" size="sm" onClick={() => refetchRooms()} className="text-blue-400">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {roomsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 rounded-xl bg-blue-900/20 animate-pulse" />
                    ))}
                  </div>
                ) : !activeRooms.length ? (
                  <Card className="bg-blue-900/20 border-blue-800/40 text-center py-12">
                    <CardContent>
                      <Ticket className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                      <p className="text-blue-300 text-sm">Nenhum bingo ativo no momento.</p>
                      <p className="text-blue-500 text-xs mt-1">Aguarde o administrador iniciar um bingo.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {activeRooms.map((room: any) => {
                      const statusInfo = STATUS_LABELS[room.status] ?? STATUS_LABELS.open;
                      return (
                        <Card key={room.id}
                          className="bg-[#0d1530] border-blue-800/40 cursor-pointer hover:border-blue-500/60 transition-all"
                          onClick={() => handleSelectRoom(room)}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-bold text-white text-lg">{room.name}</p>
                                <p className="text-sm text-blue-400 mt-0.5">
                                  R$ {CARD_PRICE.toFixed(2)} por cartela
                                </p>
                              </div>
                              <Badge className={`text-xs border ${statusInfo.color}`}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-blue-900/30 rounded-lg p-2 text-center">
                                <p className="text-xs text-blue-400">Quadra</p>
                                <p className="text-sm font-bold text-white">R$ {Number(room.prizeQuadra ?? 0).toFixed(2)}</p>
                              </div>
                              <div className="bg-blue-900/30 rounded-lg p-2 text-center">
                                <p className="text-xs text-blue-400">Quina</p>
                                <p className="text-sm font-bold text-white">R$ {Number(room.prizeQuina ?? 0).toFixed(2)}</p>
                              </div>
                              <div className="bg-green-900/30 rounded-lg p-2 text-center">
                                <p className="text-xs text-green-400">Bingo</p>
                                <p className="text-sm font-bold text-green-300">R$ {Number(room.prizeFullCard ?? 0).toFixed(2)}</p>
                              </div>
                            </div>
                            <Button size="lg" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-base py-4">
                              <ShoppingCart className="w-5 h-5 mr-2" /> Vender Cartelas
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* STEP: Formulário de venda - novo layout */}
            {step === "form" && selectedRoom && (
              <div className="flex flex-col h-full">
                {/* Header da tela de venda */}
                <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                  <button
                    onClick={() => setStep("list")}
                    className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium transition-colors">
                    ← Voltar
                  </button>
                  <div>
                    <h1 className="text-base font-bold text-white leading-tight">Vender Cartelas</h1>
                    <p className="text-xs text-gray-500">{selectedRoom.name} — R$ {CARD_PRICE.toFixed(2)}/cartela</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                  <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-white">{report?.cardCount ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Vendidas</p>
                  </div>
                  <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-green-400">{selectedRoom.maxCards ?? 1000}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Disponíveis</p>
                  </div>
                  <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-yellow-400">R$ {Number(report?.totalSales ?? 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Faturado</p>
                  </div>
                </div>

                {/* Seção de quantidade */}
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-300">Quantidade de Cartelas</span>
                  </div>

                  {/* Grid 4x3 de botões */}
                  <div className="grid grid-cols-4 gap-2">
                    {pageQuantities.map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        className={`rounded-xl py-3 flex flex-col items-center justify-center transition-all border ${
                          quantity === q
                            ? "bg-[#1d4ed8] border-[#3b82f6] shadow-lg shadow-blue-900/40"
                            : "bg-[#111827] border-[#1f2937] hover:border-[#374151]"
                        }`}>
                        <span className={`text-xl font-black leading-tight ${
                          quantity === q ? "text-white" : "text-white"
                        }`}>{q}</span>
                        <span className={`text-xs mt-0.5 ${
                          quantity === q ? "text-blue-200" : "text-gray-500"
                        }`}>R$ {(CARD_PRICE * q).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>

                  {/* Paginação */}
                  <div className="flex items-center justify-between mt-3 px-1">
                    <button
                      onClick={() => { setCardPage(Math.max(0, cardPage - 1)); }}
                      disabled={cardPage === 0}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium">
                      ‹ Anterior
                    </button>
                    <span className="text-xs text-gray-500">Pág. {cardPage + 1}/{totalPages}</span>
                    <button
                      onClick={() => { setCardPage(Math.min(totalPages - 1, cardPage + 1)); }}
                      disabled={cardPage === totalPages - 1}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium">
                      Próxima ›
                    </button>
                  </div>
                </div>

                {/* Botão confirmar */}
                <div className="px-3 pb-4 mt-auto">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-sm text-gray-400">Total a cobrar</span>
                    <span className="text-xl font-black text-green-400">R$ {(CARD_PRICE * quantity).toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-5 text-lg rounded-xl"
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando...</>
                    ) : (
                      <><CheckCircle className="w-5 h-5 mr-2" /> Confirmar e Imprimir</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP: Sucesso */}
            {step === "success" && (
              <div className="text-center space-y-4 py-6">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Venda Realizada!</h2>
                  <p className="text-blue-300 text-sm mt-1">{generatedCards.length} cartela(s) gerada(s)</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {generatedCards.slice(0, 6).map((card) => (
                    <div key={card.id} className="bg-[#0d1530] border border-blue-800/40 rounded-lg p-2">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(card.numbers || []).slice(0, 9).map((n: number) => (
                          <span key={n} className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">{n}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-blue-800/60 text-blue-300"
                    onClick={() => handlePrint(generatedCards, selectedRoom?.name ?? "", selectedRoom?.prizeQuadra, selectedRoom?.prizeQuina, selectedRoom?.prizeFullCard)}>
                    🖨️ Reimprimir
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white" onClick={handleNewSale}>
                    Nova Venda
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ABA RODADAS ─── */}
        {activeTab === "rodadas" && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-white">Próximas Rodadas</h1>
              <Button variant="ghost" size="sm" onClick={() => refetchRooms()} className="text-blue-400">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Rodadas ativas */}
            {activeRooms.length > 0 && (
              <div>
                <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">Em andamento</p>
                <div className="space-y-2">
                  {activeRooms.map((room: any) => {
                    const statusInfo = STATUS_LABELS[room.status] ?? STATUS_LABELS.open;
                    return (
                      <Card key={room.id} className="bg-[#0d1530] border-green-800/30">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Ticket className="w-5 h-5 text-green-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-white text-sm">{room.name}</p>
                                <p className="text-xs text-blue-400">R$ {Number(room.cardPrice).toFixed(2)}/cartela</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={`text-xs border ${statusInfo.color} mb-1`}>{statusInfo.label}</Badge>
                              <p className="text-xs text-blue-400">
                                🏆 R$ {Number(room.prizeFullCard ?? 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rodadas agendadas */}
            {scheduledRooms.length > 0 && (
              <div>
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2 mt-4">Agendadas</p>
                <div className="space-y-2">
                  {scheduledRooms.map((room: any) => (
                    <Card key={room.id} className="bg-[#0d1530] border-blue-800/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">{room.name}</p>
                              <p className="text-xs text-blue-400">
                                {room.startedAt ? new Date(room.startedAt).toLocaleString("pt-BR") : "Horário a definir"}
                              </p>
                            </div>
                          </div>
                          <Badge className="text-xs border text-blue-400 border-blue-500/40 bg-blue-500/10">
                            Agendado
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeRooms.length === 0 && scheduledRooms.length === 0 && (
              <Card className="bg-blue-900/20 border-blue-800/40 text-center py-12">
                <CardContent>
                  <Clock className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <p className="text-blue-300 text-sm">Nenhuma rodada ativa ou agendada.</p>
                  <p className="text-blue-500 text-xs mt-1">Aguarde o administrador programar um bingo.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── ABA PREMIADOS ─── */}
        {activeTab === "premiados" && (
          <div className="p-3 space-y-3">
            <h1 className="text-lg font-bold text-white">Premiados na Loja</h1>

            {reportLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-blue-900/20 animate-pulse" />)}
              </div>
            ) : !report?.winners?.length ? (
              <Card className="bg-blue-900/20 border-blue-800/40 text-center py-12">
                <CardContent>
                  <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-blue-300 text-sm">Nenhum prêmio registrado ainda.</p>
                  <p className="text-blue-500 text-xs mt-1">Os prêmios ganhos pelos seus clientes aparecerão aqui.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {report.winners.map((w: any, i: number) => {
                  const prizeType = w.winner?.prizeType;
                  const prizeLabel = prizeType === "full_card" ? "Bingo!" : prizeType === "quina" ? "Quina" : "Quadra";
                  const prizeColor = prizeType === "full_card" ? "text-yellow-400" : prizeType === "quina" ? "text-purple-400" : "text-blue-400";
                  const prizeAmount = prizeType === "full_card"
                    ? w.room?.prizeFullCard
                    : prizeType === "quina"
                    ? w.room?.prizeQuina
                    : w.room?.prizeQuadra;
                  return (
                    <Card key={i} className="bg-[#0d1530] border-yellow-800/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                              <Star className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">
                                {w.card?.playerName ?? "Cliente"}
                              </p>
                              <p className="text-xs text-blue-400">{w.room?.name ?? "Bingo"}</p>
                              <p className="text-xs text-gray-500">
                                {w.winner?.confirmedAt ? new Date(w.winner.confirmedAt).toLocaleString("pt-BR") : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-sm ${prizeColor}`}>{prizeLabel}</p>
                            <p className="text-white font-bold">R$ {Number(prizeAmount ?? 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── ABA RELATÓRIO ─── */}
        {activeTab === "relatorio" && (
          <div className="p-3 space-y-3">
            <h1 className="text-lg font-bold text-white">Relatório Financeiro</h1>

            {reportLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-blue-900/20 animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Cards de resumo */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-[#0d1530] border-blue-800/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-blue-400" />
                        <p className="text-xs text-blue-400">Kit (Cartelas)</p>
                      </div>
                      <p className="text-xl font-black text-white">{report?.cardCount ?? 0}</p>
                      <p className="text-xs text-blue-500">cartelas vendidas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0d1530] border-green-800/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <p className="text-xs text-green-400">Total Vendas</p>
                      </div>
                      <p className="text-xl font-black text-green-400">
                        R$ {Number(report?.totalSales ?? 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-green-600">valor bruto</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0d1530] border-yellow-800/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                        <p className="text-xs text-yellow-400">Sua Comissão (30%)</p>
                      </div>
                      <p className="text-xl font-black text-yellow-400">
                        R$ {Number(report?.commission ?? 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-yellow-600">seu ganho</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0d1530] border-red-800/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-xs text-red-400">Repasse Admin (70%)</p>
                      </div>
                      <p className="text-xl font-black text-red-400">
                        R$ {Number(report?.netToAdmin ?? 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-red-600">a repassar</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Prêmios que saíram */}
                {(report?.winners?.length ?? 0) > 0 && (
                  <Card className="bg-[#0d1530] border-yellow-800/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                        <Trophy className="w-4 h-4" /> Prêmios que saíram na loja
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {report?.winners?.map((w: any, i: number) => {
                        const prizeType = w.winner?.prizeType;
                        const prizeLabel = prizeType === "full_card" ? "Bingo" : prizeType === "quina" ? "Quina" : "Quadra";
                        const prizeAmount = prizeType === "full_card" ? w.room?.prizeFullCard
                          : prizeType === "quina" ? w.room?.prizeQuina : w.room?.prizeQuadra;
                        return (
                          <div key={i} className="flex justify-between items-center text-sm border-b border-blue-900/30 pb-2">
                            <div>
                              <p className="text-white font-medium">{w.card?.playerName ?? "Cliente"}</p>
                              <p className="text-xs text-blue-400">{w.room?.name} · {prizeLabel}</p>
                            </div>
                            <p className="text-yellow-400 font-bold">R$ {Number(prizeAmount ?? 0).toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Histórico de vendas */}
                <Card className="bg-[#0d1530] border-blue-800/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Histórico de Vendas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!report?.transactions?.length ? (
                      <p className="text-blue-500 text-sm text-center py-4">Nenhuma venda registrada ainda.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {report.transactions
                          .filter((t: any) => t.type === "card_sale")
                          .slice(0, 30)
                          .map((t: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs border-b border-blue-900/30 pb-1.5">
                              <div>
                                <p className="text-white">Venda de cartela</p>
                                <p className="text-blue-500">
                                  {t.createdAt ? new Date(t.createdAt).toLocaleString("pt-BR") : "—"}
                                </p>
                              </div>
                              <p className="text-green-400 font-bold">R$ {Number(t.amount).toFixed(2)}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
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
              <Input value={estName} onChange={(e) => setEstName(e.target.value)}
                placeholder="Ex: Bar do João"
                className="bg-blue-950/40 border-blue-800/60 text-white mt-1" />
            </div>
            <div>
              <Label className="text-blue-300 text-xs">Endereço</Label>
              <Input value={estAddress} onChange={(e) => setEstAddress(e.target.value)}
                placeholder="Rua, número, bairro"
                className="bg-blue-950/40 border-blue-800/60 text-white mt-1" />
            </div>
            <div>
              <Label className="text-blue-300 text-xs">Telefone</Label>
              <Input value={estPhone} onChange={(e) => setEstPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-blue-950/40 border-blue-800/60 text-white mt-1" />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-500"
              onClick={() => updateEstablishmentMutation.mutate({
                establishmentName: estName,
                establishmentAddress: estAddress,
                establishmentPhone: estPhone,
              })}
              disabled={updateEstablishmentMutation.isPending}>
              {updateEstablishmentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
