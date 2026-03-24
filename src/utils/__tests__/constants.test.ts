import { describe, it, expect } from "vitest";
import {
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  PAGE_WIDTH_MM,
  PAGE_HEIGHT_MM,
  POCKET_MOD_POSITIONS,
  TOTAL_PAGES,
  PAGE_SEPARATORS,
  DEFAULT_CONTENT,
} from "../../lib/constants";

describe("constants — A4 dimensions", () => {
  it("A4_WIDTH_MM is 297", () => expect(A4_WIDTH_MM).toBe(297));
  it("A4_HEIGHT_MM is 210", () => expect(A4_HEIGHT_MM).toBe(210));

  it("PAGE_WIDTH_MM is A4_WIDTH_MM / 4", () => {
    expect(PAGE_WIDTH_MM).toBeCloseTo(A4_WIDTH_MM / 4, 5);
  });

  it("PAGE_HEIGHT_MM is A4_HEIGHT_MM / 2", () => {
    expect(PAGE_HEIGHT_MM).toBeCloseTo(A4_HEIGHT_MM / 2, 5);
  });
});

describe("constants — TOTAL_PAGES", () => {
  it("TOTAL_PAGES is 8", () => expect(TOTAL_PAGES).toBe(8));
});

describe("constants — POCKET_MOD_POSITIONS", () => {
  it("has exactly 8 entries", () => {
    expect(POCKET_MOD_POSITIONS).toHaveLength(8);
  });

  it("contains every page number 1–8 exactly once", () => {
    const pages = POCKET_MOD_POSITIONS.map((p) => p.page).sort((a, b) => a - b);
    expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("all row values are 0 or 1", () => {
    POCKET_MOD_POSITIONS.forEach((p) => {
      expect(p.row).toBeGreaterThanOrEqual(0);
      expect(p.row).toBeLessThanOrEqual(1);
    });
  });

  it("all col values are 0–3", () => {
    POCKET_MOD_POSITIONS.forEach((p) => {
      expect(p.col).toBeGreaterThanOrEqual(0);
      expect(p.col).toBeLessThanOrEqual(3);
    });
  });

  it("no two positions share the same row+col", () => {
    const coords = POCKET_MOD_POSITIONS.map((p) => `${p.row},${p.col}`);
    const unique = new Set(coords);
    expect(unique.size).toBe(8);
  });

  it("top row (row=0) pages are all rotated", () => {
    const topRow = POCKET_MOD_POSITIONS.filter((p) => p.row === 0);
    topRow.forEach((p) => expect(p.rotated).toBe(true));
  });

  it("bottom row (row=1) pages are all NOT rotated", () => {
    const bottomRow = POCKET_MOD_POSITIONS.filter((p) => p.row === 1);
    bottomRow.forEach((p) => expect(p.rotated).toBe(false));
  });

  it("page 1 is in the top-left position (row=0, col=0)", () => {
    const page1 = POCKET_MOD_POSITIONS.find((p) => p.page === 1);
    expect(page1).toEqual({ row: 0, col: 0, page: 1, rotated: true });
  });
});

describe("constants — PAGE_SEPARATORS", () => {
  it("contains at least one separator", () => {
    expect(PAGE_SEPARATORS.length).toBeGreaterThan(0);
  });

  it("all separators are non-empty strings", () => {
    PAGE_SEPARATORS.forEach((s) => expect(s.length).toBeGreaterThan(0));
  });

  it("separators are distinct", () => {
    expect(new Set(PAGE_SEPARATORS).size).toBe(PAGE_SEPARATORS.length);
  });
});

describe("constants — DEFAULT_CONTENT", () => {
  it("is a non-empty string", () => {
    expect(typeof DEFAULT_CONTENT).toBe("string");
    expect(DEFAULT_CONTENT.length).toBeGreaterThan(0);
  });

  it("contains exactly 7 page break markers (---) for 8 pages", () => {
    const breaks = DEFAULT_CONTENT.match(/^---$/gm);
    expect(breaks).toHaveLength(7);
  });
});
