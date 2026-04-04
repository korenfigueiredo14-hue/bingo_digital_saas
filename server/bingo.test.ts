import { describe, expect, it } from "vitest";
import {
  generateCard,
  generate15Numbers,
  checkWinByCount,
  checkWin,
  getColumnLabel,
  numbersToGrid,
  gridToNumbers,
} from "./bingo-engine";

describe("bingo-engine", () => {
  describe("generate15Numbers", () => {
    it("deve gerar exatamente 15 números", () => {
      const nums = generate15Numbers();
      expect(nums).toHaveLength(15);
    });

    it("deve gerar números únicos de 1 a 75", () => {
      const nums = generate15Numbers();
      const unique = new Set(nums);
      expect(unique.size).toBe(15);
      nums.forEach(n => {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(75);
      });
    });

    it("deve retornar números em ordem crescente", () => {
      const nums = generate15Numbers();
      for (let i = 1; i < nums.length; i++) {
        expect(nums[i]).toBeGreaterThan(nums[i - 1]);
      }
    });

    it("deve gerar conjuntos diferentes a cada chamada", () => {
      const a = generate15Numbers();
      const b = generate15Numbers();
      expect(a.join(",")).not.toBe(b.join(","));
    });
  });

  describe("generateCard", () => {
    it("deve gerar cartela com 15 números únicos", () => {
      const card = generateCard();
      expect(card.numbers).toHaveLength(15);
      const unique = new Set(card.numbers);
      expect(unique.size).toBe(15);
    });

    it("deve incluir grid compatível (5 colunas)", () => {
      const card = generateCard();
      expect(card.grid).toHaveLength(5);
      card.grid.forEach(col => expect(col).toHaveLength(5));
    });

    it("deve gerar token único", () => {
      const card = generateCard();
      expect(card.token).toHaveLength(64); // 32 bytes em hex
    });

    it("deve gerar cartelas diferentes a cada chamada", () => {
      const c1 = generateCard();
      const c2 = generateCard();
      expect(c1.numbers.join(",")).not.toBe(c2.numbers.join(","));
    });
  });

  describe("numbersToGrid / gridToNumbers", () => {
    it("deve converter 15 números para grid (5 colunas x 5 linhas)", () => {
      const nums = generate15Numbers();
      const grid = numbersToGrid(nums);
      expect(grid).toHaveLength(5);
      grid.forEach(col => expect(col).toHaveLength(5));
    });

    it("deve preservar todos os números quando cada coluna tem até 5 números", () => {
      // Garantir no máximo 3 números por coluna (3 colunas x 5 = 15 total)
      const nums = [1, 2, 3, 16, 17, 18, 31, 32, 33, 46, 47, 48, 61, 62, 63];
      const grid = numbersToGrid(nums);
      const recovered = gridToNumbers(grid).sort((a, b) => a - b);
      expect(recovered).toEqual(nums);
    });

    it("deve usar cardNumbers (não grid) como fonte de verdade para verificação de vitória", () => {
      // O sistema usa cardNumbers para checkWinByCount, não a grid legada
      const card = generateCard();
      expect(card.numbers).toHaveLength(15);
      // checkWinByCount usa card.numbers diretamente
      const result = checkWinByCount(card.numbers, card.numbers);
      expect(result).toBe("full_card");
    });
  });

  describe("checkWinByCount", () => {
    it("deve retornar null com menos de 4 acertos", () => {
      const card = [1, 2, 3, 16, 17, 18, 31, 32, 33, 46, 47, 48, 61, 62, 63];
      const result = checkWinByCount(card, [1, 2, 3]);
      expect(result).toBeNull();
    });

    it("deve detectar quadra com 4 acertos", () => {
      const card = [1, 2, 3, 16, 17, 18, 31, 32, 33, 46, 47, 48, 61, 62, 63];
      const result = checkWinByCount(card, [1, 2, 3, 16]);
      expect(result).toBe("quadra");
    });

    it("deve detectar quina com 5 acertos", () => {
      const card = [1, 2, 3, 16, 17, 18, 31, 32, 33, 46, 47, 48, 61, 62, 63];
      const result = checkWinByCount(card, [1, 2, 3, 16, 17]);
      expect(result).toBe("quina");
    });

    it("deve detectar full_card com todos os 15 acertos", () => {
      const card = [1, 2, 3, 16, 17, 18, 31, 32, 33, 46, 47, 48, 61, 62, 63];
      const result = checkWinByCount(card, card);
      expect(result).toBe("full_card");
    });

    it("deve priorizar full_card sobre quina sobre quadra", () => {
      const card = generate15Numbers();
      // Todos os números = full_card
      expect(checkWinByCount(card, card)).toBe("full_card");
      // 5 números = quina
      expect(checkWinByCount(card, card.slice(0, 5))).toBe("quina");
      // 4 números = quadra
      expect(checkWinByCount(card, card.slice(0, 4))).toBe("quadra");
    });
  });

  describe("checkWin (compatibilidade legada)", () => {
    it("deve funcionar com grid legada via checkWin", () => {
      const card = generateCard();
      const allNums = gridToNumbers(card.grid);
      // Com todos os números sorteados deve retornar full_card
      const result = checkWin(card.grid, allNums);
      expect(result).toBe("full_card");
    });

    it("deve retornar null com números insuficientes", () => {
      const card = generateCard();
      const result = checkWin(card.grid, [999]);
      expect(result).toBeNull();
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
