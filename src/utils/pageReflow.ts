import { TOTAL_PAGES } from "./constants";
import type { PageContent } from "../types";

// Fixed page dimensions matching PDF output (74mm x 105mm at ~3px/mm)
// These must stay constant regardless of window size
const PAGE_WIDTH_PX = 222; // 74mm * 3
const PAGE_HEIGHT_PX = 260; // Reduced to prevent bottom clipping in PDF output

/**
 * Split content into individual lines/items that can be placed on pages
 */
function splitIntoLines(content: string): string[] {
  return content.split("\n");
}

/**
 * Check if a line is a page break marker
 */
function isPageBreak(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "---" || trimmed === "***" || trimmed === "___";
}

/**
 * Check if a line is a list item (top-level or nested)
 */
function isListItem(line: string): boolean {
  return /^(\s*)[-*+]\s+/.test(line) || /^(\s*)\d+\.\s+/.test(line);
}

/**
 * Get the indentation level of a line
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Build the ancestor list-item chain for a line that starts a new page.
 * Without these ancestors, indented markdown list items are parsed as code
 * blocks instead of nested bullets.
 */
function buildListContext(line: string, previousLines: string[]): string[] {
  if (!isListItem(line)) return [];

  const targetIndent = getIndentLevel(line);
  if (targetIndent === 0) return [];

  const ancestors = new Map<number, string>();

  for (let i = previousLines.length - 1; i >= 0; i--) {
    const prevLine = previousLines[i];
    if (!isListItem(prevLine)) continue;

    const indent = getIndentLevel(prevLine);
    if (indent < targetIndent && !ancestors.has(indent)) {
      ancestors.set(indent, prevLine);
      if (indent === 0) break;
    }
  }

  return Array.from(ancestors.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, l]) => l);
}

/**
 * Post-process reflowed pages to add (X/Y) continuation markers
 * to root-level list items that span multiple consecutive pages.
 */
function addContinuationMarkers(pages: PageContent[]): PageContent[] {
  interface RootEntry {
    pageIdx: number;
    lineIdx: number;
    text: string;
  }

  const roots: RootEntry[] = [];
  for (let pi = 0; pi < pages.length; pi++) {
    if (!pages[pi].content.trim()) continue;
    const lines = pages[pi].content.split("\n");
    for (let li = 0; li < lines.length; li++) {
      if (isListItem(lines[li]) && getIndentLevel(lines[li]) === 0) {
        roots.push({ pageIdx: pi, lineIdx: li, text: lines[li] });
        break;
      }
    }
  }

  if (roots.length === 0) return pages;

  const groups: RootEntry[][] = [];
  let currentGroup: RootEntry[] = [roots[0]];

  for (let i = 1; i < roots.length; i++) {
    if (
      roots[i].text === currentGroup[0].text &&
      roots[i].pageIdx === roots[i - 1].pageIdx + 1
    ) {
      currentGroup.push(roots[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [roots[i]];
    }
  }
  groups.push(currentGroup);

  const result = pages.map((p) => ({ ...p }));

  for (const group of groups) {
    if (group.length <= 1) continue;
    const total = group.length;

    for (let i = 0; i < group.length; i++) {
      const { pageIdx, lineIdx } = group[i];
      const lines = result[pageIdx].content.split("\n");
      lines[lineIdx] =
        `${lines[lineIdx]} <span style="color:#9ca3af">(${i + 1}/${total})</span>`;
      result[pageIdx] = { ...result[pageIdx], content: lines.join("\n") };
    }
  }

  return result;
}

/**
 * Measure the height of rendered content
 */
function measureContent(lines: string[], container: HTMLDivElement): number {
  container.innerHTML = renderForMeasurement(lines.join("\n"));
  return container.scrollHeight;
}

/**
 * Simple markdown to HTML for measurement
 * Process line by line to avoid adding <br> between block elements
 */
function renderForMeasurement(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    // Headers
    if (/^### (.+)$/.test(line)) {
      result.push(
        line.replace(
          /^### (.+)$/,
          '<div style="font-size:11px;font-weight:600;margin:0 0 4px 0;">$1</div>',
        ),
      );
      continue;
    }
    if (/^## (.+)$/.test(line)) {
      result.push(
        line.replace(
          /^## (.+)$/,
          '<div style="font-size:12px;font-weight:700;margin:0 0 6px 0;">$1</div>',
        ),
      );
      continue;
    }
    if (/^# (.+)$/.test(line)) {
      result.push(
        line.replace(
          /^# (.+)$/,
          '<div style="font-size:14px;font-weight:700;margin:0 0 8px 0;">$1</div>',
        ),
      );
      continue;
    }

    // Unordered list items (detect indentation - 2 or 4 spaces per level)
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      const indent = ulMatch[1];
      const text = ulMatch[2];
      // Support both 2-space and 4-space indentation
      const level = Math.floor(indent.length / 2);
      result.push(
        `<div style="margin-left:${level * 12}px;margin-bottom:2px;">• ${text}</div>`,
      );
      continue;
    }

    // Ordered list items
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      const indent = olMatch[1];
      const text = olMatch[2];
      const level = Math.floor(indent.length / 2);
      result.push(
        `<div style="margin-left:${level * 12}px;margin-bottom:2px;">${text}</div>`,
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      result.push('<div style="height:8px;"></div>');
      continue;
    }

    // Regular text
    result.push(`<div style="margin-bottom:4px;">${line}</div>`);
  }

  return result.join("");
}

