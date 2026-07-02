"use client";

/**
 * Client-side text extraction for uploaded files.
 * - .txt / .md / .csv → read directly
 * - .pdf → pdfjs-dist (dynamic import; worker bundled via import.meta.url)
 * - .docx and others → not supported client-side; ask the user to paste text.
 */
export interface FileExtractResult {
  ok: boolean;
  text: string;
  error?: string;
}

const TEXT_EXT = [".txt", ".md", ".markdown", ".csv", ".json"];

export async function extractFileText(file: File): Promise<FileExtractResult> {
  const name = file.name.toLowerCase();

  if (TEXT_EXT.some((ext) => name.endsWith(ext)) || file.type.startsWith("text/")) {
    try {
      return { ok: true, text: await file.text() };
    } catch {
      return { ok: false, text: "", error: "Could not read the text file." };
    }
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file);
  }

  return {
    ok: false,
    text: "",
    error:
      "Unsupported file type. Use .txt or .pdf, or paste the text directly.",
  };
}

async function extractPdf(file: File): Promise<FileExtractResult> {
  try {
    const pdfjs = await import("pdfjs-dist");
    // Bundle the worker locally (no external CDN — CSP-safe).
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out +=
        content.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((it: any) => ("str" in it ? it.str : ""))
          .join(" ") + "\n";
    }
    const text = out.trim();
    if (!text) {
      return {
        ok: false,
        text: "",
        error: "No selectable text found (scanned PDF?). Paste the text instead.",
      };
    }
    return { ok: true, text };
  } catch {
    return {
      ok: false,
      text: "",
      error: "Could not read the PDF. Paste the text instead.",
    };
  }
}
