"use client";

import html2canvas from "html2canvas-pro";

/**
 * Render a DOM element to a high-resolution PNG and trigger download.
 */
export async function exportCanvasToPng(
  element: HTMLDivElement,
  filename: string,
): Promise<string> {
  const targetWidth = 1080;
  const scale = targetWidth / element.offsetWidth;

  const canvas = await html2canvas(element, {
    scale,
    width: element.offsetWidth,
    height: element.offsetHeight,
    useCORS: true,
    backgroundColor: null,
  });

  const dataUrl = canvas.toDataURL("image/png");

  // Trigger download
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();

  return dataUrl;
}

/**
 * Render a DOM element to a base64 image (no download, for saving to album).
 * Uses JPEG at reduced quality to keep file size under localStorage limits.
 */
export async function renderCanvasToBase64(
  element: HTMLDivElement,
): Promise<string> {
  const targetWidth = 720;
  const scale = targetWidth / element.offsetWidth;

  const canvas = await html2canvas(element, {
    scale,
    width: element.offsetWidth,
    height: element.offsetHeight,
    useCORS: true,
    backgroundColor: null,
  });

  return canvas.toDataURL("image/jpeg", 0.75);
}
