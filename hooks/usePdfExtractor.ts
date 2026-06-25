'use client';

import { useState, useCallback } from 'react';

interface UsePdfExtractorReturn {
  lines: string[];
  isExtracting: boolean;
  error: string | null;
  extract: (file: File) => Promise<void>;
  reset: () => void;
}

export function usePdfExtractor(): UsePdfExtractorReturn {
  const [lines, setLines] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setLines([]);
    setError(null);
    setIsExtracting(false);
  }, []);

  const extract = useCallback(async (file: File) => {
    setIsExtracting(true);
    setError(null);
    setLines([]);

    try {
      if (file.type === 'text/plain') {
        // TXT path — read directly
        const text = await file.text();
        const extracted = text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length >= 3);
        setLines(extracted);
        console.log('[StageAnchor] TXT lines extracted:', extracted.length);
        return;
      }

      // PDF path — dynamically import PDF.js to avoid SSR issues
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      const allLines: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();

        // Group items into lines by their vertical position (y coordinate)
        const itemsByY = new Map<number, string[]>();
        for (const item of content.items) {
          if (!('str' in item)) continue;
          const str = item.str.trim();
          if (!str) continue;
          // Round y to nearest 2px to group items on the same visual line
          const y = Math.round((item as { transform: number[] }).transform[5] / 2) * 2;
          if (!itemsByY.has(y)) itemsByY.set(y, []);
          itemsByY.get(y)!.push(str);
        }

        // Sort by descending y (top of page first in PDF coord space)
        const sortedYs = Array.from(itemsByY.keys()).sort((a, b) => b - a);
        for (const y of sortedYs) {
          const lineText = itemsByY.get(y)!.join(' ').trim();
          if (lineText.length >= 3) {
            allLines.push(lineText);
          }
        }
      }

      if (allLines.length === 0) {
        setError(
          'No readable text found. Your PDF may contain scanned images. Please use an OCR\'d PDF or export as TXT.'
        );
        return;
      }

      console.log('[StageAnchor] PDF lines extracted:', allLines.length);
      setLines(allLines);
    } catch (err) {
      console.error('[StageAnchor] Extraction error:', err);
      setError('Failed to read the file. Please try a different PDF or TXT file.');
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return { lines, isExtracting, error, extract, reset };
}
