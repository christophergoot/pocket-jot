// A4 dimensions in mm
export const A4_WIDTH_MM = 297;
export const A4_HEIGHT_MM = 210;

// Each page is 1/8 of A4 (2 rows x 4 columns in landscape)
export const PAGE_WIDTH_MM = A4_WIDTH_MM / 4; // 74.25mm
export const PAGE_HEIGHT_MM = A4_HEIGHT_MM / 2; // 105mm

// Pocket mod page positions on A4 landscape
// Format: [pageNumber, row, col, rotated]
// Row 0 is top, Row 1 is bottom
// Col 0-3 from left to right
// rotated = true means the page is upside down (180 degrees)
export const POCKET_MOD_LAYOUT: [number, number, number, boolean][] = [
  [8, 0, 0, true],   // Top-left, upside down
  [1, 0, 1, false],  // Top, second from left
  [2, 0, 2, false],  // Top, third from left
  [7, 0, 3, true],   // Top-right, upside down
  [5, 1, 0, false],  // Bottom-left
  [4, 1, 1, true],   // Bottom, second from left, upside down
  [3, 1, 2, true],   // Bottom, third from left, upside down
  [6, 1, 3, false],  // Bottom-right
];

// Page separator patterns
export const PAGE_SEPARATORS = ['---', '<!-- page -->', '<!-- PAGE -->'];

// Default content for new documents
export const DEFAULT_CONTENT = `# My Pocket Book

Welcome to Pocket Jot!

---

## Page 2

Write your content here...

---

## Page 3

Use **bold** and *italic* text.

---

## Page 4

- List item 1
- List item 2
- List item 3

---

## Page 5

> Quotes look great too!

---

## Page 6

\`\`\`
Code blocks work!
\`\`\`

---

## Page 7

Almost done...

---

## Page 8

The End!
`;

export const TOTAL_PAGES = 8;
