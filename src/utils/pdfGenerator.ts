import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { POCKET_MOD_POSITIONS, A4_WIDTH_MM, A4_HEIGHT_MM, PAGE_WIDTH_MM, PAGE_HEIGHT_MM } from './constants';
import type { PageContent } from '../types';

interface PdfOptions {
  showFoldLines?: boolean;
  highlightCover?: boolean;
}

/**
 * Generate a pocket mod PDF from page contents
 */
export async function generatePocketModPdf(
  pages: PageContent[],
  options: PdfOptions = {}
): Promise<void> {
  const { showFoldLines = true, highlightCover = false } = options;
  // Create a temporary container for rendering pages
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    // Create PDF in landscape A4
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Render each page to canvas
    const pageCanvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < 8; i++) {
      const pageContent = pages[i]?.content || '';
      const isFirstPage = i === 0;

      // Create page element - always use light mode for printing
      const pageElement = document.createElement('div');
      pageElement.className = 'prose-pocket';
      pageElement.style.width = '222px'; // ~74mm at 3x scale
      pageElement.style.height = '315px'; // ~105mm at 3x scale
      pageElement.style.padding = '12px';
      pageElement.style.backgroundColor = '#ffffff'; // Always white for print
      pageElement.style.color = '#111827'; // Always dark text for print
      pageElement.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      pageElement.style.fontSize = '10px';
      pageElement.style.lineHeight = '1.4';
      pageElement.style.overflow = 'hidden';
      pageElement.style.boxSizing = 'border-box';

      // Add cover border if enabled and this is page 1 (double hairline style)
      if (highlightCover && isFirstPage) {
        const contentHtml = simpleMarkdownToHtml(pageContent);
        pageElement.innerHTML = `<div style="border: 3px double #1f2937; border-radius: 2px; padding: 8px; height: calc(100% - 6px); box-sizing: border-box; overflow: hidden;">${contentHtml}</div>`;
      } else {
        // Simple markdown to HTML conversion for PDF
        pageElement.innerHTML = simpleMarkdownToHtml(pageContent);
      }

      container.appendChild(pageElement);

      // Render to canvas - always white background for print
      const canvas = await html2canvas(pageElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      pageCanvases.push(canvas);
      container.removeChild(pageElement);
    }

    // Place each page on the PDF according to pocket mod layout
    for (const position of POCKET_MOD_POSITIONS) {
      const { row, col, page, rotated } = position;
      const canvas = pageCanvases[page - 1];
      const imgData = canvas.toDataURL('image/png');

      // Calculate position
      const x = col * PAGE_WIDTH_MM;
      const y = row * PAGE_HEIGHT_MM;

      if (rotated) {
        // For rotated pages, we need to add the image rotated 180 degrees
        // jsPDF doesn't support rotation directly, so we rotate the canvas
        const rotatedCanvas = rotateCanvas180(canvas);
        const rotatedImgData = rotatedCanvas.toDataURL('image/png');
        pdf.addImage(rotatedImgData, 'PNG', x, y, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
      } else {
        pdf.addImage(imgData, 'PNG', x, y, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
      }
    }

    // Add fold lines (light gray dashed lines) if enabled
    if (showFoldLines) {
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.setLineWidth(0.3);

      // Horizontal center line
      pdf.line(0, PAGE_HEIGHT_MM, A4_WIDTH_MM, PAGE_HEIGHT_MM);

      // Vertical lines
      for (let i = 1; i < 4; i++) {
        pdf.line(i * PAGE_WIDTH_MM, 0, i * PAGE_WIDTH_MM, A4_HEIGHT_MM);
      }
    }

    // Download the PDF
    pdf.save('pocket-jot.pdf');
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

/**
 * Rotate a canvas 180 degrees
 */
function rotateCanvas180(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement('canvas');
  rotated.width = canvas.width;
  rotated.height = canvas.height;

  const ctx = rotated.getContext('2d');
  if (ctx) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
    ctx.drawImage(canvas, 0, 0);
  }

  return rotated;
}

/**
 * Simple markdown to HTML conversion
 * (More reliable for PDF generation than react-markdown)
 */
function simpleMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const result: string[] = [];
  let inParagraph = false;

  // Track list state with a stack for nesting
  // Each entry: { type: 'ul' | 'ol', indent: number }
  const listStack: { type: 'ul' | 'ol'; indent: number }[] = [];

  const closeListsToLevel = (targetIndent: number) => {
    while (listStack.length > 0 && listStack[listStack.length - 1].indent >= targetIndent) {
      const list = listStack.pop()!;
      result.push(list.type === 'ul' ? '</ul>' : '</ol>');
    }
  };

  const closeAllLists = () => {
    while (listStack.length > 0) {
      const list = listStack.pop()!;
      result.push(list.type === 'ul' ? '</ul>' : '</ol>');
    }
  };

  const closeParagraph = () => {
    if (inParagraph) {
      result.push('</p>');
      inParagraph = false;
    }
  };

  // Get indentation level (count leading spaces, 2 spaces = 1 level)
  const getIndentLevel = (line: string): number => {
    const match = line.match(/^(\s*)/);
    if (!match) return 0;
    const spaces = match[1].replace(/\t/g, '  ').length;
    return Math.floor(spaces / 2);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const indentLevel = getIndentLevel(line);

    if (!trimmed) {
      closeAllLists();
      closeParagraph();
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      closeAllLists();
      closeParagraph();
      result.push(`<h3 style="font-size:11px;font-weight:600;margin:0 0 4px 0;">${formatInline(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      closeAllLists();
      closeParagraph();
      result.push(`<h2 style="font-size:12px;font-weight:700;margin:0 0 6px 0;">${formatInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      closeAllLists();
      closeParagraph();
      result.push(`<h1 style="font-size:14px;font-weight:700;margin:0 0 8px 0;">${formatInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      closeAllLists();
      closeParagraph();
      result.push(`<blockquote style="border-left:2px solid #d1d5db;padding-left:8px;margin:4px 0;font-style:italic;">${formatInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      closeAllLists();
      closeParagraph();
      result.push('<hr style="border:none;border-top:1px solid #d1d5db;margin:8px 0;">');
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      closeParagraph();

      // Close lists that are deeper than current indent
      closeListsToLevel(indentLevel + 1);

      // Check if we need to open a new list
      const currentList = listStack.length > 0 ? listStack[listStack.length - 1] : null;
      if (!currentList || currentList.indent < indentLevel || currentList.type !== 'ul') {
        // Need to open a new ul at this level
        if (currentList && currentList.type === 'ol' && currentList.indent === indentLevel) {
          // Close the ol at same level first
          result.push('</ol>');
          listStack.pop();
        }
        result.push(`<ul style="list-style-type:disc;padding-left:16px;margin:${listStack.length === 0 ? '0 0 8px 0' : '4px 0'};">`);
        listStack.push({ type: 'ul', indent: indentLevel });
      }

      result.push(`<li style="margin-bottom:2px;">${formatInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      closeParagraph();

      // Close lists that are deeper than current indent
      closeListsToLevel(indentLevel + 1);

      // Check if we need to open a new list
      const currentList = listStack.length > 0 ? listStack[listStack.length - 1] : null;
      if (!currentList || currentList.indent < indentLevel || currentList.type !== 'ol') {
        // Need to open a new ol at this level
        if (currentList && currentList.type === 'ul' && currentList.indent === indentLevel) {
          // Close the ul at same level first
          result.push('</ul>');
          listStack.pop();
        }
        result.push(`<ol style="list-style-type:decimal;padding-left:16px;margin:${listStack.length === 0 ? '0 0 8px 0' : '4px 0'};">`);
        listStack.push({ type: 'ol', indent: indentLevel });
      }

      result.push(`<li style="margin-bottom:2px;">${formatInline(olMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph
    closeAllLists();
    if (!inParagraph) {
      result.push('<p style="margin:0 0 8px 0;">');
      inParagraph = true;
    } else {
      result.push('<br>');
    }
    result.push(formatInline(trimmed));
  }

  closeAllLists();
  closeParagraph();

  return result.join('');
}

/**
 * Format inline markdown (bold, italic, code, links)
 */
function formatInline(text: string): string {
  return text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#e5e7eb;padding:1px 3px;border-radius:2px;font-family:monospace;font-size:9px;">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a style="color:#2563eb;text-decoration:underline;">$1</a>');
}
