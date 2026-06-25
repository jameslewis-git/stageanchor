'use client';

import { useState, useCallback, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { FileType, PdfPageData, TextItemData } from '../types';

interface UsePdfExtractorReturn {
  lines: string[];
  pageData: PdfPageData[];
  pdfDoc: PDFDocumentProxy | null;
  fileType: FileType;
  isExtracting: boolean;
  error: string | null;
  extract: (file: File) => Promise<void>;
  reset: () => void;
}

export function usePdfExtractor(): UsePdfExtractorReturn {
  const [lines, setLines] = useState<string[]>([]);
  const [pageData, setPageData] = useState<PdfPageData[]>([]);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keep a ref so reset() can destroy the loaded doc
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  const reset = useCallback(() => {
    pdfDocRef.current = null;
    setPdfDoc(null);
    setLines([]);
    setPageData([]);
    setFileType(null);
    setError(null);
    setIsExtracting(false);
  }, []);

  const extract = useCallback(async (file: File) => {
    // Clear any previous document reference before loading a new one
    pdfDocRef.current = null;

    setIsExtracting(true);
    setError(null);
    setLines([]);
    setPageData([]);
    setPdfDoc(null);

    try {
      // ── TXT path ──────────────────────────────────────────────────────────
      if (file.type === 'text/plain') {
        setFileType('txt');
        const text = await file.text();
        const extracted = text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length >= 3);
        setLines(extracted);
        console.log('[StageAnchor] TXT lines extracted:', extracted.length);
        return;
      }

      // ── PDF path ──────────────────────────────────────────────────────────
      setFileType('pdf');
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = doc;
      setPdfDoc(doc);

      const allLines: string[] = [];
      const allPageData: PdfPageData[] = [];

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();

        // Group raw items by Y coordinate (rounded to 2px buckets) to form logical lines
        // We use a Map keyed by rounded-Y → array of raw items
        const itemsByY = new Map<number, {
          rawItems: Array<{ str: string; transform: number[]; width: number }>;
        }>();

        for (const rawItem of content.items) {
          // TextMarkedContent items don't have `str`
          if (!('str' in rawItem)) continue;
          const item = rawItem as { str: string; transform: number[]; width: number };
          if (!item.str.trim()) continue;

          const y = Math.round(item.transform[5] / 2) * 2;
          if (!itemsByY.has(y)) itemsByY.set(y, { rawItems: [] });
          itemsByY.get(y)!.rawItems.push({
            str: item.str,
            transform: Array.from(item.transform),
            width: item.width,
          });
        }

        // Sort Y descending — in PDF space, higher Y = closer to top of page
        const sortedYs = Array.from(itemsByY.keys()).sort((a, b) => b - a);

        const pageTextItems: TextItemData[] = [];

        for (const y of sortedYs) {
          const { rawItems } = itemsByY.get(y)!;
          const lineText = rawItems.map((i) => i.str).join(' ').trim();

          if (lineText.length >= 3) {
            const lineIndex = allLines.length;
            allLines.push(lineText);

            for (const ri of rawItems) {
              pageTextItems.push({
                str: ri.str,
                transform: ri.transform,
                width: ri.width,
                lineIndex,
              });
            }
          }
        }

        allPageData.push({ pageNum, textItems: pageTextItems });
      }

      if (allLines.length === 0) {
        setError(
          "No readable text found. Your PDF may contain scanned images. Please use an OCR'd PDF or export as TXT."
        );
        return;
      }

      console.log('[StageAnchor] PDF lines extracted:', allLines.length, '| Pages:', doc.numPages);
      setLines(allLines);
      setPageData(allPageData);
    } catch (err) {
      console.error('[StageAnchor] Extraction error:', err);
      setError('Failed to read the file. Please try a different PDF or TXT file.');
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return { lines, pageData, pdfDoc, fileType, isExtracting, error, extract, reset };
}
