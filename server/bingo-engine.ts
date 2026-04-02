import crypto from "crypto";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type BingoGrid = number[][]; // 5 colunas × 5 linhas, 0 = FREE

export interface CardGenerationResult {
  grid: BingoGrid;
  token: string;
}

// ─── Constantes BINGO ─────────────────────────────────────────────────────────
// B: 1-15 | I: 16-30 | N: 31-45 | G: 46-60 | O: 61-75
const COLUMN_RANGES: [number, number][] = [
  [1, 15],   // B
  [16, 30],  // I
  [31, 45],  // N
  [46, 60],  // G
  [61, 75],  // O
];

const COL_LABELS = ["B", "I", "N", "G", "O"];

// ─── Geração de cartela ───────────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Gera uma grade 5x5 única de bingo.
 * grid[col][row] — col 0=B, 1=I, 2=N, 3=G, 4=O
 * A posição central (N[2] = grid[2][2]) é FREE = 0
 */
export function generateBingoGrid(): BingoGrid {
  const grid: BingoGrid = [];
  for (let col = 0; col < 5; col++) {
    const [min, max] = COLUMN_RANGES[col];
    const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const shuffled = shuffleArray(pool);
    grid.push(shuffled.slice(0, 5));
  }
  // Centro livre
  grid[2][2] = 0;
  return grid;
}

/**
 * Gera token criptografado único para a cartela.
 */
export function generateCardToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Gera cartela completa com token.
 */
export function generateCard(): CardGenerationResult {
  return {
    grid: generateBingoGrid(),
    token: generateCardToken(),
  };
}

// ─── Verificação de vitória ───────────────────────────────────────────────────

/**
 * Verifica se um número está marcado na cartela.
 * O número 0 (FREE) é sempre considerado marcado.
 */
function isMarked(num: number, drawnNumbers: Set<number>): boolean {
  return num === 0 || drawnNumbers.has(num);
}

/**
 * Verifica vitória por linha (qualquer linha completa).
 */
export function checkLine(grid: BingoGrid, drawnNumbers: Set<number>): boolean {
  for (let row = 0; row < 5; row++) {
    if (grid.every((col) => isMarked(col[row], drawnNumbers))) {
      return true;
    }
  }
  return false;
}

/**
 * Verifica vitória por coluna (qualquer coluna completa).
 */
export function checkColumn(grid: BingoGrid, drawnNumbers: Set<number>): boolean {
  return grid.some((col) => col.every((num) => isMarked(num, drawnNumbers)));
}

/**
 * Verifica vitória por cartela cheia.
 */
export function checkFullCard(grid: BingoGrid, drawnNumbers: Set<number>): boolean {
  return grid.every((col) => col.every((num) => isMarked(num, drawnNumbers)));
}

/**
 * Verifica todos os tipos de vitória.
 * Retorna o tipo de vitória ou null se não houver.
 */
export function checkWin(
  grid: BingoGrid,
  drawnNumbers: number[],
  condition: "line" | "column" | "full_card" | "any"
): "line" | "column" | "full_card" | null {
  const drawn = new Set(drawnNumbers);

  if (condition === "full_card" || condition === "any") {
    if (checkFullCard(grid, drawn)) return "full_card";
  }
  if (condition === "line" || condition === "any") {
    if (checkLine(grid, drawn)) return "line";
  }
  if (condition === "column" || condition === "any") {
    if (checkColumn(grid, drawn)) return "column";
  }
  return null;
}

/**
 * Calcula os números marcados em uma cartela com base nos números sorteados.
 */
export function getMarkedNumbers(grid: BingoGrid, drawnNumbers: number[]): number[] {
  const drawn = new Set(drawnNumbers);
  const marked: number[] = [];
  for (const col of grid) {
    for (const num of col) {
      if (num !== 0 && drawn.has(num)) {
        marked.push(num);
      }
    }
  }
  return marked;
}

/**
 * Sorteia um número aleatório não sorteado ainda.
 * Retorna null se todos os números já foram sorteados.
 */
export function drawNextNumber(alreadyDrawn: number[]): number | null {
  const all = Array.from({ length: 75 }, (_, i) => i + 1);
  const remaining = all.filter((n) => !alreadyDrawn.includes(n));
  if (remaining.length === 0) return null;
  const idx = Math.floor(Math.random() * remaining.length);
  return remaining[idx];
}

/**
 * Retorna o label da coluna para um número (B, I, N, G, O).
 */
export function getColumnLabel(num: number): string {
  if (num >= 1 && num <= 15) return "B";
  if (num >= 16 && num <= 30) return "I";
  if (num >= 31 && num <= 45) return "N";
  if (num >= 46 && num <= 60) return "G";
  if (num >= 61 && num <= 75) return "O";
  return "";
}

export { COL_LABELS, COLUMN_RANGES };
