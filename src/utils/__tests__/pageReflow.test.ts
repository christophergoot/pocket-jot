import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { reflowContent } from "../pageReflow";

// happy-dom's scrollHeight is always 0, which means content never "overflows"
// in the normal sense. We mock the getter to simulate page fills.
function setScrollHeight(value: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => value,
  });
}

// Reset to 0 (never overflows) between tests
beforeEach(() => setScrollHeight(0));
afterEach(() => setScrollHeight(0));

// ─── Structure ───────────────────────────────────────────────────────────────

describe("reflowContent — output structure", () => {
  it("always returns exactly 8 pages", () => {
    const result = reflowContent("hello");
    expect(result).toHaveLength(8);
  });

  it("page numbers are sequential 1–8", () => {
    const result = reflowContent("hello");
    result.forEach((page, i) => {
      expect(page.pageNumber).toBe(i + 1);
    });
  });

  it("empty string → 8 empty pages", () => {
    const result = reflowContent("");
    result.forEach((page) => expect(page.content).toBe(""));
  });
});

// ─── Page breaks ─────────────────────────────────────────────────────────────

describe("reflowContent — explicit page breaks", () => {
  it("--- splits content onto separate pages", () => {
    const result = reflowContent("page one\n---\npage two");
    expect(result[0].content).toBe("page one");
    expect(result[1].content).toBe("page two");
  });

  it("*** is also a page break", () => {
    const result = reflowContent("page one\n***\npage two");
    expect(result[0].content).toBe("page one");
    expect(result[1].content).toBe("page two");
  });

  it("___ is also a page break", () => {
    const result = reflowContent("page one\n___\npage two");
    expect(result[0].content).toBe("page one");
    expect(result[1].content).toBe("page two");
  });

  it("empty pages between breaks are preserved as empty strings", () => {
    const result = reflowContent("page one\n---\n---\npage three");
    expect(result[0].content).toBe("page one");
    expect(result[1].content).toBe("");
    expect(result[2].content).toBe("page three");
  });

  it("trailing pages after breaks are empty", () => {
    const result = reflowContent("only page one\n---\npage two");
    // Pages 3–8 should be empty
    for (let i = 2; i < 8; i++) {
      expect(result[i].content).toBe("");
    }
  });
});

// ─── Overflow / reflow ───────────────────────────────────────────────────────

describe("reflowContent — overflow reflow", () => {
  it("content that fits (scrollHeight=0) stays on page 1", () => {
    setScrollHeight(0); // never overflows
    const result = reflowContent("line one\nline two\nline three");
    expect(result[0].content).toContain("line one");
    expect(result[0].content).toContain("line two");
    expect(result[0].content).toContain("line three");
    expect(result[1].content).toBe("");
  });

  it("overflow (scrollHeight > 260) pushes line to next page", () => {
    // First call returns 0 (fits), second returns 300 (overflows)
    let callCount = 0;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        callCount++;
        // Overflow on the second measurement (second line would overflow)
        return callCount > 1 ? 300 : 0;
      },
    });

    const result = reflowContent("line one\nline two");
    expect(result[0].content).toBe("line one");
    expect(result[1].content).toBe("line two");
  });

  it("content beyond page 8 is dropped", () => {
    // Always overflow immediately so each line goes to its own page
    let calls = 0;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        calls++;
        return calls % 2 === 0 ? 300 : 0;
      },
    });

    // 10 lines — only first 8 should be kept
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join(
      "\n",
    );
    const result = reflowContent(lines);
    expect(result).toHaveLength(8);
  });
});

// ─── Nested list context ─────────────────────────────────────────────────────

describe("reflowContent — nested list context on page break", () => {
  it("indented list item carries parent context to new page", () => {
    // Overflow exactly when the nested item is added
    let calls = 0;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        calls++;
        // The nested item (2nd measurement) causes overflow
        return calls >= 2 ? 300 : 0;
      },
    });

    const content = "- parent item\n  - nested item";
    const result = reflowContent(content);

    // The nested item should appear on page 2 with the parent for context
    expect(result[1].content).toContain("- parent item");
    expect(result[1].content).toContain("  - nested item");
  });
});

// ─── Continuation markers ────────────────────────────────────────────────────

describe("reflowContent — continuation markers", () => {
  it("single list root spanning 2 pages gets (1/2) and (2/2) markers", () => {
    // Force the same root list item to appear on pages 1 and 2 by using explicit breaks
    const content = "- my item\n  - child a\n---\n- my item\n  - child b";
    const result = reflowContent(content);

    expect(result[0].content).toContain("(1/2)");
    expect(result[1].content).toContain("(2/2)");
  });

  it("non-consecutive pages with same root do NOT get markers", () => {
    // Pages 1 and 3 have same root text, but page 2 is different — not consecutive
    const content = "- my item\n---\n- other item\n---\n- my item";
    const result = reflowContent(content);

    expect(result[0].content).not.toContain("(1/");
    expect(result[2].content).not.toContain("(1/");
  });

  it("pages with no list items are not modified", () => {
    const content = "just text\n---\nmore text";
    const result = reflowContent(content);
    expect(result[0].content).toBe("just text");
    expect(result[1].content).toBe("more text");
  });
});
