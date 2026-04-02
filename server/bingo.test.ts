import { describe, expect, it } from "vitest";
import { generateCard, checkWin, getColumnLabel } from "./bingo-engine";

describe("bingo-engine", () => {
  describe("generateCard", () => {
    it("deve gerar uma cartela 5x5 com números válidos", () => {
      const card = generateCard();
      expect(card.grid).toHaveLength(5);
      card.grid.forEach((col) => {
        expect(col).toHaveLength(5);
      });
    });

    it("deve ter o espaço livre (0) no centro (coluna N, linha 3)", () => {
      const card = generateCard();
      // Coluna N é o índice 2, linha do meio é índice 2
      expect(card.grid[2][2]).toBe(0);
    });

    it("deve ter números únicos em cada coluna", () => {
      const card = generateCard();
      card.grid.forEach((col) => {
        const nonZero = col.filter((n) => n !== 0);
        const unique = new Set(nonZero);
        expect(unique.size).toBe(nonZero.length);
      });
    });

    it("deve ter números dentro do range correto por coluna", () => {
      const card = generateCard();
      const ranges = [
        [1, 15],   // B
        [16, 30],  // I
        [31, 45],  // N
        [46, 60],  // G
        [61, 75],  // O
      ];
      card.grid.forEach((col, ci) => {
        const [min, max] = ranges[ci];
        col.forEach((num) => {
          if (num !== 0) {
            expect(num).toBeGreaterThanOrEqual(min);
            expect(num).toBeLessThanOrEqual(max);
          }
        });
      });
    });

    it("deve gerar cartelas diferentes a cada chamada", () => {
      const card1 = generateCard();
      const card2 = generateCard();
      // É extremamente improvável que duas cartelas sejam idênticas
      const flat1 = card1.grid.flat().join(",");
      const flat2 = card2.grid.flat().join(",");
      expect(flat1).not.toBe(flat2);
    });
  });

  describe("checkWin", () => {
    it("deve detectar linha completa", () => {
      const card = generateCard();
      // Pegar todos os números da primeira linha (exceto FREE)
      const firstRowNumbers = card.grid.map((col) => col[0]).filter((n) => n !== 0);
      const result = checkWin(card.grid, firstRowNumbers, "line");
      expect(result).toBe("line");
    });

    it("deve detectar coluna completa", () => {
      const card = generateCard();
      const firstColNumbers = card.grid[0].filter((n) => n !== 0);
      const result = checkWin(card.grid, firstColNumbers, "column");
      expect(result).toBe("column");
    });

    it("deve detectar cartela cheia", () => {
      const card = generateCard();
      const allNumbers = card.grid.flat().filter((n) => n !== 0);
      const result = checkWin(card.grid, allNumbers, "full_card");
      expect(result).toBe("full_card");
    });

    it("não deve detectar vitória com números insuficientes", () => {
      const card = generateCard();
      const result = checkWin(card.grid, [1, 2, 3], "full_card");
      expect(result).toBeNull();
    });

    it("deve verificar 'any' como qualquer condição", () => {
      const card = generateCard();
      const firstRowNumbers = card.grid.map((col) => col[0]).filter((n) => n !== 0);
      const result = checkWin(card.grid, firstRowNumbers, "any");
      expect(result).not.toBeNull();
    });
  });

  describe("getColumnLabel", () => {
    it("deve retornar B para números 1-15", () => {
      expect(getColumnLabel(1)).toBe("B");
      expect(getColumnLabel(15)).toBe("B");
    });
    it("deve retornar I para números 16-30", () => {
      expect(getColumnLabel(16)).toBe("I");
      expect(getColumnLabel(30)).toBe("I");
    });
    it("deve retornar N para números 31-45", () => {
      expect(getColumnLabel(31)).toBe("N");
      expect(getColumnLabel(45)).toBe("N");
    });
    it("deve retornar G para números 46-60", () => {
      expect(getColumnLabel(46)).toBe("G");
      expect(getColumnLabel(60)).toBe("G");
    });
    it("deve retornar O para números 61-75", () => {
      expect(getColumnLabel(61)).toBe("O");
      expect(getColumnLabel(75)).toBe("O");
    });
  });
});

describe("auth.logout", () => {
  it("deve ser testado via auth.logout.test.ts existente", () => {
    expect(true).toBe(true);
  });
});
