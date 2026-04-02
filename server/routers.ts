import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateCard, getColumnLabel } from "./bingo-engine";
import {
  clearDrawnNumbers,
  countCardsByRoom,
  createCard,
  createRoom,
  createTransaction,
  createWinner,
  deleteRoom,
  getCardByToken,
  getCardsByRoom,
  getDrawnNumbers,
  getRoomById,
  getRoomBySlug,
  getRoomsByOperator,
  getRevenueByOperator,
  getSubscriptionPlans,
  getTransactionsByOperator,
  getWinnersByRoom,
  updateCard,
  updateRoom,
  updateUserSubscription,
} from "./db";
import {
  emitRoomStatusChanged,
  performDraw,
  startAutoDraw,
  stopAutoDraw,
} from "./socket-manager";

// ─── Helper: verificar limites do plano ───────────────────────────────────────
const PLAN_LIMITS = {
  free:         { maxRooms: 1,   maxCardsPerRoom: 50   },
  basic:        { maxRooms: 3,   maxCardsPerRoom: 200  },
  professional: { maxRooms: 10,  maxCardsPerRoom: 500  },
  premium:      { maxRooms: 9999, maxCardsPerRoom: 9999 },
};

function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
}

// ─── Routers ──────────────────────────────────────────────────────────────────
const bingoRoomsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getRoomsByOperator(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const room = await getRoomById(input.id);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sala não encontrada" });
      }
      return room;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(255),
        description: z.string().optional(),
        cardPrice: z.number().min(0).default(10),
        prize: z.number().min(0).default(0),
        prizeDescription: z.string().optional(),
        drawIntervalSeconds: z.number().min(3).max(60).default(5),
        maxCards: z.number().min(1).max(9999).default(200),
        winCondition: z.enum(["line", "column", "full_card", "any"]).default("any"),
        autoDrawEnabled: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const limits = getPlanLimits(ctx.user.subscriptionPlan);
      const existingRooms = await getRoomsByOperator(ctx.user.id);
      const activeRooms = existingRooms.filter((r) => r.status !== "finished");
      if (activeRooms.length >= limits.maxRooms) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Seu plano permite no máximo ${limits.maxRooms} sala(s) ativa(s). Faça upgrade para criar mais.`,
        });
      }

      const slug = nanoid(10).toLowerCase();
      const id = await createRoom({
        operatorId: ctx.user.id,
        name: input.name,
        description: input.description,
        cardPrice: String(input.cardPrice) as any,
        prize: String(input.prize) as any,
        prizeDescription: input.prizeDescription,
        drawIntervalSeconds: input.drawIntervalSeconds,
        maxCards: input.maxCards,
        winCondition: input.winCondition,
        autoDrawEnabled: input.autoDrawEnabled,
        publicSlug: slug,
      });
      return { id, slug };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(3).max(255).optional(),
        description: z.string().optional(),
        cardPrice: z.number().min(0).optional(),
        prize: z.number().min(0).optional(),
        prizeDescription: z.string().optional(),
        drawIntervalSeconds: z.number().min(3).max(60).optional(),
        maxCards: z.number().min(1).max(9999).optional(),
        winCondition: z.enum(["line", "column", "full_card", "any"]).optional(),
        autoDrawEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const room = await getRoomById(id);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (room.status === "running" || room.status === "finished") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível editar uma sala em andamento ou finalizada" });
      }
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.cardPrice !== undefined) updateData.cardPrice = String(data.cardPrice);
      if (data.prize !== undefined) updateData.prize = String(data.prize);
      if (data.prizeDescription !== undefined) updateData.prizeDescription = data.prizeDescription;
      if (data.drawIntervalSeconds !== undefined) updateData.drawIntervalSeconds = data.drawIntervalSeconds;
      if (data.maxCards !== undefined) updateData.maxCards = data.maxCards;
      if (data.winCondition !== undefined) updateData.winCondition = data.winCondition;
      if (data.autoDrawEnabled !== undefined) updateData.autoDrawEnabled = data.autoDrawEnabled;
      await updateRoom(id, ctx.user.id, updateData);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.id);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (room.status === "running") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Encerre o bingo antes de deletar" });
      }
      await deleteRoom(input.id, ctx.user.id);
      return { success: true };
    }),

  // Controles de sorteio
  start: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.id);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (!["draft", "open", "paused"].includes(room.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sala não pode ser iniciada neste estado" });
      }
      await updateRoom(input.id, ctx.user.id, {
        status: "running",
        startedAt: room.startedAt ?? new Date(),
      });
      emitRoomStatusChanged(input.id, "running");
      if (room.autoDrawEnabled) {
        startAutoDraw(input.id, ctx.user.id, room.drawIntervalSeconds);
      }
      return { success: true };
    }),

  pause: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.id);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      stopAutoDraw(input.id);
      await updateRoom(input.id, ctx.user.id, { status: "paused" });
      emitRoomStatusChanged(input.id, "paused");
      return { success: true };
    }),

  finish: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.id);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      stopAutoDraw(input.id);
      await updateRoom(input.id, ctx.user.id, { status: "finished", finishedAt: new Date() });
      emitRoomStatusChanged(input.id, "finished");
      return { success: true };
    }),

  open: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.id);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await updateRoom(input.id, ctx.user.id, { status: "open" });
      emitRoomStatusChanged(input.id, "open");
      return { success: true };
    }),

  // Dados públicos da sala (para tela ao vivo)
  getPublic: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const room = await getRoomBySlug(input.slug);
      if (!room) throw new TRPCError({ code: "NOT_FOUND" });
      const drawn = await getDrawnNumbers(room.id);
      const winnersData = await getWinnersByRoom(room.id);
      return {
        id: room.id,
        name: room.name,
        status: room.status,
        currentBall: room.currentBall,
        winCondition: room.winCondition,
        prize: room.prize,
        prizeDescription: room.prizeDescription,
        drawnNumbers: drawn,
        winners: winnersData,
      };
    }),
});

// ─── Cards Router ─────────────────────────────────────────────────────────────
const cardsRouter = router({
  generate: protectedProcedure
    .input(
      z.object({
        roomId: z.number(),
        playerName: z.string().optional(),
        playerPhone: z.string().optional(),
        quantity: z.number().min(1).max(50).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.roomId);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sala não encontrada" });
      }
      if (!["open", "draft"].includes(room.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sala não está aberta para venda de cartelas" });
      }

      const limits = getPlanLimits(ctx.user.subscriptionPlan);
      const currentCount = await countCardsByRoom(input.roomId);
      if (currentCount + input.quantity > limits.maxCardsPerRoom) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Limite de ${limits.maxCardsPerRoom} cartelas por sala atingido`,
        });
      }
      if (currentCount + input.quantity > room.maxCards) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Limite máximo da sala é ${room.maxCards} cartelas`,
        });
      }

      const generatedCards = [];
      for (let i = 0; i < input.quantity; i++) {
        const { grid, token } = generateCard();
        const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL
          ? `https://${process.env.VITE_APP_ID}.manus.space`
          : "http://localhost:3000";
        const cardUrl = `${baseUrl}/play/${token}`;
        const qrCodeDataUrl = await QRCode.toDataURL(cardUrl, {
          errorCorrectionLevel: "M",
          width: 200,
        });

        const cardId = await createCard({
          roomId: input.roomId,
          operatorId: ctx.user.id,
          token,
          qrCodeData: cardUrl,
          grid: grid as any,
          playerName: input.playerName,
          playerPhone: input.playerPhone,
          pricePaid: room.cardPrice as any,
          markedNumbers: [] as any,
        });

        // Registrar transação
        await createTransaction({
          operatorId: ctx.user.id,
          roomId: input.roomId,
          cardId,
          type: "card_sale",
          amount: room.cardPrice as any,
          status: "approved",
          paymentMethod: "manual",
        });

        generatedCards.push({ id: cardId, token, qrCode: qrCodeDataUrl, cardUrl, grid });
      }

      return generatedCards;
    }),

  listByRoom: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const room = await getRoomById(input.roomId);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return getCardsByRoom(input.roomId, ctx.user.id);
    }),

  // Acesso público via token (área do jogador)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const card = await getCardByToken(input.token);
      if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Cartela não encontrada" });
      const room = await getRoomById(card.roomId);
      const drawn = await getDrawnNumbers(card.roomId);
      return {
        card: {
          id: card.id,
          token: card.token,
          grid: card.grid,
          status: card.status,
          playerName: card.playerName,
          playerPhone: card.playerPhone,
          qrCode: card.qrCodeData ? await QRCode.toDataURL(card.qrCodeData, { width: 200, margin: 1 }) : null,
          markedNumbers: drawn.filter((n) => {
            const grid = card.grid as number[][];
            return grid.some((col) => col.includes(n));
          }),
        },
        room: room
          ? {
              id: room.id,
              name: room.name,
              status: room.status,
              currentBall: room.currentBall,
              prize: room.prize,
              prizeDescription: room.prizeDescription,
              publicSlug: room.publicSlug,
              cardPrice: room.cardPrice,
            }
          : null,
        drawnNumbers: drawn,
      };
    }),

  cancel: protectedProcedure
    .input(z.object({ cardId: z.number(), roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.roomId);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await updateCard(input.cardId, { status: "cancelled" });
      return { success: true };
    }),
});

