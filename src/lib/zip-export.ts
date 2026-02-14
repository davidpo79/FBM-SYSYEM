import JSZip from "jszip";
import { exportToPdf, downloadBlob } from "./pdf-export";

export interface ZipDocument {
  title: string;
  content: string;
  filename: string;
}

export interface ZipImage {
  url: string;
  base64?: string;
  filename: string;
}

export async function downloadAllAsZip(
  documents: ZipDocument[],
  images: ZipImage[],
  zipName: string,
) {
  const zip = new JSZip();

  // Add PDFs
  const docsFolder = zip.folder("documents");
  if (docsFolder) {
    for (const doc of documents) {
      const pdfBlob = await exportToPdf(doc.title, doc.content);
      docsFolder.file(doc.filename, pdfBlob);
    }
  }

  // Add images
  const imgFolder = zip.folder("creatives");
  if (imgFolder) {
    for (const img of images) {
      if (img.base64) {
        // data:image/png;base64,xxxx → extract raw base64
        const raw = img.base64.replace(/^data:image\/\w+;base64,/, "");
        imgFolder.file(img.filename, raw, { base64: true });
      } else if (img.url) {
        try {
          const res = await fetch(img.url);
          const blob = await res.blob();
          imgFolder.file(img.filename, blob);
        } catch {
          // skip images that fail to download
        }
      }
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, zipName);
}