/**
 * Create measurement container matching PDF dimensions exactly
 */
function createMeasureContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.width = `${PAGE_WIDTH_PX}px`;
  container.style.height = `${PAGE_HEIGHT_PX}px`;
  container.style.fontSize = "10px";
  container.style.lineHeight = "1.4";
  container.style.fontFamily = "system-ui, -apple-system, sans-serif";
  container.style.padding = "12px";
  container.style.boxSizing = "border-box";
  container.style.overflow = "hidden";
  document.body.appendChild(container);
  return container;
}

/**
 * Reflow content across pages automatically
 * Content flows naturally, --- forces a page break
 */
export function reflowPages(pages: PageContent[]): PageContent[] {
  // Combine all content from parsed pages
  const allContent = pages
    .map((p) => p.content)
    .filter((c) => c.trim())
    .join("\n---\n");

  const lines = splitIntoLines(allContent);
  const container = createMeasureContainer();

  try {
    const reflowedPages: PageContent[] = [];
    let currentPageLines: string[] = [];
    let pageNumber = 1;

    const finishPage = () => {
      if (pageNumber <= TOTAL_PAGES) {
        reflowedPages.push({
          pageNumber,
          content: currentPageLines.join("\n").trim(),
        });
        pageNumber++;
        currentPageLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for explicit page break
      if (isPageBreak(line)) {
        finishPage();
        continue;
      }

      // Skip empty lines at the start of a page
      if (currentPageLines.length === 0 && line.trim() === "") {
        continue;
      }

      // Try adding this line
      const testLines = [...currentPageLines, line];
      const height = measureContent(testLines, container);

      if (height > PAGE_HEIGHT_PX && currentPageLines.length > 0) {
        // Would overflow - need to start a new page

        // If this is a nested list item, try to keep it with its parent
        if (isListItem(line) && getIndentLevel(line) > 0) {
          // Find the parent item to move with this line
          let parentIndex = currentPageLines.length - 1;
          const currentIndent = getIndentLevel(line);

          while (parentIndex >= 0) {
            const parentLine = currentPageLines[parentIndex];
            if (
              isListItem(parentLine) &&
              getIndentLevel(parentLine) < currentIndent
            ) {
              break;
            }
            parentIndex--;
          }

          // If we found a recent parent, move it and children to next page
          if (parentIndex >= 0 && currentPageLines.length - parentIndex <= 3) {
            const linesBeforeParent = currentPageLines.slice(0, parentIndex);
            const linesToMove = currentPageLines.splice(parentIndex);
            finishPage();
            const context = buildListContext(linesToMove[0], linesBeforeParent);
            currentPageLines = [...context, ...linesToMove, line];
            continue;
          }
        }

        // Start new page with current line
        const previousLines = [...currentPageLines];
        finishPage();
        if (line.trim()) {
          const context = buildListContext(line, previousLines);
          currentPageLines = [...context, line];
        }
      } else {
        currentPageLines.push(line);
      }

      // Stop if we've exceeded max pages
      if (pageNumber > TOTAL_PAGES) {
        break;
      }
    }

    // Add the last page
    if (currentPageLines.length > 0 && pageNumber <= TOTAL_PAGES) {
      finishPage();
    }

    // Fill remaining pages with empty content
    while (reflowedPages.length < TOTAL_PAGES) {
      reflowedPages.push({
        pageNumber: reflowedPages.length + 1,
        content: "",
      });
    }

    return addContinuationMarkers(reflowedPages);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Reflow raw content (not pre-parsed) across pages
 */
export function reflowContent(content: string): PageContent[] {
  const lines = splitIntoLines(content);
  const container = createMeasureContainer();

  try {
    const reflowedPages: PageContent[] = [];
    let currentPageLines: string[] = [];
    let pageNumber = 1;

    const finishPage = () => {
      if (pageNumber <= TOTAL_PAGES) {
        reflowedPages.push({
          pageNumber,
          content: currentPageLines.join("\n").trim(),
        });
        pageNumber++;
        currentPageLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for explicit page break
      if (isPageBreak(line)) {
        finishPage();
        continue;
      }

      // Skip empty lines at the start of a page
      if (currentPageLines.length === 0 && line.trim() === "") {
        continue;
      }

      // Try adding this line
      const testLines = [...currentPageLines, line];
      const height = measureContent(testLines, container);

      if (height > PAGE_HEIGHT_PX && currentPageLines.length > 0) {
        const previousLines = [...currentPageLines];
        finishPage();
        if (line.trim()) {
          const context = buildListContext(line, previousLines);
          currentPageLines = [...context, line];
        }
      } else {
        currentPageLines.push(line);
      }

      if (pageNumber > TOTAL_PAGES) {
        break;
      }
    }

    // Add the last page
    if (currentPageLines.length > 0 && pageNumber <= TOTAL_PAGES) {
      finishPage();
    }

    // Fill remaining pages
    while (reflowedPages.length < TOTAL_PAGES) {
      reflowedPages.push({
        pageNumber: reflowedPages.length + 1,
        content: "",
      });
    }

    return addContinuationMarkers(reflowedPages);
  } finally {
    document.body.removeChild(container);
  }
}
