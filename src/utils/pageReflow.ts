import { TOTAL_PAGES } from './constants';
import type { PageContent } from '../types';

// Fixed page dimensions matching PDF output (74mm x 105mm at ~3px/mm)
// These must stay constant regardless of window size
const PAGE_WIDTH_PX = 222;  // 74mm * 3
const PAGE_HEIGHT_PX = 315; // 105mm * 3

/**
 * Split content into individual lines/items that can be placed on pages
 */
function splitIntoLines(content: string): string[] {
  return content.split('\n');
}

/**
 * Check if a line is a page break marker
 */
function isPageBreak(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '---' || trimmed === '***' || trimmed === '___';
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
 * Measure the height of rendered content
 */
function measureContent(lines: string[], container: HTMLDivElement): number {
  container.innerHTML = renderForMeasurement(lines.join('\n'));
  return container.scrollHeight;
}

/**
 * Simple markdown to HTML for measurement
 */
function renderForMeasurement(markdown: string): string {
  if (!markdown) return '';

  return markdown
    .replace(/^### (.+)$/gm, '<div style="font-size:11px;font-weight:600;margin:0 0 4px 0;">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:12px;font-weight:700;margin:0 0 6px 0;">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:14px;font-weight:700;margin:0 0 8px 0;">$1</div>')
    .replace(/^(\s*)[-*+]\s+(.+)$/gm, (_, indent, text) => {
      const level = indent.length / 4;
      return `<div style="margin-left:${12 + level * 12}px;margin-bottom:2px;">• ${text}</div>`;
    })
    .replace(/^(\s*)\d+\.\s+(.+)$/gm, (_, indent, text) => {
      const level = indent.length / 4;
      return `<div style="margin-left:${12 + level * 12}px;margin-bottom:2px;">${text}</div>`;
    })
    .replace(/\n/g, '<br>');
}

/**
 * Create measurement container matching PDF dimensions exactly
 */
function createMeasureContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.visibility = 'hidden';
  container.style.width = `${PAGE_WIDTH_PX}px`;
  container.style.height = `${PAGE_HEIGHT_PX}px`;
  container.style.fontSize = '10px';
  container.style.lineHeight = '1.4';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  container.style.padding = '12px';
  container.style.boxSizing = 'border-box';
  container.style.overflow = 'hidden';
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
    .map(p => p.content)
    .filter(c => c.trim())
    .join('\n---\n');

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
          content: currentPageLines.join('\n').trim(),
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
      if (currentPageLines.length === 0 && line.trim() === '') {
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
            if (isListItem(parentLine) && getIndentLevel(parentLine) < currentIndent) {
              break;
            }
            parentIndex--;
          }

          // If we found a recent parent, move it and children to next page
          if (parentIndex >= 0 && currentPageLines.length - parentIndex <= 3) {
            const linesToMove = currentPageLines.splice(parentIndex);
            finishPage();
            currentPageLines = [...linesToMove, line];
            continue;
          }
        }

        // Start new page with current line
        finishPage();
        if (line.trim()) {
          currentPageLines = [line];
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
        content: '',
      });
    }

    return reflowedPages;
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
          content: currentPageLines.join('\n').trim(),
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
      if (currentPageLines.length === 0 && line.trim() === '') {
        continue;
      }

      // Try adding this line
      const testLines = [...currentPageLines, line];
      const height = measureContent(testLines, container);

      if (height > PAGE_HEIGHT_PX && currentPageLines.length > 0) {
        // Would overflow - start new page
        finishPage();
        if (line.trim()) {
          currentPageLines = [line];
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
        content: '',
      });
    }

    return reflowedPages;
  } finally {
    document.body.removeChild(container);
  }
}
