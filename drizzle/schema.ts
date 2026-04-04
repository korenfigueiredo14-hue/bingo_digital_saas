import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // SaaS subscription
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["free", "basic", "professional", "premium"])
    .default("free")
    .notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Bingo Rooms ──────────────────────────────────────────────────────────────
export const bingoRooms = mysqlTable("bingo_rooms", {
  id: int("id").autoincrement().primaryKey(),
  operatorId: int("operatorId").notNull(), // FK → users.id
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cardPrice: decimal("cardPrice", { precision: 10, scale: 2 }).notNull().default("10.00"),
  prize: decimal("prize", { precision: 10, scale: 2 }).notNull().default("0.00"),
  prizeDescription: text("prizeDescription"),
  status: mysqlEnum("status", ["draft", "open", "running", "paused", "finished"])
    .default("draft")
    .notNull(),
  drawIntervalSeconds: int("drawIntervalSeconds").default(5).notNull(),
  maxCards: int("maxCards").default(500).notNull(),
  currentBall: int("currentBall"),
  prizeQuadra: decimal("prizeQuadra", { precision: 10, scale: 2 }).default("0.00"),
  prizeQuina: decimal("prizeQuina", { precision: 10, scale: 2 }).default("0.00"),
  prizeFullCard: decimal("prizeFullCard", { precision: 10, scale: 2 }).default("0.00"),
  winCondition: mysqlEnum("winCondition", ["line", "column", "full_card", "any"])
    .default("any")
    .notNull(),
  autoDrawEnabled: boolean("autoDrawEnabled").default(false).notNull(),
  publicSlug: varchar("publicSlug", { length: 64 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  startedAt: timestamp("startedAt"),
  finishedAt: timestamp("finishedAt"),
});

export type BingoRoom = typeof bingoRooms.$inferSelect;
export type InsertBingoRoom = typeof bingoRooms.$inferInsert;

// ─── Bingo Cards ──────────────────────────────────────────────────────────────
// A cartela é uma grade 5x5 com números de 1-75 organizados em colunas B-I-N-G-O
// B: 1-15, I: 16-30, N: 31-45 (centro livre), G: 46-60, O: 61-75
export const bingoCards = mysqlTable("bingo_cards", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(), // FK → bingo_rooms.id
  operatorId: int("operatorId").notNull(), // FK → users.id (dono da sala)
  token: varchar("token", { length: 128 }).notNull().unique(), // token criptografado
  qrCodeData: text("qrCodeData"), // URL completa para o jogador
  // grade 5x5 serializada como JSON: [[B1,B2,B3,B4,B5],[I1,...],...] (legado)
  grid: json("grid").notNull(),
  // 15 números únicos da cartela (novo formato)
  cardNumbers: json("cardNumbers"),
  playerName: varchar("playerName", { length: 255 }),
  playerPhone: varchar("playerPhone", { length: 20 }),
  status: mysqlEnum("status", ["active", "winner", "cancelled"]).default("active").notNull(),
  markedNumbers: json("markedNumbers"), // números marcados
  winType: mysqlEnum("winType", ["line", "column", "full_card", "quadra", "quina"]),
  pricePaid: decimal("pricePaid", { precision: 10, scale: 2 }),
  transactionId: varchar("transactionId", { length: 128 }),
  printedAt: timestamp("printedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BingoCard = typeof bingoCards.$inferSelect;
export type InsertBingoCard = typeof bingoCards.$inferInsert;

// ─── Drawn Numbers ────────────────────────────────────────────────────────────
export const drawnNumbers = mysqlTable("drawn_numbers", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(), // FK → bingo_rooms.id
  number: int("number").notNull(), // 1-75
  drawnAt: timestamp("drawnAt").defaultNow().notNull(),
  sequence: int("sequence").notNull(), // ordem do sorteio
});

export type DrawnNumber = typeof drawnNumbers.$inferSelect;
export type InsertDrawnNumber = typeof drawnNumbers.$inferInsert;

// ─── Winners ──────────────────────────────────────────────────────────────────
export const winners = mysqlTable("winners", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  cardId: int("cardId").notNull(),
  operatorId: int("operatorId").notNull(),
  winType: mysqlEnum("winType", ["line", "column", "full_card", "quadra", "quina"]).notNull(),
  prizeAmount: decimal("prizeAmount", { precision: 10, scale: 2 }),
  confirmedAt: timestamp("confirmedAt").defaultNow().notNull(),
});

export type Winner = typeof winners.$inferSelect;
export type InsertWinner = typeof winners.$inferInsert;

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  operatorId: int("operatorId").notNull(),
  roomId: int("roomId"),
  cardId: int("cardId"),
  type: mysqlEnum("type", ["card_sale", "subscription", "refund"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "failed", "refunded"])
    .default("pending")
    .notNull(),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  externalTransactionId: varchar("externalTransactionId", { length: 255 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Subscription Plans ───────────────────────────────────────────────────────
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  slug: mysqlEnum("slug", ["free", "basic", "professional", "premium"]).notNull().unique(),
  monthlyPrice: decimal("monthlyPrice", { precision: 10, scale: 2 }).notNull(),
  maxRooms: int("maxRooms").notNull(), // salas simultâneas
  maxCardsPerRoom: int("maxCardsPerRoom").notNull(),
  features: json("features"), // lista de features como JSON
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
