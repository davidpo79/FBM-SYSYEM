import { jsPDF } from "jspdf";

/* ─────────────── Hebrew Font Loader ─────────────── */

let fontCache: string | null = null;

async function loadHebrewFont(): Promise<string> {
  if (fontCache) return fontCache;

  // Fetch Rubik Regular static TTF from Google Fonts (Hebrew-supporting font)
  const res = await fetch(
    "https://raw.githubusercontent.com/google/fonts/main/ofl/rubik/static/Rubik-Regular.ttf",
  );
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  fontCache = btoa(binary);
  return fontCache;
}

/* ─────────────── Markdown → PDF Renderer ─────────────── */

interface PdfCursor {
  y: number;
  doc: jsPDF;
  pageWidth: number;
  margin: number;
  contentWidth: number;
}

function addPage(c: PdfCursor) {
  c.doc.addPage();
  c.y = 20;
}

function ensureSpace(c: PdfCursor, needed: number) {
  if (c.y + needed > 275) {
    addPage(c);
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();
}

function renderLine(c: PdfCursor, text: string, fontSize: number, bold: boolean) {
  ensureSpace(c, fontSize * 0.5 + 2);

  c.doc.setFontSize(fontSize);
  // jsPDF uses font style string
  c.doc.setFont("Rubik", bold ? "bold" : "normal");

  // Split long lines to fit the content width
  const lines = c.doc.splitTextToSize(text, c.contentWidth);

  for (const line of lines) {
    ensureSpace(c, fontSize * 0.5);
    // RTL: right-align text
    c.doc.text(line, c.pageWidth - c.margin, c.y, { align: "right" });
    c.y += fontSize * 0.45;
  }
}

function renderContent(c: PdfCursor, markdown: string) {
  const lines = markdown.split("\n");

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Skip empty lines (add small spacing)
    if (!line.trim()) {
      c.y += 3;
      continue;
    }

    // H1: # Title
    if (line.startsWith("# ")) {
      c.y += 4;
      renderLine(c, stripMarkdown(line.slice(2)), 18, true);
      c.y += 3;
      continue;
    }

    // H2: ## Subtitle
    if (line.startsWith("## ")) {
      c.y += 3;
      renderLine(c, stripMarkdown(line.slice(3)), 14, true);
      c.y += 2;
      continue;
    }

    // H3: ### Sub-subtitle
    if (line.startsWith("### ")) {
      c.y += 2;
      renderLine(c, stripMarkdown(line.slice(4)), 12, true);
      c.y += 1;
      continue;
    }

    // List items: - or * or numbered
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const bullet = line.match(/^[-*]\s/) ? "•" : line.match(/^(\d+\.)/)?.[1] ?? "•";
      const text = stripMarkdown(line.replace(/^[-*]\s|^\d+\.\s/, ""));
      renderLine(c, `${bullet} ${text}`, 10, false);
      continue;
    }

    // Bold line (entire line is bold)
    if (line.startsWith("**") && line.endsWith("**")) {
      renderLine(c, stripMarkdown(line), 10, true);
      continue;
    }

    // Table separator (skip)
    if (/^\|?[-|:]+\|?$/.test(line.trim())) {
      continue;
    }

    // Table row - render each cell as a separate indented line
    if (line.includes("|")) {
      const cells = line
        .split("|")
        .map((s) => stripMarkdown(s.trim()))
        .filter(Boolean);

      // Render each cell on its own line with bullet style
      for (const cell of cells) {
        if (cell.length > 0) {
          renderLine(c, `  ${cell}`, 9, false);
        }
      }
      c.y += 1;

      // Draw a light separator line
      c.doc.setDrawColor(220);
      c.doc.setLineWidth(0.2);
      c.doc.line(c.margin + 10, c.y, c.pageWidth - c.margin - 10, c.y);
      c.y += 2;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      c.y += 2;
      c.doc.setDrawColor(200);
      c.doc.line(c.margin, c.y, c.pageWidth - c.margin, c.y);
      c.y += 4;
      continue;
    }

    // Regular paragraph text
    renderLine(c, stripMarkdown(line), 10, false);
  }
}

/* ─────────────── Public API ─────────────── */

export async function exportToPdf(
  title: string,
  content: string,
): Promise<Blob> {
  const fontBase64 = await loadHebrewFont();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Register Hebrew font
  doc.addFileToVFS("Rubik-Regular.ttf", fontBase64);
  doc.addFont("Rubik-Regular.ttf", "Rubik", "normal");
  // Register as bold too (same font, different style name)
  doc.addFileToVFS("Rubik-Bold.ttf", fontBase64);
  doc.addFont("Rubik-Bold.ttf", "Rubik", "bold");
  doc.setFont("Rubik");

  // Set language for Hebrew
  doc.setLanguage("he");

  const cursor: PdfCursor = {
    y: 20,
    doc,
    pageWidth,
    margin,
    contentWidth: pageWidth - margin * 2,
  };

  // Title
  renderLine(cursor, title, 20, true);
  cursor.y += 4;

  // Date
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `FBM Studio | ${new Date().toLocaleDateString("he-IL")}`,
    pageWidth - margin,
    cursor.y,
    { align: "right" },
  );
  doc.setTextColor(0);
  cursor.y += 8;

  // Separator
  doc.setDrawColor(59, 130, 246); // blue
  doc.setLineWidth(0.5);
  doc.line(margin, cursor.y, pageWidth - margin, cursor.y);
  cursor.y += 6;

  // Content
  renderContent(cursor, content);

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${i} / ${totalPages}`, pageWidth / 2, 290, { align: "center" });
    doc.text("FBM Studio", margin, 290);
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