// ─── Draw Router ──────────────────────────────────────────────────────────────
const drawRouter = router({
  manual: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return performDraw(input.roomId, ctx.user.id);
    }),

  getNumbers: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const room = await getRoomById(input.roomId);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const drawn = await getDrawnNumbers(input.roomId);
      return drawn.map((n) => ({ number: n, column: getColumnLabel(n) }));
    }),

  reset: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.roomId);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (room.status === "running") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pause o bingo antes de resetar" });
      }
      await clearDrawnNumbers(input.roomId);
      await updateRoom(input.roomId, ctx.user.id, { currentBall: null as any });
      return { success: true };
    }),

  startAuto: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomById(input.roomId);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (room.status !== "running") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Inicie o bingo primeiro" });
      }
      startAutoDraw(input.roomId, ctx.user.id, room.drawIntervalSeconds);
      return { success: true };
    }),

  stopAuto: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      stopAutoDraw(input.roomId);
      return { success: true };
    }),
});

// ─── Transactions Router ──────────────────────────────────────────────────────
const transactionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getTransactionsByOperator(ctx.user.id);
  }),

  revenue: protectedProcedure.query(async ({ ctx }) => {
    return getRevenueByOperator(ctx.user.id);
  }),
});

// ─── Subscriptions Router ─────────────────────────────────────────────────────
const subscriptionsRouter = router({
  plans: publicProcedure.query(async () => {
    return getSubscriptionPlans();
  }),

  current: protectedProcedure.query(async ({ ctx }) => {
    return {
      plan: ctx.user.subscriptionPlan,
      expiresAt: (ctx.user as any).subscriptionExpiresAt,
      limits: getPlanLimits(ctx.user.subscriptionPlan),
    };
  }),

  // Simulação de upgrade (sem pagamento real — preparado para PagSeguro)
  upgrade: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["free", "basic", "professional", "premium"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await updateUserSubscription(ctx.user.id, input.plan, expiresAt);

      if (input.plan !== "free") {
        const plans = await getSubscriptionPlans();
        const selectedPlan = plans.find((p) => p.slug === input.plan);
        if (selectedPlan) {
          await createTransaction({
            operatorId: ctx.user.id,
            type: "subscription",
            amount: selectedPlan.monthlyPrice as any,
            status: "approved",
            paymentMethod: "simulated",
          });
        }
      }

      return { success: true, plan: input.plan, expiresAt };
    }),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────
const adminRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const rooms = await getRoomsByOperator(ctx.user.id);
    const revenue = await getRevenueByOperator(ctx.user.id);
    const activeRooms = rooms.filter((r) => ["open", "running", "paused"].includes(r.status));
    const finishedRooms = rooms.filter((r) => r.status === "finished");

    let totalCards = 0;
    for (const room of rooms) {
      const count = await countCardsByRoom(room.id);
      totalCards += count;
    }

    return {
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      finishedRooms: finishedRooms.length,
      totalCards,
      revenue,
      recentRooms: rooms.slice(0, 5),
    };
  }),

  winners: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const room = await getRoomById(input.roomId);
      if (!room || room.operatorId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return getWinnersByRoom(input.roomId);
    }),
});

