'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfPageData, ScrollMode } from '../types';

// ---------------------------------------------------------------------------
// Utility: multiply two PDF affine transform matrices [a,b,c,d,e,f]
// This is the same as PDF.js's Util.transform()
// ---------------------------------------------------------------------------
function applyTransform(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

// Toggle the 'highlighted' class on all .pdf-span elements inside a wrapper
function applyHighlights(wrapper: HTMLElement, currentLine: number) {
  wrapper.querySelectorAll<HTMLSpanElement>('.pdf-span').forEach((span) => {
    const li = parseInt(span.dataset.lineIndex ?? '-1', 10);
    span.classList.toggle('highlighted', li === currentLine);
  });
}

// ---------------------------------------------------------------------------
// PageRenderer — renders a single PDF page (canvas + text layer)
// ---------------------------------------------------------------------------
interface PageRendererProps {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  pageItems: PdfPageData['textItems'];
  currentLine: number;
  zoom: number;
  onLineClick: (line: number) => void;
}

function PageRenderer({
  pdfDoc,
  pageNum,
  pageItems,
  currentLine,
  zoom,
  onLineClick,
}: PageRendererProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  // Ref so the render effect can read currentLine without declaring it as a dep
  const currentLineRef = useRef(currentLine);
  currentLineRef.current = currentLine;

  // ── Canvas + text layer render ──────────────────────────────────────────
  // Does NOT depend on currentLine — only re-runs when zoom or page content changes
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const renderId = ++renderIdRef.current;

    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      if (renderId !== renderIdRef.current) return; // cancelled by zoom change etc.

      const viewport = page.getViewport({ scale: zoom });
      const w = Math.floor(viewport.width);
      const h = Math.floor(viewport.height);

      // ── Canvas ────────────────────────────────────────────────────────
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderTask = page.render({ canvas, canvasContext: ctx, viewport });
      await renderTask.promise;
      if (renderId !== renderIdRef.current) return;

      // ── Text layer ────────────────────────────────────────────────────
      const textLayer = document.createElement('div');
      textLayer.className = 'pdf-text-layer';
      textLayer.style.width = `${w}px`;
      textLayer.style.height = `${h}px`;

      for (const item of pageItems) {
        if (!item.str.trim()) continue;

        // Map item's PDF transform to viewport (screen) coordinates
        const tx = applyTransform(viewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5];
        // Font height in screen pixels: magnitude of the y-scale column of tx
        const fontHeight = Math.sqrt(tx[2] ** 2 + tx[3] ** 2);
        if (fontHeight <= 0) continue;

        const span = document.createElement('span');
        span.textContent = item.str;
        span.dataset.lineIndex = String(item.lineIndex);
        span.className = 'pdf-span';

        // Position: (x, y) is the text baseline in screen space.
        // CSS top is from the top of the element, so subtract font height.
        span.style.left = `${x}px`;
        span.style.top = `${y - fontHeight}px`;
        span.style.fontSize = `${fontHeight}px`;
        span.style.whiteSpace = 'pre';

        // Capture for closure
        const capturedLineIndex = item.lineIndex;
        span.addEventListener('click', () => onLineClick(capturedLineIndex));
        textLayer.appendChild(span);
      }

      // Swap content
      wrapper.style.width = `${w}px`;
      wrapper.style.height = `${h}px`;
      wrapper.innerHTML = '';
      wrapper.appendChild(canvas);
      wrapper.appendChild(textLayer);

      // Apply highlights for current line after render completes
      applyHighlights(wrapper, currentLineRef.current);
    })().catch(console.error);

    return () => {
      // Invalidate any in-flight render
      renderIdRef.current++;
    };
  }, [pdfDoc, pageNum, pageItems, zoom, onLineClick]);

  // ── Highlight update (cheap DOM toggle, no canvas re-render) ────────────
  useEffect(() => {
    if (wrapperRef.current) applyHighlights(wrapperRef.current, currentLine);
  }, [currentLine]);

  return <div ref={wrapperRef} className="pdf-page-wrapper" />;
}

// ---------------------------------------------------------------------------
// PdfViewer — main export
// ---------------------------------------------------------------------------
interface PdfViewerProps {
  pdfDoc: PDFDocumentProxy;
  pageData: PdfPageData[];
  currentLine: number;
  zoom: number;
  scrollMode: ScrollMode;
  onLineClick: (line: number) => void;
}

export default function PdfViewer({
  pdfDoc,
  pageData,
  currentLine,
  zoom,
  scrollMode,
  onLineClick,
}: PdfViewerProps) {
  const numPages = pdfDoc.numPages;
  const [visiblePage, setVisiblePage] = useState(1);

  // Which page contains the currently matched line?
  const currentLinePage = useMemo(() => {
    for (const page of pageData) {
      if (page.textItems.some((item) => item.lineIndex === currentLine)) {
        return page.pageNum;
      }
    }
    return 1;
  }, [pageData, currentLine]);

  // Auto-navigate when currentLine changes
  useEffect(() => {
    if (scrollMode === 'page') {
      // Jump to the page containing the match
      setVisiblePage(currentLinePage);
    } else {
      // Continuous: smooth-scroll to the highlighted span
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('.pdf-span.highlighted');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [currentLine, scrollMode, currentLinePage]);

  // ── Page-by-page mode ────────────────────────────────────────────────────
  if (scrollMode === 'page') {
    return (
      <div className="pdf-viewer pdf-viewer--page">
        <div className="pdf-page-nav">
          <button
            className="pdf-nav-btn"
            onClick={() => setVisiblePage((p) => Math.max(1, p - 1))}
            disabled={visiblePage <= 1}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>
          <span className="pdf-page-indicator">
            Page {visiblePage} of {numPages}
          </span>
          <button
            className="pdf-nav-btn"
            onClick={() => setVisiblePage((p) => Math.min(numPages, p + 1))}
            disabled={visiblePage >= numPages}
            aria-label="Next page"
          >
            Next ›
          </button>
        </div>
        <div className="pdf-page-scroll">
          <PageRenderer
            key={`${visiblePage}-${zoom}`}
            pdfDoc={pdfDoc}
            pageNum={visiblePage}
            pageItems={pageData.find((p) => p.pageNum === visiblePage)?.textItems ?? []}
            currentLine={currentLine}
            zoom={zoom}
            onLineClick={onLineClick}
          />
        </div>
      </div>
    );
  }

  // ── Continuous scroll mode ───────────────────────────────────────────────
  return (
    <div className="pdf-viewer pdf-viewer--continuous">
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
        <div key={pageNum} className="pdf-page-container">
          <div className="pdf-page-number">Page {pageNum}</div>
          <PageRenderer
            pdfDoc={pdfDoc}
            pageNum={pageNum}
            pageItems={pageData.find((p) => p.pageNum === pageNum)?.textItems ?? []}
            currentLine={currentLine}
            zoom={zoom}
            onLineClick={onLineClick}
          />
        </div>
      ))}
    </div>
  );
}
