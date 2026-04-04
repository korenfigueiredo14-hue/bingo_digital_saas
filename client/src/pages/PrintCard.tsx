import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const COL_LABELS = ["B", "I", "N", "G", "O"];

export default function PrintCard() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data, isLoading, error } = trpc.cards.getByToken.useQuery({ token });

  useEffect(() => {
    if (data) {
      setTimeout(() => window.print(), 500);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-500">Preparando cartela para impressão...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-red-500">Cartela não encontrada.</p>
      </div>
    );
  }

  const { card, room } = data;
  // Suporte a ambos os formatos: 15 números (novo) ou grid 5x5 (legado)
  const cardNums: number[] = ((card as any).cardNumbers as number[] | null) ??
    (card.grid as number[][]).flat().filter((n: number) => n !== 0);

  function getColLabelPrint(n: number) {
    if (n <= 15) return "B";
    if (n <= 30) return "I";
    if (n <= 45) return "N";
    if (n <= 60) return "G";
    return "O";
  }

  return (
    <>
      {/* Botão de impressão (não aparece na impressão) */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={() => window.print()} size="sm">
          <Printer className="w-4 h-4 mr-2" /> Imprimir
        </Button>
      </div>

      {/* Layout de impressão térmica */}
      <div className="bg-white min-h-screen flex items-start justify-center p-4 print:p-0">
        <div
          className="bg-white text-black font-mono"
          style={{ width: "80mm", padding: "4mm", fontFamily: "monospace" }}
        >
          {/* Cabeçalho */}
          <div className="text-center border-b-2 border-black pb-2 mb-3">
            <div className="text-xl font-extrabold tracking-widest">BINGO</div>
            <div className="text-sm font-bold">{room?.name ?? "Bingo Digital"}</div>
            {room?.prizeDescription && (
              <div className="text-xs mt-1">🏆 {room.prizeDescription}</div>
            )}
          </div>

          {/* Info da cartela */}
          <div className="text-xs mb-3 space-y-0.5">
            <div>Cartela: <strong>#{card.id}</strong></div>
            {card.playerName && <div>Jogador: <strong>{card.playerName}</strong></div>}
            {card.playerPhone && <div>Tel: {card.playerPhone}</div>}
            {room?.cardPrice && <div>Valor: <strong>R${Number(room.cardPrice).toFixed(2)}</strong></div>}
          </div>

          {/* Prêmios */}
          {((room as any)?.prizeQuadra || (room as any)?.prizeQuina || (room as any)?.prizeFullCard) && (
            <div className="text-xs mb-3 border border-black p-1.5 space-y-0.5">
              <div className="font-bold text-center border-b border-black pb-1 mb-1">PRÊMIOS</div>
              {(room as any)?.prizeQuadra && Number((room as any).prizeQuadra) > 0 && (
                <div>Quadra (4 acertos): <strong>R${Number((room as any).prizeQuadra).toFixed(2)}</strong></div>
              )}
              {(room as any)?.prizeQuina && Number((room as any).prizeQuina) > 0 && (
                <div>Quina (5 acertos): <strong>R${Number((room as any).prizeQuina).toFixed(2)}</strong></div>
              )}
              {(room as any)?.prizeFullCard && Number((room as any).prizeFullCard) > 0 && (
                <div>Bingo! ({cardNums.length} acertos): <strong>R${Number((room as any).prizeFullCard).toFixed(2)}</strong></div>
              )}
            </div>
          )}

          {/* Cartela com 15 números */}
          <div className="border-2 border-black mb-3">
            <div className="text-center font-extrabold text-xs py-1 border-b-2 border-black bg-gray-100">
              SEUS {cardNums.length} NÚMEROS
            </div>
            {/* Grid 5 colunas × 3 linhas */}
            {Array.from({ length: Math.ceil(cardNums.length / 5) }, (_, row) => (
              <div key={row} className="grid grid-cols-5 border-b border-black last:border-b-0">
                {cardNums.slice(row * 5, row * 5 + 5).map((num, ci) => (
                  <div key={ci} className="text-center py-1.5 text-sm font-bold border-r border-black last:border-r-0">
                    <div className="text-xs text-gray-500 leading-none">{getColLabelPrint(num)}</div>
                    <div>{num}</div>
                  </div>
                ))}
                {/* Preencher células vazias na última linha */}
                {row === Math.ceil(cardNums.length / 5) - 1 &&
                  Array.from({ length: 5 - (cardNums.length % 5 || 5) }, (_, i) => (
                    <div key={`empty-${i}`} className="border-r border-black last:border-r-0" />
                  ))}
              </div>
            ))}
          </div>

          {/* QR Code */}
          {card.qrCode && (
            <div className="flex flex-col items-center mb-3">
              <img
                src={card.qrCode}
                alt="QR Code"
                className="w-24 h-24"
                style={{ imageRendering: "pixelated" }}
              />
              <p className="text-xs text-center mt-1">Escaneie para acompanhar ao vivo</p>
            </div>
          )}

          {/* Token */}
          <div className="text-center text-xs border-t border-dashed border-black pt-2">
            <div className="font-mono text-xs break-all">{card.token.slice(0, 24)}</div>
            <div className="mt-1 text-xs text-gray-500">BingoDigital SaaS</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white; }
          @page { size: 80mm auto; margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `}</style>
    </>
  );
}
