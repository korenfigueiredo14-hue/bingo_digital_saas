import crypto from "crypto";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Cartela com 15 números únicos de 1 a 75.
 * Armazenada como array simples ordenado.
 */
export type BingoCard15 = number[]; // 15 números únicos, 1-75

/**
 * Mantido para compatibilidade com código legado (tela de transmissão).
 * Novo formato usa BingoCard15.
 */
export type BingoGrid = number[][];

export interface CardGenerationResult {
  numbers: BingoCard15; // 15 números únicos
  grid: BingoGrid;      // grade legada (gerada a partir dos 15 números para compatibilidade)
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

// ─── Utilitários ──────────────────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Geração de cartela com 15 números ───────────────────────────────────────

/**
 * Gera 15 números únicos aleatórios de 1 a 75.
 * Os números são retornados ordenados de forma crescente.
 */
export function generate15Numbers(): BingoCard15 {
  const all = Array.from({ length: 75 }, (_, i) => i + 1);
  const shuffled = shuffleArray(all);
  return shuffled.slice(0, 15).sort((a, b) => a - b);
}

/**
 * Converte 15 números em uma grade 5x5 legada para compatibilidade
 * com componentes que ainda usam BingoGrid.
 * Distribui os números pelas colunas B-I-N-G-O de acordo com o range.
 * Posições vazias são preenchidas com 0.
 */
export function numbersToGrid(numbers: BingoCard15): BingoGrid {
  const grid: BingoGrid = [[], [], [], [], []];
  for (let col = 0; col < 5; col++) {
    const [min, max] = COLUMN_RANGES[col];
    const colNums = numbers.filter(n => n >= min && n <= max);
    // Preencher até 5 posições (com 0 para posições vazias)
    for (let i = 0; i < 5; i++) {
      grid[col].push(colNums[i] ?? 0);
    }
  }
  return grid;
}

/**
 * Gera token criptografado único para a cartela.
 */
export function generateCardToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Gera cartela completa com 15 números únicos e token.
 */
export function generateCard(): CardGenerationResult {
  const numbers = generate15Numbers();
  return {
    numbers,
    grid: numbersToGrid(numbers),
    token: generateCardToken(),
  };
}

// ─── Sorteio de números premiados ─────────────────────────────────────────────

/**
 * Sorteia aleatoriamente os números que serão os prêmios do bingo.
 * - prizeNumbers: os 15 números sorteados que definem os prêmios
 *   (Quadra = acertar 4, Quina = acertar 5, Cartela Cheia = acertar todos os 15 da cartela)
 *
 * Na verdade, o prêmio é baseado em quantos números da CARTELA DO JOGADOR
 * coincidem com os números SORTEADOS no bingo (drawn numbers).
 * Não há um conjunto fixo de "números premiados" — o prêmio é dado
 * quando o jogador acerta 4, 5 ou 15 números sorteados na sua cartela.
 *
 * Esta função sorteia os NÚMEROS ESPECIAIS da sala que serão revelados
 * na tela de transmissão como "números da sorte" decorativos.
 */
export function drawPrizeNumbers(count: number = 15): number[] {
  const all = Array.from({ length: 75 }, (_, i) => i + 1);
  return shuffleArray(all).slice(0, count).sort((a, b) => a - b);
}

// ─── Verificação de vitória (baseada em contagem de acertos) ──────────────────

/**
 * Conta quantos números da cartela do jogador foram sorteados.
 */
export function countMatches(cardNumbers: number[], drawnNumbers: number[]): number {
  const drawn = new Set(drawnNumbers);
  return cardNumbers.filter(n => drawn.has(n)).length;
}

/**
 * Verifica vitória baseada em quantos números da cartela foram sorteados.
 * - quadra: 4 ou mais acertos
 * - quina: 5 ou mais acertos
 * - full_card: todos os 15 acertos
 *
 * Prioridade: full_card > quina > quadra
 */
export function checkWinByCount(
  cardNumbers: number[],
  drawnNumbers: number[]
): "full_card" | "quina" | "quadra" | null {
  const matches = countMatches(cardNumbers, drawnNumbers);
  const total = cardNumbers.length;
  if (matches >= total) return "full_card";
  if (matches >= 5) return "quina";
  if (matches >= 4) return "quadra";
  return null;
}

// ─── Compatibilidade com código legado (BingoGrid) ────────────────────────────

/**
 * Extrai os números de uma BingoGrid legada (ignora zeros).
 */
export function gridToNumbers(grid: BingoGrid): number[] {
  return grid.flat().filter(n => n !== 0);
}

/**
 * Verifica vitória usando BingoGrid legada (para compatibilidade).
 * Internamente converte para array de números e usa checkWinByCount.
 */
export function checkWin(
  grid: BingoGrid,
  drawnNumbers: number[],
  _condition?: string
): "full_card" | "quina" | "quadra" | "line" | "column" | null {
  const cardNumbers = gridToNumbers(grid);
  return checkWinByCount(cardNumbers, drawnNumbers);
}

// ─── Funções legadas mantidas para compatibilidade ────────────────────────────

function isMarked(num: number, drawnNumbers: Set<number>): boolean {
  return num === 0 || drawnNumbers.has(num);
}

export function checkLine(grid: BingoGrid, drawnNumbers: Set<number>): boolean {
  for (let row = 0; row < 5; row++) {
    if (grid.every((col) => isMarked(col[row], drawnNumbers))) return true;
  }
  return false;
}

export function checkColumn(grid: BingoGrid, drawnNumbers: Set<number>): boolean {
  return grid.some((col) => col.every((num) => isMarked(num, drawnNumbers)));
}

export function checkFullCard(grid: BingoGrid, drawnNumbers: Set<number>): boolean {
  return grid.every((col) => col.every((num) => isMarked(num, drawnNumbers)));
}

export function checkQuadra(grid: BingoGrid, drawnNumbers: Set<number>): boolean {
  const nums = gridToNumbers(grid);
  return countMatches(nums, Array.from(drawnNumbers)) >= 4;
}

export function checkQuina(grid: BingoGrid, drawnNumbers: Set<number>): boolean {
  const nums = gridToNumbers(grid);
  return countMatches(nums, Array.from(drawnNumbers)) >= 5;
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
// Máximo de bolas por rodada (média de 60 bolas por rodada)
export const MAX_BALLS_PER_ROUND = 60;

export function drawNextNumber(alreadyDrawn: number[]): number | null {
  // Sorteio de 1 a 75 (consistente com as cartelas B-I-N-G-O)
  if (alreadyDrawn.length >= MAX_BALLS_PER_ROUND) return null;
  const all = Array.from({ length: 75 }, (_, i) => i + 1);
  const remaining = all.filter((n) => !alreadyDrawn.includes(n));
  if (remaining.length === 0) return null;
  const idx = Math.floor(Math.random() * remaining.length);
  return remaining[idx];
}

/**
 * Retorna o label da coluna para um número (B, I, N, G, O) no range 1-90.
 * B: 1-18 | I: 19-36 | N: 37-54 | G: 55-72 | O: 73-90
 */
export function getColumnLabel(num: number): string {
  if (num >= 1 && num <= 18) return "B";
  if (num >= 19 && num <= 36) return "I";
  if (num >= 37 && num <= 54) return "N";
  if (num >= 55 && num <= 72) return "G";
  if (num >= 73 && num <= 90) return "O";
  return "";
}

export { COL_LABELS, COLUMN_RANGES };