// ─── Public Buy Router (compra pública sem autenticação) ────────────────────
const publicBuyRouter = router({
  // Busca dados da sala para exibir na página de compra
  getRoomInfo: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const room = await getRoomBySlug(input.slug);
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Bingo não encontrado" });
      if (!['open', 'draft', 'running'].includes(room.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este bingo não está aceitando novas cartelas" });
      }
      const soldCount = await countCardsByRoom(room.id);
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        cardPrice: room.cardPrice,
        prize: room.prize,
        prizeDescription: room.prizeDescription,
        maxCards: room.maxCards,
        soldCount,
        availableCount: room.maxCards - soldCount,
        status: room.status,
        publicSlug: room.publicSlug,
        drawIntervalSeconds: room.drawIntervalSeconds,
        winCondition: room.winCondition,
      };
    }),

  // Compra pública de cartelas (sem login)
  buyCards: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        playerName: z.string().min(2).max(100),
        playerPhone: z.string().min(8).max(20),
        quantity: z.number().min(1).max(20),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getRoomBySlug(input.slug);
      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Bingo não encontrado" });
      if (!['open', 'draft'].includes(room.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este bingo não está aceitando novas cartelas" });
      }

      const currentCount = await countCardsByRoom(room.id);
      if (currentCount + input.quantity > room.maxCards) {
        const available = room.maxCards - currentCount;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: available <= 0
            ? "Todas as cartelas já foram vendidas"
            : `Apenas ${available} cartela(s) disponível(is)`,
        });
      }

      const generatedCards = [];
      const baseUrl = process.env.VITE_APP_ID
        ? `https://${process.env.VITE_APP_ID}.manus.space`
        : "http://localhost:3000";

      for (let i = 0; i < input.quantity; i++) {
        const { grid, token } = generateCard();
        const cardUrl = `${baseUrl}/play/${token}`;
        const qrCodeDataUrl = await QRCode.toDataURL(cardUrl, {
          errorCorrectionLevel: "M",
          width: 200,
        });

        const cardId = await createCard({
          roomId: room.id,
          operatorId: room.operatorId,
          token,
          qrCodeData: cardUrl,
          grid: grid as any,
          playerName: input.playerName,
          playerPhone: input.playerPhone,
          pricePaid: room.cardPrice as any,
          markedNumbers: [] as any,
        });

        await createTransaction({
          operatorId: room.operatorId,
          roomId: room.id,
          cardId,
          type: "card_sale",
          amount: room.cardPrice as any,
          status: "approved",
          paymentMethod: "public_link",
        });

        generatedCards.push({ id: cardId, token, qrCode: qrCodeDataUrl, cardUrl, grid });
      }

      return {
        success: true,
        cards: generatedCards,
        totalPaid: Number(room.cardPrice) * input.quantity,
        roomName: room.name,
      };
    }),

  // Dados completos para tela de transmissão (TV/telão)
  getShowData: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const room = await getRoomBySlug(input.slug);
      if (!room) throw new TRPCError({ code: "NOT_FOUND" });
      const drawn = await getDrawnNumbers(room.id);
      const winners = await getWinnersByRoom(room.id);
      const soldCount = await countCardsByRoom(room.id);
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        status: room.status,
        currentBall: room.currentBall,
        winCondition: room.winCondition,
        prize: room.prize,
        prizeDescription: room.prizeDescription,
        drawIntervalSeconds: room.drawIntervalSeconds,
        drawnNumbers: drawn,
        winners,
        soldCount,
        publicSlug: room.publicSlug,
        cardPrice: room.cardPrice,
      };
    }),
});
// ─── App Router ────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  rooms: bingoRoomsRouter,
  cards: cardsRouter,
  draw: drawRouter,
  transactions: transactionsRouter,
  subscriptions: subscriptionsRouter,
  admin: adminRouter,
  publicBuy: publicBuyRouter,
});

export type AppRouter = typeof appRouter;
