/**
 * usePrinter — Hook centralizado para impressão no app Bingo da Sorte
 *
 * Detecta automaticamente se está rodando no app Android nativo e usa
 * a interface Android.imprimir* para impressão na impressora interna
 * da Moderninha Smart (PAX NeptuneLite).
 *
 * Fallback: iframe/window.print() para navegadores comuns.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";

// Tipagem da interface Android injetada pelo app nativo
declare global {
  interface Window {
    Android?: {
      imprimir: (dados: string) => void;
      imprimirTexto: (texto: string) => void;
      imprimirImagem: (base64: string) => void;
      imprimirQRCode: (conteudo: string, titulo: string) => void;
      imprimirCartela: (dadosJson: string) => void;
      impressoraDisponivel: () => boolean;
      statusImpressora: () => string;
      mostrarMensagem: (msg: string) => void;
    };
    // Interface legada (APK v5/v6)
    AndroidPrinter?: {
      printCards: (json: string) => void;
    };
    isNativeApp?: boolean;
    isBingoDaSorteApp?: boolean;
  }
}

export type PrinterStatus = "disponivel" | "indisponivel" | "verificando";

export interface CardPrintData {
  numero: string;
  titulo: string;
  qrcode: string;
  numeros: number[][];
  jogador?: string;
}

export function usePrinter() {
  const [status, setStatus] = useState<PrinterStatus>("verificando");

  useEffect(() => {
    // Verificar disponibilidade ao montar
    const check = () => {
      if (isNativeAndroid()) {
        setStatus("disponivel");
      } else {
        setStatus("indisponivel");
      }
    };

    check();

    // Escutar quando o app nativo estiver pronto
    const handler = () => {
      check();
    };
    document.addEventListener("nativeAppReady", handler);

    // Escutar resultados de impressão
    const onSucesso = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast.success(detail?.mensagem || "Impresso com sucesso!");
    };
    const onErro = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast.error("Erro na impressão: " + (detail?.erro || "Tente novamente"));
    };

    document.addEventListener("impressaoSucesso", onSucesso);
    document.addEventListener("impressaoErro", onErro);

    return () => {
      document.removeEventListener("nativeAppReady", handler);
      document.removeEventListener("impressaoSucesso", onSucesso);
      document.removeEventListener("impressaoErro", onErro);
    };
  }, []);

  return {
    status,
    isNative: status === "disponivel",
    imprimirTexto,
    imprimirImagem,
    imprimirQRCode,
    imprimirCartela,
    imprimirCartelasCompletas,
    impressoraDisponivel: isNativeAndroid,
  };
}

// ============================================================
// Funções exportadas (podem ser usadas fora do hook também)
// ============================================================

/**
 * Verifica se está rodando no app nativo Android com a nova interface
 */
export function isNativeAndroid(): boolean {
  return typeof window.Android !== "undefined";
}

/**
 * Verifica se está no app nativo (nova ou legada interface)
 */
export function isAnyAndroidApp(): boolean {
  return isNativeAndroid() || typeof window.AndroidPrinter !== "undefined";
}

/**
 * Imprime texto simples na impressora nativa
 */
export function imprimirTexto(texto: string): void {
  if (!isNativeAndroid()) {
    toast.error("Impressora não disponível neste dispositivo");
    return;
  }
  try {
    toast.info("Enviando para impressão...");
    window.Android!.imprimirTexto(texto);
  } catch (err) {
    toast.error("Erro ao imprimir: " + String(err));
  }
}

/**
 * Imprime imagem em base64
 */
export function imprimirImagem(base64: string): void {
  if (!isNativeAndroid()) {
    toast.error("Impressora não disponível neste dispositivo");
    return;
  }
  try {
    toast.info("Enviando imagem para impressão...");
    window.Android!.imprimirImagem(base64);
  } catch (err) {
    toast.error("Erro ao imprimir imagem: " + String(err));
  }
}

/**
 * Imprime QR Code com título
 */
export function imprimirQRCode(conteudo: string, titulo: string): void {
  if (!isNativeAndroid()) {
    toast.error("Impressora não disponível neste dispositivo");
    return;
  }
  try {
    toast.info("Imprimindo QR Code...");
    window.Android!.imprimirQRCode(conteudo, titulo);
  } catch (err) {
    toast.error("Erro ao imprimir QR Code: " + String(err));
  }
}

/**
 * Imprime uma cartela completa (texto + QR Code)
 */
export function imprimirCartela(dados: CardPrintData): void {
  if (!isNativeAndroid()) {
    toast.error("Impressora não disponível neste dispositivo");
    return;
  }
  try {
    toast.info("Imprimindo cartela...");
    window.Android!.imprimirCartela(JSON.stringify(dados));
  } catch (err) {
    toast.error("Erro ao imprimir cartela: " + String(err));
  }
}

/**
 * Imprime múltiplas cartelas em sequência
 * Cada cartela é enviada separadamente para a impressora
 */
export function imprimirCartelasCompletas(
  cards: Array<{
    id: number;
    token: string;
    qrCode: string;
    cardUrl: string;
    grid: number[][];
    numbers?: number[];
  }>,
  playerName: string,
  roomName: string
): void {
  if (!isNativeAndroid()) {
    // Tentar interface legada
    if (typeof window.AndroidPrinter !== "undefined") {
      try {
        const cardsData = cards.map((card) => ({
          numbers: card.numbers ?? card.grid.flat().filter((n) => n !== 0),
          playerName,
          cardId: card.token.slice(0, 8).toUpperCase(),
          roomName,
        }));
        window.AndroidPrinter!.printCards(JSON.stringify(cardsData));
        toast.info("Enviando para impressão...");
      } catch (err) {
        toast.error("Erro na impressão: " + String(err));
      }
    } else {
      toast.error("Impressora não disponível neste dispositivo");
    }
    return;
  }

  try {
    toast.info(`Imprimindo ${cards.length} cartela(s)...`);

    // Imprimir cada cartela individualmente
    cards.forEach((card, idx) => {
      const numeros = card.numbers ?? card.grid.flat().filter((n) => n !== 0);

      // Organizar números em linhas de 5
      const linhas: number[][] = [];
      for (let i = 0; i < numeros.length; i += 5) {
        linhas.push(numeros.slice(i, i + 5));
      }

      const dados: CardPrintData = {
        numero: String(idx + 1).padStart(3, "0"),
        titulo: roomName || "BINGO DA SORTE",
        qrcode: card.cardUrl || "",
        numeros: linhas,
        jogador: playerName,
      };

      // Pequeno delay entre cartelas para não sobrecarregar a impressora
      setTimeout(() => {
        window.Android!.imprimirCartela(JSON.stringify(dados));
      }, idx * 500);
    });
  } catch (err) {
    toast.error("Erro ao imprimir cartelas: " + String(err));
  }
}
