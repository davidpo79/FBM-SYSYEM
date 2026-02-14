import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

/* ─────────────── Markdown → HTML ─────────────── */

function markdownToHtml(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<br/>";

      // Headings
      if (trimmed.startsWith("### "))
        return `<h3>${stripInline(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith("## "))
        return `<h2>${stripInline(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith("# "))
        return `<h1>${stripInline(trimmed.slice(2))}</h1>`;

      // Horizontal rule
      if (/^---+$/.test(trimmed)) return "<hr/>";

      // List items
      if (/^[-*]\s/.test(trimmed))
        return `<li>${stripInline(trimmed.replace(/^[-*]\s/, ""))}</li>`;
      if (/^\d+\.\s/.test(trimmed))
        return `<li>${stripInline(trimmed.replace(/^\d+\.\s/, ""))}</li>`;

      // Table separator → skip
      if (/^\|?[-|:]+\|?$/.test(trimmed)) return "";

      // Table row
      if (trimmed.includes("|")) {
        const cells = trimmed
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        return `<div class="table-row">${cells.map((c) => `<span class="cell">${stripInline(c)}</span>`).join(" | ")}</div>`;
      }

      // Regular paragraph
      return `<p>${stripInline(trimmed)}</p>`;
    })
    .join("\n");
}

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1");
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
      li { margin: 2px 0; padding-right: 12px; }
      hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
      strong { font-weight: 700; }
      em { font-style: italic; }
      code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
      .table-row { padding: 4px 0; border-bottom: 1px solid #eee; font-size: 12px; }
      .cell { display: inline; }
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

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
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
      doc.addImage(imgData, "JPEG", pdfMargin, pdfMargin, contentWidth, scaledHeight);
    } else {
      // Multi-page: slice the canvas into page-sized chunks
      const pageCanvasHeight = pageHeight / scaleFactor;
      let srcY = 0;
      let pageNum = 0;

      while (srcY < imgHeight) {
        if (pageNum > 0) doc.addPage();

        const sliceHeight = Math.min(pageCanvasHeight, imgHeight - srcY);
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

        srcY += sliceHeight;
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
