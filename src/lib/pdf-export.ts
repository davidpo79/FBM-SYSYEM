import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

/* ─────────────── Markdown → HTML ─────────────── */

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Empty line
    if (!trimmed) {
      output.push("<br/>");
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      output.push(`<h3>${stripInline(trimmed.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      output.push(`<h2>${stripInline(trimmed.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      output.push(`<h1>${stripInline(trimmed.slice(2))}</h1>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      output.push("<hr/>");
      i++;
      continue;
    }

    // Unordered list block - collect consecutive list items
    if (/^[-*]\s/.test(trimmed)) {
      output.push('<ul class="rtl-list">');
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^[-*]\s/, "");
        output.push(`<li>${stripInline(item)}</li>`);
        i++;
      }
      output.push("</ul>");
      continue;
    }

    // Ordered list block
    if (/^\d+\.\s/.test(trimmed)) {
      output.push('<ol class="rtl-list">');
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^\d+\.\s/, "");
        output.push(`<li>${stripInline(item)}</li>`);
        i++;
      }
      output.push("</ol>");
      continue;
    }

    // Table block - collect consecutive table rows
    if (trimmed.includes("|")) {
      const tableRows: string[][] = [];
      let hasHeader = false;

      while (i < lines.length && lines[i].trim().includes("|")) {
        const row = lines[i].trim();
        // Skip separator line (---|---|---)
        if (/^\|?[\s\-:|]+\|?$/.test(row) && row.includes("-")) {
          hasHeader = tableRows.length > 0;
          i++;
          continue;
        }
        const cells = row
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        tableRows.push(cells);
        i++;
      }

      if (tableRows.length > 0) {
        output.push('<table class="pdf-table">');
        tableRows.forEach((cells, idx) => {
          const isHead = hasHeader && idx === 0;
          const tag = isHead ? "th" : "td";
          const wrapper = isHead ? "thead" : (idx === 1 && hasHeader ? "tbody" : "");
          if (wrapper === "thead") output.push("<thead>");
          if (wrapper === "tbody") output.push("</thead><tbody>");
          output.push("<tr>");
          cells.forEach((cell) => {
            output.push(`<${tag}>${stripInline(cell)}</${tag}>`);
          });
          output.push("</tr>");
        });
        if (hasHeader) output.push("</tbody>");
        output.push("</table>");
      }
      continue;
    }

    // Regular paragraph
    output.push(`<p>${stripInline(trimmed)}</p>`);
    i++;
  }

  return output.join("\n");
}

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");
}

/* ─────────── Find safe page-break Y position ─────────── */

/**
 * Scans the canvas for a mostly-white horizontal row near `targetY`,
 * searching within ±searchRange pixels. Returns the best Y to slice at.
 */
function findSafeBreakY(
  canvas: HTMLCanvasElement,
  targetY: number,
  searchRange: number,
): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return targetY;

  const width = canvas.width;
  const minY = Math.max(0, targetY - searchRange);
  const maxY = Math.min(canvas.height - 1, targetY + searchRange);

  let bestY = targetY;
  let bestScore = -1;

  // Scan rows around the target, looking for the whitest row
  for (let y = minY; y <= maxY; y++) {
    const rowData = ctx.getImageData(0, y, width, 1).data;
    let whitePixels = 0;
    for (let x = 0; x < width; x++) {
      const idx = x * 4;
      // Consider pixel "white" if all channels > 240
      if (rowData[idx] > 240 && rowData[idx + 1] > 240 && rowData[idx + 2] > 240) {
        whitePixels++;
      }
    }
    const score = whitePixels / width;
    // Prefer rows that are closest to target among equally white rows
    if (score > 0.98) {
      // Almost entirely white row - prefer ones closer to target
      const distance = Math.abs(y - targetY);
      const adjustedScore = score * 1000 - distance;
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestY = y;
      }
    } else if (score > bestScore && bestScore < 0) {
      bestScore = score;
      bestY = y;
    }
  }

  return bestY;
}

/* ─────────────── HTML → PDF via Canvas ─────────────── */

export async function exportToPdf(
  title: string,
  content: string,
): Promise<Blob> {
  const htmlContent = markdownToHtml(content);
  const dateStr = new Date().toLocaleDateString("he-IL");

  // Create a hidden container for rendering
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 650px;
    padding: 40px;
    background: white;
    font-family: 'Rubik', 'Arial', 'Helvetica', sans-serif;
    font-size: 13px;
    line-height: 1.7;
    color: #1a1a1a;
    direction: rtl;
  `;

  container.innerHTML = `
    <style>
      h1 { font-size: 22px; font-weight: 700; margin: 16px 0 8px; color: #111; }
      h2 { font-size: 17px; font-weight: 700; margin: 14px 0 6px; color: #222; }
      h3 { font-size: 14px; font-weight: 700; margin: 10px 0 4px; color: #333; }
      p { margin: 4px 0; }
      hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
      strong { font-weight: 700; }
      em { font-style: italic; }
      code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 12px; }

      /* RTL Lists */
      .rtl-list {
        margin: 8px 0;
        padding: 0;
        list-style: none;
      }
      .rtl-list li {
        position: relative;
        padding-right: 20px;
        margin: 4px 0;
        text-align: right;
      }
      .rtl-list li::before {
        position: absolute;
        right: 0;
        top: 0;
      }
      ul.rtl-list li::before {
        content: "●";
        color: #3b82f6;
        font-size: 10px;
        top: 4px;
      }
      ol.rtl-list { counter-reset: list-counter; }
      ol.rtl-list li { counter-increment: list-counter; }
      ol.rtl-list li::before {
        content: counter(list-counter) ".";
        font-weight: 700;
        color: #3b82f6;
      }

      /* Tables */
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        font-size: 12px;
        direction: rtl;
      }
      .pdf-table th,
      .pdf-table td {
        border: 1px solid #d1d5db;
        padding: 8px 12px;
        text-align: right;
      }
      .pdf-table th {
        background: #1e3a5f;
        color: white;
        font-weight: 700;
        font-size: 12px;
      }
      .pdf-table tr:nth-child(even) td {
        background: #f8fafc;
      }
      .pdf-table tr:nth-child(odd) td {
        background: #ffffff;
      }

      .pdf-title { font-size: 24px; font-weight: 700; color: #1e3a5f; margin-bottom: 4px; }
      .pdf-meta { font-size: 11px; color: #888; margin-bottom: 12px; }
      .pdf-divider { border: none; border-top: 2px solid #3b82f6; margin: 8px 0 16px; }
    </style>
    <div class="pdf-title">${title}</div>
    <div class="pdf-meta">FBM Studio | ${dateStr}</div>
    <hr class="pdf-divider"/>
    ${htmlContent}
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    document.body.removeChild(container);

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4 dimensions in mm
    const pdfWidth = 210;
    const pdfMargin = 10;
    const contentWidth = pdfWidth - pdfMargin * 2;
    const scaleFactor = contentWidth / imgWidth;
    const scaledHeight = imgHeight * scaleFactor;
    const pageHeight = 297 - pdfMargin * 2;

    const doc = new jsPDF("portrait", "mm", "a4");

    // If content fits on one page
    if (scaledHeight <= pageHeight) {
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      doc.addImage(imgData, "JPEG", pdfMargin, pdfMargin, contentWidth, scaledHeight);
    } else {
      // Multi-page: slice the canvas at safe break points (white rows)
      const pageCanvasHeight = pageHeight / scaleFactor;
      const searchRange = Math.round(pageCanvasHeight * 0.15); // search ±15% of page height
      let srcY = 0;
      let pageNum = 0;

      while (srcY < imgHeight) {
        if (pageNum > 0) doc.addPage();

        // Determine where to cut
        let endY: number;
        const remaining = imgHeight - srcY;
        if (remaining <= pageCanvasHeight) {
          endY = imgHeight;
        } else {
          const rawEnd = srcY + pageCanvasHeight;
          endY = findSafeBreakY(canvas, Math.round(rawEnd), searchRange);
        }

        const sliceHeight = endY - srcY;
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, srcY, imgWidth, sliceHeight,
            0, 0, imgWidth, sliceHeight,
          );
          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
          const sliceScaledH = sliceHeight * scaleFactor;
          doc.addImage(sliceData, "JPEG", pdfMargin, pdfMargin, contentWidth, sliceScaledH);
        }

        srcY = endY;
        pageNum++;
      }
    }

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${i} / ${totalPages}`, pdfWidth / 2, 290, { align: "center" });
    }

    return doc.output("blob");
  } catch (err) {
    // Cleanup on error
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    throw err;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
