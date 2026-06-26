'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PdfPageData, ScrollMode } from '../types';

// ---------------------------------------------------------------------------
// Utility: multiply two PDF affine transform matrices [a,b,c,d,e,f]
// Equivalent to PDF.js's Util.transform()
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

// Toggle 'highlighted' class on all .pdf-span elements inside a wrapper
function applyHighlights(wrapper: HTMLElement, currentLine: number) {
  const spans = wrapper.querySelectorAll<HTMLSpanElement>('.pdf-span');
  let count = 0;
  spans.forEach((span) => {
    const li = parseInt(span.dataset.lineIndex ?? '-1', 10);
    const active = li === currentLine;
    span.classList.toggle('highlighted', active);
    if (active) count++;
  });
  if (count > 0) {
    console.log(`[PdfViewer] Highlighted ${count} span(s) for line ${currentLine}`);
  }
}

// ---------------------------------------------------------------------------
// PageRenderer — renders a single PDF page: canvas (visual) + text layer (overlay)
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
  // Always-current reference so the render effect can read currentLine
  // without declaring it as a dependency (which would trigger canvas re-renders)
  const currentLineRef = useRef(currentLine);
  currentLineRef.current = currentLine;

  // ── Canvas + text layer render ─────────────────────────────────────────
  // Depends on pdfDoc / pageNum / zoom / pageItems — NOT currentLine
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const renderId = ++renderIdRef.current;

    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      if (renderId !== renderIdRef.current) return; // zoom changed while loading

      // ── DPR-aware rendering ──────────────────────────────────────────
      // On high-DPI screens (phones, Retina) devicePixelRatio is 2–3.
      // We render the canvas at physical-pixel resolution but display it
      // at CSS-pixel size — this prevents the blurry PDF on mobile.
      const dpr = window.devicePixelRatio || 1;

      // CSS-pixel viewport: used for layout and text layer positioning
      const cssViewport = page.getViewport({ scale: zoom });
      // Physical-pixel viewport: used for the actual canvas render
      const physViewport = page.getViewport({ scale: zoom * dpr });

      const cssW = Math.floor(cssViewport.width);
      const cssH = Math.floor(cssViewport.height);
      const physW = Math.floor(physViewport.width);
      const physH = Math.floor(physViewport.height);

      // ── Canvas at full physical resolution ───────────────────────────
      const canvas = document.createElement('canvas');
      canvas.width = physW;          // physical pixels (crisp on retina)
      canvas.height = physH;
      canvas.style.width = `${cssW}px`;   // CSS display size
      canvas.style.height = `${cssH}px`;
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Render at physical-pixel resolution using physViewport
      const renderTask = page.render({ canvas, canvasContext: ctx, viewport: physViewport });
      await renderTask.promise;
      if (renderId !== renderIdRef.current) return;

      // ── Text layer positioned in CSS pixels ─────────────────────────
      // Spans are transparent overlays — they show only the highlight
      // colour, never a duplicate text rendering over the canvas.
      const textLayer = document.createElement('div');
      textLayer.className = 'pdf-text-layer';
      textLayer.style.width = `${cssW}px`;
      textLayer.style.height = `${cssH}px`;

      let spanCount = 0;
      for (const item of pageItems) {
        if (!item.str.trim()) continue;

        // Map text item position from PDF space → CSS pixel space
        // using the cssViewport transform (NOT the physViewport)
        const tx = applyTransform(cssViewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5];
        // Font height = magnitude of the y-scale column of the transformed matrix
        const fontHeight = Math.sqrt(tx[2] ** 2 + tx[3] ** 2);
        if (fontHeight <= 0) continue;

        const span = document.createElement('span');
        span.textContent = item.str;
        span.dataset.lineIndex = String(item.lineIndex);
        span.className = 'pdf-span';

        // (x, y) is the text baseline in CSS pixels; top = baseline − font height
        span.style.left = `${x}px`;
        span.style.top = `${y - fontHeight}px`;
        span.style.fontSize = `${fontHeight}px`;
        span.style.whiteSpace = 'pre';

        const capturedIndex = item.lineIndex;
        span.addEventListener('click', () => onLineClick(capturedIndex));
        textLayer.appendChild(span);
        spanCount++;
      }

      console.log(`[PdfViewer] Page ${pageNum}: rendered ${spanCount} text spans`);

      // Swap content
      wrapper.style.width = `${cssW}px`;
      wrapper.style.height = `${cssH}px`;
      wrapper.innerHTML = '';
      wrapper.appendChild(canvas);
      wrapper.appendChild(textLayer);

      // Apply current highlights after render (the highlight effect already ran
      // before this async render finished, so we reapply here)
      applyHighlights(wrapper, currentLineRef.current);
    })().catch(console.error);

    return () => {
      // Invalidate any in-progress render when deps change
      renderIdRef.current++;
    };
  }, [pdfDoc, pageNum, pageItems, zoom, onLineClick]);

  // ── Cheap highlight update — no canvas re-render ───────────────────────
  useEffect(() => {
    if (wrapperRef.current) {
      applyHighlights(wrapperRef.current, currentLine);
    }
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

  // Identify which page contains the currently highlighted line
  const currentLinePage = useMemo(() => {
    for (const page of pageData) {
      if (page.textItems.some((item) => item.lineIndex === currentLine)) {
        return page.pageNum;
      }
    }
    return 1;
  }, [pageData, currentLine]);

  // Auto-navigate / scroll when voice match advances the current line
  useEffect(() => {
    if (scrollMode === 'page') {
      setVisiblePage(currentLinePage);
    } else {
      // Give the highlight effect time to fire before we scroll
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('.pdf-span.highlighted');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }, [currentLine, scrollMode, currentLinePage]);

  // ── Page-by-page mode ──────────────────────────────────────────────────
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

  // ── Continuous scroll mode ─────────────────────────────────────────────
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
