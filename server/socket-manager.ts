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
import { BingoGrid, checkWin, drawNextNumber } from "./bingo-engine";

let io: SocketIOServer | null = null;

// Timers de sorteio automático por sala
const autoDrawTimers = new Map<number, NodeJS.Timeout>();

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
      // Envia estado atual da sala
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

// ─── Motor de sorteio automático ──────────────────────────────────────────────

export async function performDraw(roomId: number, operatorId: number): Promise<{
  number: number | null;
  allDrawn: number[];
  newWinners: any[];
}> {
  const room = await getRoomById(roomId);
  if (!room || room.operatorId !== operatorId) {
    throw new Error("Sala não encontrada ou sem permissão");
  }
  if (room.status !== "running") {
    throw new Error("Sala não está em execução");
  }

  const alreadyDrawn = await getDrawnNumbers(roomId);
  const nextNumber = drawNextNumber(alreadyDrawn);

  if (nextNumber === null) {
    // Todos os números foram sorteados
    await updateRoom(roomId, operatorId, { status: "finished", finishedAt: new Date() });
    emitRoomStatusChanged(roomId, "finished");
    stopAutoDraw(roomId);
    return { number: null, allDrawn: alreadyDrawn, newWinners: [] };
  }

  const sequence = alreadyDrawn.length + 1;
  await addDrawnNumber({ roomId, number: nextNumber, sequence });

  const updatedDrawn = [...alreadyDrawn, nextNumber];
  await updateRoom(roomId, operatorId, { currentBall: nextNumber });

  // Verificar ganhadores
  const cards = await getCardsByRoom(roomId, operatorId);
  const newWinners: any[] = [];

  for (const card of cards) {
    if (card.status === "winner") continue;
    const grid = card.grid as BingoGrid;
    const winType = checkWin(
      grid,
      updatedDrawn,
      room.winCondition as "line" | "column" | "full_card" | "any"
    );

    if (winType) {
      // Determinar o prêmio de acordo com o tipo de vitória
      let prizeAmount: any = room.prize;
      if (winType === "quadra") prizeAmount = room.prizeQuadra ?? room.prize;
      else if (winType === "quina") prizeAmount = room.prizeQuina ?? room.prize;
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
    }
  }

  emitNumberDrawn(roomId, nextNumber, updatedDrawn, newWinners);

  return { number: nextNumber, allDrawn: updatedDrawn, newWinners };
}

export function startAutoDraw(roomId: number, operatorId: number, intervalSeconds: number) {
  stopAutoDraw(roomId);
  const timer = setInterval(async () => {
    try {
      const result = await performDraw(roomId, operatorId);
      if (result.number === null) {
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
