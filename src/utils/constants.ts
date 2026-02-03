// A4 dimensions in mm
export const A4_WIDTH_MM = 297;
export const A4_HEIGHT_MM = 210;

// Each page is 1/8 of A4 (2 rows x 4 columns in landscape)
export const PAGE_WIDTH_MM = A4_WIDTH_MM / 4; // 74.25mm
export const PAGE_HEIGHT_MM = A4_HEIGHT_MM / 2; // 105mm

// Pocket mod page positions on A4 landscape
// This maps each grid position to which page goes there
// Format: { row, col, page, rotated }
// Row 0 is top, Row 1 is bottom
// Col 0-3 from left to right
// rotated = true means the page is upside down (180 degrees)
//
// Printed layout on A4 landscape:
// | 1↓ | 8↓ | 7↓ | 6↓ |  <- top row (all upside down)
// | 2  | 3  | 4  | 5  |  <- bottom row (all right-side up)
export const POCKET_MOD_POSITIONS = [
  // Top row, left to right (all rotated 180°)
  { row: 0, col: 0, page: 1, rotated: true },
  { row: 0, col: 1, page: 8, rotated: true },
  { row: 0, col: 2, page: 7, rotated: true },
  { row: 0, col: 3, page: 6, rotated: true },
  // Bottom row, left to right (all right-side up)
  { row: 1, col: 0, page: 2, rotated: false },
  { row: 1, col: 1, page: 3, rotated: false },
  { row: 1, col: 2, page: 4, rotated: false },
  { row: 1, col: 3, page: 5, rotated: false },
];

// Legacy format (keeping for reference)
// Format: [page, row, col, rotated]
export const POCKET_MOD_LAYOUT: [number, number, number, boolean][] = [
  [1, 0, 0, true],
  [8, 0, 1, true],
  [7, 0, 2, true],
  [6, 0, 3, true],
  [2, 1, 0, false],
  [3, 1, 1, false],
  [4, 1, 2, false],
  [5, 1, 3, false],
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
