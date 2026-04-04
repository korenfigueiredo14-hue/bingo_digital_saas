import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  BingoCard,
  BingoRoom,
  InsertBingoCard,
  InsertBingoRoom,
  InsertDrawnNumber,
  InsertTransaction,
  InsertUser,
  InsertWinner,
  bingoCards,
  bingoRooms,
  drawnNumbers,
  subscriptionPlans,
  transactions,
  users,
  winners,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createLocalUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Gerar openId único para usuários locais
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "local",
    lastSignedIn: new Date(),
  });
  return (result[0] as any).insertId;
}

export async function updateUserPasswordHash(userId: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ─── Bingo Rooms ──────────────────────────────────────────────────────────────
export async function createRoom(data: InsertBingoRoom): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(bingoRooms).values(data);
  return (result[0] as any).insertId;
}

export async function getRoomsByOperator(operatorId: number): Promise<BingoRoom[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bingoRooms)
    .where(eq(bingoRooms.operatorId, operatorId))
    .orderBy(desc(bingoRooms.createdAt));
}

export async function getRoomById(id: number): Promise<BingoRoom | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bingoRooms).where(eq(bingoRooms.id, id)).limit(1);
  return result[0];
}

export async function getRoomBySlug(slug: string): Promise<BingoRoom | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(bingoRooms)
    .where(eq(bingoRooms.publicSlug, slug))
    .limit(1);
  return result[0];
}

export async function updateRoom(
  id: number,
  operatorId: number,
  data: Partial<BingoRoom>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(bingoRooms)
    .set(data as any)
    .where(and(eq(bingoRooms.id, id), eq(bingoRooms.operatorId, operatorId)));
}

export async function deleteRoom(id: number, operatorId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(bingoRooms)
    .where(and(eq(bingoRooms.id, id), eq(bingoRooms.operatorId, operatorId)));
}

// ─── Bingo Cards ──────────────────────────────────────────────────────────────
export async function createCard(data: InsertBingoCard): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(bingoCards).values(data);
  return (result[0] as any).insertId;
}

export async function getCardsByRoom(roomId: number, operatorId: number): Promise<BingoCard[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bingoCards)
    .where(and(eq(bingoCards.roomId, roomId), eq(bingoCards.operatorId, operatorId)))
    .orderBy(desc(bingoCards.createdAt));
}

export async function getCardsByRoomPublic(roomId: number): Promise<BingoCard[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bingoCards)
    .where(and(eq(bingoCards.roomId, roomId), eq(bingoCards.status, "active")))
    .orderBy(desc(bingoCards.createdAt))
    .limit(200); // limitar para não sobrecarregar o telão
}

export async function getCardByToken(token: string): Promise<BingoCard | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(bingoCards)
    .where(eq(bingoCards.token, token))
    .limit(1);
  return result[0];
}

export async function updateCard(id: number, data: Partial<BingoCard>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(bingoCards)
    .set(data as any)
    .where(eq(bingoCards.id, id));
}

export async function countCardsByRoom(roomId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(bingoCards)
    .where(eq(bingoCards.roomId, roomId));
  return result[0]?.count ?? 0;
}

// ─── Drawn Numbers ────────────────────────────────────────────────────────────
export async function addDrawnNumber(data: InsertDrawnNumber): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(drawnNumbers).values(data);
}

export async function getDrawnNumbers(roomId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ number: drawnNumbers.number })
    .from(drawnNumbers)
    .where(eq(drawnNumbers.roomId, roomId))
    .orderBy(drawnNumbers.sequence);
  return result.map((r) => r.number);
}

export async function clearDrawnNumbers(roomId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(drawnNumbers).where(eq(drawnNumbers.roomId, roomId));
}

// ─── Winners ──────────────────────────────────────────────────────────────────
export async function createWinner(data: InsertWinner): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(winners).values(data);
}

export async function getWinnersByRoom(roomId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      winner: winners,
      card: bingoCards,
    })
    .from(winners)
    .leftJoin(bingoCards, eq(winners.cardId, bingoCards.id))
    .where(eq(winners.roomId, roomId));
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export async function createTransaction(data: InsertTransaction): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(transactions).values(data);
  return (result[0] as any).insertId;
}

export async function getTransactionsByOperator(operatorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.operatorId, operatorId))
    .orderBy(desc(transactions.createdAt));
}

export async function getRevenueByOperator(operatorId: number) {
  const db = await getDb();
  if (!db) return { total: 0, cardSales: 0, count: 0 };
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(amount), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.operatorId, operatorId),
        eq(transactions.status, "approved"),
        eq(transactions.type, "card_sale")
      )
    );
  return {
    total: Number(result[0]?.total ?? 0),
    cardSales: Number(result[0]?.total ?? 0),
    count: Number(result[0]?.count ?? 0),
  };
}

// ─── Subscription Plans ───────────────────────────────────────────────────────
export async function getSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
}

export async function updateUserSubscription(
  userId: number,
  plan: "free" | "basic" | "professional" | "premium",
  expiresAt?: Date
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ subscriptionPlan: plan, subscriptionExpiresAt: expiresAt ?? null } as any)
    .where(eq(users.id, userId));
}
