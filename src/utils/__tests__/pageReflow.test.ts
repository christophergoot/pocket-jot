import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { reflowContent, reflowPages } from "../../lib/pageReflow";
import type { PageContent } from "../../lib";

// happy-dom's scrollHeight is always 0 (no layout engine).
// We mock the getter to simulate overflow at controlled thresholds.
function setScrollHeight(value: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => value,
  });
}

function callCountScrollHeight(overflowAfter: number) {
  let calls = 0;
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      calls++;
      return calls > overflowAfter ? 300 : 0;
    },
  });
}

beforeEach(() => setScrollHeight(0));
afterEach(() => setScrollHeight(0));

// ─── reflowContent: structure ─────────────────────────────────────────────────

describe("reflowContent — output structure", () => {
  it("always returns exactly 8 pages", () => {
    expect(reflowContent("hello")).toHaveLength(8);
  });

  it("page numbers are sequential 1–8", () => {
    reflowContent("hello").forEach((page, i) => {
      expect(page.pageNumber).toBe(i + 1);
    });
  });

  it("empty string → 8 empty pages", () => {
    reflowContent("").forEach((page) => expect(page.content).toBe(""));
  });

  it("whitespace-only string → 8 empty pages", () => {
    reflowContent("   \n\n   ").forEach((page) =>
      expect(page.content).toBe(""),
    );
  });

  it("single word stays on page 1", () => {
    const result = reflowContent("hello");
    expect(result[0].content).toBe("hello");
    expect(result[1].content).toBe("");
  });

  it("DEFAULT_CONTENT produces 8 populated pages", () => {
    const content = [
      "# Cover",
      "---",
      "## Page 2",
      "---",
      "## Page 3",
      "---",
      "## Page 4",
      "---",
      "## Page 5",
      "---",
      "## Page 6",
      "---",
      "## Page 7",
      "---",
      "## Page 8",
    ].join("\n");
    const result = reflowContent(content);
    expect(result).toHaveLength(8);
    result.forEach((page) => expect(page.content.length).toBeGreaterThan(0));
  });
});

// ─── reflowContent: page breaks ──────────────────────────────────────────────

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

  it("page break with surrounding whitespace is still a page break", () => {
    const result = reflowContent("page one\n  ---  \npage two");
    expect(result[0].content).toBe("page one");
    expect(result[1].content).toBe("page two");
  });

  it("<!-- page --> is NOT a page break (not in isPageBreak)", () => {
    const result = reflowContent("page one\n<!-- page -->\npage two");
    // Both lines land on page 1 since <!-- page --> is not a break marker
    expect(result[0].content).toContain("page one");
    expect(result[0].content).toContain("<!-- page -->");
  });

  it("empty pages between breaks are preserved as empty strings", () => {
    const result = reflowContent("page one\n---\n---\npage three");
    expect(result[0].content).toBe("page one");
    expect(result[1].content).toBe("");
    expect(result[2].content).toBe("page three");
  });

  it("trailing pages after breaks are empty", () => {
    const result = reflowContent("only page one\n---\npage two");
    for (let i = 2; i < 8; i++) {
      expect(result[i].content).toBe("");
    }
  });

  it("leading empty lines before content are stripped", () => {
    const result = reflowContent("\n\n\nhello");
    expect(result[0].content).toBe("hello");
  });

  it("empty lines at the start of each page are stripped", () => {
    const result = reflowContent("page one\n---\n\n\npage two");
    expect(result[1].content).toBe("page two");
  });
});

// ─── reflowContent: overflow ─────────────────────────────────────────────────

describe("reflowContent — overflow / reflow", () => {
  it("content that fits stays on page 1", () => {
    setScrollHeight(0);
    const result = reflowContent("line one\nline two\nline three");
    expect(result[0].content).toContain("line one");
    expect(result[0].content).toContain("line two");
    expect(result[0].content).toContain("line three");
    expect(result[1].content).toBe("");
  });

  it("overflow pushes line to next page", () => {
    callCountScrollHeight(1); // second measurement overflows
    const result = reflowContent("line one\nline two");
    expect(result[0].content).toBe("line one");
    expect(result[1].content).toBe("line two");
  });

  it("content beyond page 8 is dropped", () => {
    // Alternate between 0 and 300 so each line causes overflow
    let calls = 0;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return ++calls % 2 === 0 ? 300 : 0;
      },
    });
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join(
      "\n",
    );
    const result = reflowContent(lines);
    expect(result).toHaveLength(8);
  });

  it("always returns exactly 8 pages even with overflow", () => {
    callCountScrollHeight(1);
    expect(reflowContent("a\nb\nc\nd")).toHaveLength(8);
  });
});

// ─── reflowContent: list markers ─────────────────────────────────────────────

describe("reflowContent — list marker types", () => {
  it("- (dash) list items are recognised as list items", () => {
    const result = reflowContent("- item a\n- item b");
    expect(result[0].content).toContain("- item a");
    expect(result[0].content).toContain("- item b");
  });

  it("* (asterisk) list items are recognised as list items", () => {
    const result = reflowContent("* item a\n* item b");
    expect(result[0].content).toContain("* item a");
  });

  it("+ (plus) list items are recognised as list items", () => {
    const result = reflowContent("+ item a\n+ item b");
    expect(result[0].content).toContain("+ item a");
  });

  it("numbered list items (1.) are recognised", () => {
    const result = reflowContent("1. first\n2. second\n3. third");
    expect(result[0].content).toContain("1. first");
    expect(result[0].content).toContain("2. second");
  });
});

