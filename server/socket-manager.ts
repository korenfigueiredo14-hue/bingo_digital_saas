import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import {
  addDrawnNumber,
  clearDrawnNumbers,
  createWinner,
  getCardByToken,
  getCardsByRoom,
  getDrawnNumbers,
  getRoomById,
  updateCard,
  updateRoom,
} from "./db";
import { BingoGrid, checkWin, checkWinByCount, drawNextNumber } from "./bingo-engine";

let io: SocketIOServer | null = null;

// Timers de sorteio automático por sala
const autoDrawTimers = new Map<number, NodeJS.Timeout>();

// ─── Constante: máximo de bolas por rodada ────────────────────────────────────
const MAX_BALLS_PER_ROUND = 15;

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
  });

  io.on("connection", (socket: Socket) => {
    // Jogador ou espectador entra em uma sala
    socket.on("join_room", async (roomId: number) => {
      socket.join(`room:${roomId}`);
      const room = await getRoomById(roomId);
      const drawn = await getDrawnNumbers(roomId);
      socket.emit("room_state", { room, drawnNumbers: drawn });
    });

    // Jogador entra com token de cartela
    socket.on("join_card", async (token: string) => {
      const card = await getCardByToken(token);
      if (!card) {
        socket.emit("error", { message: "Cartela não encontrada" });
        return;
      }
      socket.join(`room:${card.roomId}`);
      socket.join(`card:${token}`);
      const drawn = await getDrawnNumbers(card.roomId);
      socket.emit("card_state", { card, drawnNumbers: drawn });
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

// ─── Emissores de eventos ─────────────────────────────────────────────────────

export function emitNumberDrawn(
  roomId: number,
  number: number,
  allDrawn: number[],
  winners: any[]
) {
  if (!io) return;
  io.to(`room:${roomId}`).emit("number_drawn", {
    number,
    allDrawn,
    winners,
    timestamp: Date.now(),
  });
}

export function emitRoomStatusChanged(roomId: number, status: string) {
  if (!io) return;
  io.to(`room:${roomId}`).emit("room_status_changed", { status, timestamp: Date.now() });
}

export function emitWinner(roomId: number, winner: any) {
  if (!io) return;
  io.to(`room:${roomId}`).emit("winner_announced", { winner, timestamp: Date.now() });
  if (winner.cardToken) {
    io.to(`card:${winner.cardToken}`).emit("you_won", { winner, timestamp: Date.now() });
  }
}

// ─── Motor de sorteio ─────────────────────────────────────────────────────────

/**
 * Regras da rodada:
 * 1. Cada rodada sorteia no máximo 15 números de 1 a 90.
 * 2. Ganhadores são detectados sequencialmente:
 *    - Quadra (4 acertos): apenas 1 ganhador, o primeiro a atingir 4 acertos
 *    - Quina  (5 acertos): apenas 1 ganhador, o primeiro a atingir 5 acertos
 *    - Bingo  (15 acertos = cartela cheia): apenas 1 ganhador
 * 3. Após 15 bolas sorteadas OU após os 3 prêmios distribuídos, a rodada encerra.
 * 4. Um prêmio de nível superior NÃO cancela o inferior já conquistado.
 *    (ex: quem ganhou Quadra NÃO pode ganhar Quina na mesma rodada)
 */
export async function performDraw(roomId: number, operatorId: number): Promise<{
  number: number | null;
  allDrawn: number[];
  newWinners: any[];
  roundComplete: boolean;
}> {
  const room = await getRoomById(roomId);
  if (!room || room.operatorId !== operatorId) {
    throw new Error("Sala não encontrada ou sem permissão");
  }
  if (room.status !== "running") {
    throw new Error("Sala não está em execução");
  }

  const alreadyDrawn = await getDrawnNumbers(roomId);

  // ── Verificar se já atingiu o limite de 15 bolas ──────────────────────────
  if (alreadyDrawn.length >= MAX_BALLS_PER_ROUND) {
    await updateRoom(roomId, operatorId, { status: "finished", finishedAt: new Date() });
    emitRoomStatusChanged(roomId, "finished");
    stopAutoDraw(roomId);
    return { number: null, allDrawn: alreadyDrawn, newWinners: [], roundComplete: true };
  }

  const nextNumber = drawNextNumber(alreadyDrawn);
  if (nextNumber === null) {
    await updateRoom(roomId, operatorId, { status: "finished", finishedAt: new Date() });
    emitRoomStatusChanged(roomId, "finished");
    stopAutoDraw(roomId);
    return { number: null, allDrawn: alreadyDrawn, newWinners: [], roundComplete: true };
  }

  const sequence = alreadyDrawn.length + 1;
  await addDrawnNumber({ roomId, number: nextNumber, sequence });
  const updatedDrawn = [...alreadyDrawn, nextNumber];
  await updateRoom(roomId, operatorId, { currentBall: nextNumber });

  // ── Verificar ganhadores ──────────────────────────────────────────────────
  const cards = await getCardsByRoom(roomId, operatorId);
  const newWinners: any[] = [];

  // Buscar quais prêmios já foram distribuídos nesta rodada
  const existingWinners = cards.filter(c => c.status === "winner");
  const alreadyHasQuadra = existingWinners.some(c => c.winType === "quadra");
  const alreadyHasQuina  = existingWinners.some(c => c.winType === "quina");
  const alreadyHasBingo  = existingWinners.some(c => c.winType === "full_card");

  for (const card of cards) {
    // Cartela já ganhou algum prêmio — não pode ganhar novamente
    if (card.status === "winner") continue;

    const cardNums = card.cardNumbers as number[] | null;
    const matches = cardNums && cardNums.length > 0
      ? cardNums.filter((n: number) => updatedDrawn.includes(n)).length
      : 0;

    // Verificar cada nível de prêmio em ordem crescente (quadra → quina → bingo)
    // Apenas o nível mais alto elegível é concedido, e somente se ainda não houver ganhador

    let winType: "quadra" | "quina" | "full_card" | null = null;

    if (!alreadyHasBingo && matches >= 15) {
      winType = "full_card";
    } else if (!alreadyHasQuina && matches >= 5) {
      winType = "quina";
    } else if (!alreadyHasQuadra && matches >= 4) {
      winType = "quadra";
    }

    if (winType) {
      let prizeAmount: any = room.prize;
      if (winType === "quadra")    prizeAmount = room.prizeQuadra    ?? room.prize;
      else if (winType === "quina") prizeAmount = room.prizeQuina     ?? room.prize;
      else if (winType === "full_card") prizeAmount = room.prizeFullCard ?? room.prize;

      await updateCard(card.id, { status: "winner", winType: winType as any });
      await createWinner({
        roomId,
        cardId: card.id,
        operatorId,
        winType: winType as any,
        prizeAmount,
      });

      const winnerData = {
        cardId: card.id,
        cardToken: card.token,
        playerName: card.playerName,
        winType,
        prizeAmount,
      };
      newWinners.push(winnerData);
      emitWinner(roomId, winnerData);

      // Atualizar flags para não dar o mesmo prêmio a outra cartela neste sorteio
      if (winType === "quadra")    { /* alreadyHasQuadra = true — mas é const, usamos newWinners */ }
    }
  }

  emitNumberDrawn(roomId, nextNumber, updatedDrawn, newWinners);

  // ── Verificar se a rodada deve encerrar ───────────────────────────────────
  // Encerra se: atingiu 15 bolas OU os 3 prêmios foram distribuídos
  const totalWinners = existingWinners.length + newWinners.length;
  const allPrizesGiven = totalWinners >= 3 ||
    (alreadyHasQuadra || newWinners.some(w => w.winType === "quadra")) &&
    (alreadyHasQuina  || newWinners.some(w => w.winType === "quina")) &&
    (alreadyHasBingo  || newWinners.some(w => w.winType === "full_card"));

  const roundComplete = updatedDrawn.length >= MAX_BALLS_PER_ROUND || allPrizesGiven;

  if (roundComplete) {
    await updateRoom(roomId, operatorId, { status: "finished", finishedAt: new Date() });
    emitRoomStatusChanged(roomId, "finished");
    stopAutoDraw(roomId);
  }

  return { number: nextNumber, allDrawn: updatedDrawn, newWinners, roundComplete };
}

export function startAutoDraw(roomId: number, operatorId: number, intervalSeconds: number) {
  stopAutoDraw(roomId);
  const timer = setInterval(async () => {
    try {
      const result = await performDraw(roomId, operatorId);
      if (result.number === null || result.roundComplete) {
        stopAutoDraw(roomId);
      }
    } catch (err) {
      console.error(`[AutoDraw] Error in room ${roomId}:`, err);
      stopAutoDraw(roomId);
    }
  }, intervalSeconds * 1000);
  autoDrawTimers.set(roomId, timer);
}

export function stopAutoDraw(roomId: number) {
  const timer = autoDrawTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    autoDrawTimers.delete(roomId);
  }
}
