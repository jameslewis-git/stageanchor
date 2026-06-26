'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfPageData, ScrollMode } from '../types';

// ---------------------------------------------------------------------------
// Utility: multiply two PDF affine matrices [a,b,c,d,e,f]
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

// ---------------------------------------------------------------------------
// Apply / remove the 'highlighted' class on all matching spans
// ---------------------------------------------------------------------------
function applyHighlights(wrapper: HTMLElement, currentLine: number) {
  const spans = wrapper.querySelectorAll<HTMLSpanElement>('.pdf-hl-span');
  let count = 0;
  spans.forEach((span) => {
    const li = parseInt(span.dataset.lineIndex ?? '-1', 10);
    const active = li === currentLine;
    span.classList.toggle('highlighted', active);
    if (active) count++;
  });
  if (count > 0) {
    console.log(`[PdfViewer] ✅ Highlighted ${count} span(s) for line ${currentLine}`);
  }
}

// ---------------------------------------------------------------------------
// PageRenderer — single PDF page: canvas + invisible text overlay
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
  const currentLineRef = useRef(currentLine);
  currentLineRef.current = currentLine;

  // ── Canvas + text overlay render ──────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const renderId = ++renderIdRef.current;

    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      if (renderId !== renderIdRef.current) return;

      // ── DPR-aware canvas: crisp on Retina / mobile ────────────────────
      const dpr = window.devicePixelRatio || 1;
      const cssViewport = page.getViewport({ scale: zoom });
      const physViewport = page.getViewport({ scale: zoom * dpr });
      const cssW = Math.floor(cssViewport.width);
      const cssH = Math.floor(cssViewport.height);

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(physViewport.width);   // physical px (crisp)
      canvas.height = Math.floor(physViewport.height);
      canvas.style.width = `${cssW}px`;                // CSS display size
      canvas.style.height = `${cssH}px`;
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({ canvas, canvasContext: ctx, viewport: physViewport }).promise;
      if (renderId !== renderIdRef.current) return;

      // ── Transparent text overlay ──────────────────────────────────────
      // Each span is an invisible rectangle positioned exactly over a piece
      // of PDF text. When highlighted it gets a coloured background
      // (like a physical highlighter pen).
      const textLayer = document.createElement('div');
      textLayer.className = 'pdf-text-layer';

      let spanCount = 0;
      for (const item of pageItems) {
        if (!item.str.trim()) continue;

        // Map PDF coordinates → CSS pixel coordinates
        const tx = applyTransform(cssViewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5]; // baseline in CSS pixels

        // Font height = magnitude of the y-scale column of the transformed matrix
        const fontHeight = Math.sqrt(tx[2] ** 2 + tx[3] ** 2);
        if (fontHeight < 1) continue;

        const span = document.createElement('span');
        span.dataset.lineIndex = String(item.lineIndex);
        span.className = 'pdf-hl-span';
        span.textContent = item.str;

        // Position: top-left of the text bounding box
        span.style.left = `${x}px`;
        span.style.top = `${y - fontHeight}px`;

        // Explicit width from PDF (item.width is in PDF user units)
        // This ensures the highlight covers exactly the text — no browser-
        // font-rendering discrepancy.
        span.style.width = `${Math.max(1, item.width * cssViewport.scale)}px`;

        // Height covers the character body
        span.style.height = `${Math.max(1, fontHeight * 1.15)}px`;
        
        // Ensure block display so width/height are respected
        span.style.display = 'block';
        span.style.fontSize = `${fontHeight}px`;
        span.style.lineHeight = '1';

        const capturedLi = item.lineIndex;
        span.addEventListener('click', () => onLineClick(capturedLi));
        textLayer.appendChild(span);
        spanCount++;
      }

      console.log(`[PdfViewer] Page ${pageNum}: ${spanCount} text spans created`);

      // ── Commit to DOM ─────────────────────────────────────────────────
      wrapper.style.width = `${cssW}px`;
      wrapper.style.height = `${cssH}px`;
      wrapper.innerHTML = '';
      wrapper.appendChild(canvas);
      wrapper.appendChild(textLayer);

      // Re-apply highlights (the highlight effect ran before this async
      // render finished, so we repeat it now that spans exist)
      applyHighlights(wrapper, currentLineRef.current);
    })().catch(console.error);

    return () => { renderIdRef.current++; };
  }, [pdfDoc, pageNum, pageItems, zoom, onLineClick]);

  // ── Cheap highlight-only update (no canvas re-render) ─────────────────────
  useEffect(() => {
    if (wrapperRef.current) applyHighlights(wrapperRef.current, currentLine);
  }, [currentLine]);

  return <div ref={wrapperRef} className="pdf-page-wrapper" />;
}

// ---------------------------------------------------------------------------
// PdfViewer — export
// ---------------------------------------------------------------------------
interface PdfViewerProps {
  pdfDoc: PDFDocumentProxy;
  pageData: PdfPageData[];
  currentLine: number;
  zoom: number;
  scrollMode: ScrollMode;
  highlightColor: string;
  onLineClick: (line: number) => void;
}

export default function PdfViewer({
  pdfDoc,
  pageData,
  currentLine,
  zoom,
  scrollMode,
  highlightColor,
  onLineClick,
}: PdfViewerProps) {
  const numPages = pdfDoc.numPages;
  const [visiblePage, setVisiblePage] = useState(1);

  const currentLinePage = useMemo(() => {
    for (const page of pageData) {
      if (page.textItems.some((item) => item.lineIndex === currentLine)) {
        return page.pageNum;
      }
    }
    return 1;
  }, [pageData, currentLine]);

  useEffect(() => {
    if (scrollMode === 'page') {
      setVisiblePage(currentLinePage);
    } else {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('.pdf-hl-span.highlighted');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [currentLine, scrollMode, currentLinePage]);

  // ── Page-by-page ───────────────────────────────────────────────────────────
  if (scrollMode === 'page') {
    return (
      <div
        className="pdf-viewer pdf-viewer--page"
        style={{ '--hl-color': highlightColor } as React.CSSProperties}
      >
        <div className="pdf-page-nav">
          <button
            className="pdf-nav-btn"
            onClick={() => setVisiblePage((p) => Math.max(1, p - 1))}
            disabled={visiblePage <= 1}
          >‹ Prev</button>
          <span className="pdf-page-indicator">
            Page {visiblePage} of {numPages}
          </span>
          <button
            className="pdf-nav-btn"
            onClick={() => setVisiblePage((p) => Math.min(numPages, p + 1))}
            disabled={visiblePage >= numPages}
          >Next ›</button>
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

  // ── Continuous scroll ───────────────────────────────────────────────────────
  return (
    <div
      className="pdf-viewer pdf-viewer--continuous"
      style={{ '--hl-color': highlightColor } as React.CSSProperties}
    >
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