// ─── reflowContent: nested list context ──────────────────────────────────────

describe("reflowContent — nested list context on page break", () => {
  it("indented list item carries parent context to new page", () => {
    callCountScrollHeight(1); // overflow on second measurement
    const result = reflowContent("- parent item\n  - nested item");
    expect(result[1].content).toContain("- parent item");
    expect(result[1].content).toContain("  - nested item");
  });

  it("root-level list item starting new page has no extra context", () => {
    callCountScrollHeight(1);
    const result = reflowContent("- root a\n- root b");
    // root b starts a new page and needs no parent context
    expect(result[1].content).toBe("- root b");
  });

  it("non-list item overflowing needs no list context", () => {
    callCountScrollHeight(1);
    const result = reflowContent("paragraph one\nparagraph two");
    expect(result[1].content).toBe("paragraph two");
  });

  it("deeply nested item carries grandparent context", () => {
    callCountScrollHeight(2); // overflow on third measurement
    const content = "- grandparent\n  - parent\n    - child";
    const result = reflowContent(content);
    // child overflows; page 2 should have grandparent + parent for context
    expect(result[1].content).toContain("- grandparent");
    expect(result[1].content).toContain("  - parent");
    expect(result[1].content).toContain("    - child");
  });
});

// ─── reflowContent: continuation markers ─────────────────────────────────────

describe("reflowContent — continuation markers", () => {
  it("list root spanning 2 consecutive pages gets (1/2) and (2/2)", () => {
    const content = "- my item\n  - child a\n---\n- my item\n  - child b";
    const result = reflowContent(content);
    expect(result[0].content).toContain("(1/2)");
    expect(result[1].content).toContain("(2/2)");
  });

  it("list root spanning 3 consecutive pages gets (1/3), (2/3), (3/3)", () => {
    const content = [
      "- long list\n  - item 1",
      "- long list\n  - item 2",
      "- long list\n  - item 3",
    ].join("\n---\n");
    const result = reflowContent(content);
    expect(result[0].content).toContain("(1/3)");
    expect(result[1].content).toContain("(2/3)");
    expect(result[2].content).toContain("(3/3)");
  });

  it("non-consecutive pages with same root text do NOT get markers", () => {
    const content = "- my item\n---\n- other item\n---\n- my item";
    const result = reflowContent(content);
    expect(result[0].content).not.toContain("(1/");
    expect(result[2].content).not.toContain("(1/");
  });

  it("pages with no list items are not modified by markers", () => {
    const content = "just text\n---\nmore text";
    const result = reflowContent(content);
    expect(result[0].content).toBe("just text");
    expect(result[1].content).toBe("more text");
  });

  it("single page list root (no span) does not get markers", () => {
    const content = "- solo item\n  - child";
    const result = reflowContent(content);
    expect(result[0].content).not.toContain("(1/");
  });
});

// ─── reflowContent: mixed content ────────────────────────────────────────────

describe("reflowContent — mixed content types", () => {
  it("headers stay on the page they fit on", () => {
    const result = reflowContent("# Title\n\nSome paragraph text.");
    expect(result[0].content).toContain("# Title");
    expect(result[0].content).toContain("Some paragraph text.");
  });

  it("mix of headers and lists stays together when fitting", () => {
    const result = reflowContent("## Section\n\n- item 1\n- item 2");
    expect(result[0].content).toContain("## Section");
    expect(result[0].content).toContain("- item 1");
  });

  it("multiple markdown block types each land on correct pages", () => {
    const content = "# H1\n---\n## H2\n---\n> blockquote";
    const result = reflowContent(content);
    expect(result[0].content).toContain("# H1");
    expect(result[1].content).toContain("## H2");
    expect(result[2].content).toContain("> blockquote");
  });
});

// ─── reflowPages ─────────────────────────────────────────────────────────────

describe("reflowPages", () => {
  it("empty array → 8 empty pages", () => {
    const result = reflowPages([]);
    expect(result).toHaveLength(8);
    result.forEach((p) => expect(p.content).toBe(""));
  });

  it("single page with content → content on page 1, rest empty", () => {
    const pages: PageContent[] = [{ pageNumber: 1, content: "hello" }];
    const result = reflowPages(pages);
    expect(result[0].content).toContain("hello");
    expect(result[1].content).toBe("");
  });

  it("two pages with content → content on pages 1 and 2", () => {
    const pages: PageContent[] = [
      { pageNumber: 1, content: "page one" },
      { pageNumber: 2, content: "page two" },
    ];
    const result = reflowPages(pages);
    expect(result[0].content).toContain("page one");
    expect(result[1].content).toContain("page two");
  });

  it("always returns exactly 8 pages", () => {
    const pages: PageContent[] = Array.from({ length: 3 }, (_, i) => ({
      pageNumber: i + 1,
      content: `page ${i + 1}`,
    }));
    expect(reflowPages(pages)).toHaveLength(8);
  });

  it("page numbers in output are sequential 1–8", () => {
    const pages: PageContent[] = [{ pageNumber: 1, content: "hi" }];
    reflowPages(pages).forEach((p, i) => expect(p.pageNumber).toBe(i + 1));
  });

  it("empty pages in input are ignored (filtered out)", () => {
    const pages: PageContent[] = [
      { pageNumber: 1, content: "hello" },
      { pageNumber: 2, content: "" },
      { pageNumber: 3, content: "   " },
    ];
    const result = reflowPages(pages);
    // Only 'hello' was non-empty, so pages 2+ should be empty
    expect(result[0].content).toContain("hello");
    expect(result[1].content).toBe("");
  });
});
