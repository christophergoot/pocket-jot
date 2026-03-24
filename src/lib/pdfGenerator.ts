import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  POCKET_MOD_POSITIONS,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  PAGE_WIDTH_MM,
  PAGE_HEIGHT_MM,
} from "./constants";
import type { PageContent } from "../types";

interface PdfOptions {
  showFoldLines?: boolean;
  highlightCover?: boolean;
}

/**
 * Generate a pocket mod PDF from page contents
 */
export async function generatePocketModPdf(
  pages: PageContent[],
  options: PdfOptions = {},
): Promise<void> {
  const { showFoldLines = true, highlightCover = false } = options;

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageCanvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < 8; i++) {
      const pageContent = pages[i]?.content || "";
      const isFirstPage = i === 0;

      // Create page element - always use light mode for printing
      const pageElement = document.createElement("div");
      pageElement.className = "prose-pocket";
      pageElement.style.width = "222px"; // ~74mm at 3x scale
      pageElement.style.height = "315px"; // ~105mm at 3x scale
      pageElement.style.padding = "12px";
      pageElement.style.backgroundColor = "#ffffff";
      pageElement.style.color = "#111827";
      pageElement.style.fontFamily = "system-ui, -apple-system, sans-serif";
      pageElement.style.fontSize = "10px";
      pageElement.style.lineHeight = "1.4";
      pageElement.style.overflow = "hidden";
      pageElement.style.boxSizing = "border-box";

      container.appendChild(pageElement);

      // Add cover border wrapper if enabled
      let renderTarget: HTMLElement = pageElement;
      if (highlightCover && isFirstPage) {
        const borderDiv = document.createElement("div");
        borderDiv.style.cssText =
          "border: 3px double #1f2937; border-radius: 2px; padding: 8px; height: calc(100% - 6px); box-sizing: border-box; overflow: hidden;";
        pageElement.appendChild(borderDiv);
        renderTarget = borderDiv;
      }

      // Render using the same ReactMarkdown + remarkGfm pipeline as the preview
      const root = createRoot(renderTarget);
      flushSync(() => {
        root.render(
          createElement(
            ReactMarkdown,
            { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeRaw] },
            pageContent,
          ),
        );
      });

      const canvas = await html2canvas(pageElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });

      root.unmount();
      pageCanvases.push(canvas);
      container.removeChild(pageElement);
    }

    // Place each page on the PDF according to pocket mod layout
    for (const position of POCKET_MOD_POSITIONS) {
      const { row, col, page, rotated } = position;
      const canvas = pageCanvases[page - 1];
      const imgData = canvas.toDataURL("image/png");

      const x = col * PAGE_WIDTH_MM;
      const y = row * PAGE_HEIGHT_MM;

      if (rotated) {
        const rotatedCanvas = rotateCanvas180(canvas);
        const rotatedImgData = rotatedCanvas.toDataURL("image/png");
        pdf.addImage(
          rotatedImgData,
          "PNG",
          x,
          y,
          PAGE_WIDTH_MM,
          PAGE_HEIGHT_MM,
        );
      } else {
        pdf.addImage(imgData, "PNG", x, y, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
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

    pdf.save("pocket-jot.pdf");
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Rotate a canvas 180 degrees
 */
function rotateCanvas180(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement("canvas");
  rotated.width = canvas.width;
  rotated.height = canvas.height;

  const ctx = rotated.getContext("2d");
  if (ctx) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
    ctx.drawImage(canvas, 0, 0);
  }

  return rotated;
}
