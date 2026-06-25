'use client';

import type { FileType, ScrollMode } from '../types';

interface ToolbarProps {
  fileType: FileType;
  // TXT mode controls
  fontSize: number;
  onFontSizeChange: (delta: number) => void;
  // PDF mode controls
  pdfZoom: number;
  onPdfZoomChange: (delta: number) => void;
  scrollMode: ScrollMode;
  onScrollModeChange: (mode: ScrollMode) => void;
  // Shared
  isListening: boolean;
  onMicToggle: () => void;
  transcript: string;
  currentLine: number;
  totalLines: number;
  onBack: () => void;
  micError: string | null;
}

export default function Toolbar({
  fileType,
  fontSize,
  onFontSizeChange,
  pdfZoom,
  onPdfZoomChange,
  scrollMode,
  onScrollModeChange,
  isListening,
  onMicToggle,
  transcript,
  currentLine,
  totalLines,
  onBack,
  micError,
}: ToolbarProps) {
  const progress = totalLines > 0 ? Math.round(((currentLine + 1) / totalLines) * 100) : 0;
  const isPdf = fileType === 'pdf';

  return (
    <div className="toolbar">
      {/* ── Left: back + size/zoom controls ── */}
      <div className="toolbar-left">
        <button
          className="toolbar-btn toolbar-btn--back"
          onClick={onBack}
          aria-label="Back to upload"
          title="Back to upload"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isPdf ? (
          /* PDF mode: zoom controls + scroll mode toggle */
          <div className="toolbar-controls-group">
            <div className="font-controls" aria-label="Zoom controls">
              <button
                className="toolbar-btn"
                onClick={() => onPdfZoomChange(-0.25)}
                aria-label="Zoom out"
                title="Zoom out"
              >
                −
              </button>
              <span className="font-size-display">{Math.round(pdfZoom * 100)}%</span>
              <button
                className="toolbar-btn"
                onClick={() => onPdfZoomChange(0.25)}
                aria-label="Zoom in"
                title="Zoom in"
              >
                +
              </button>
            </div>

            <div className="scroll-mode-toggle" role="group" aria-label="Scroll mode">
              <button
                className={`scroll-mode-btn ${scrollMode === 'continuous' ? 'scroll-mode-btn--active' : ''}`}
                onClick={() => onScrollModeChange('continuous')}
                title="Continuous scroll"
                aria-label="Continuous scroll mode"
                aria-pressed={scrollMode === 'continuous'}
              >
                {/* Continuous scroll icon */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="3" rx="1" fill="currentColor" />
                  <rect x="2" y="7" width="12" height="3" rx="1" fill="currentColor" />
                  <rect x="2" y="12" width="8" height="2" rx="1" fill="currentColor" opacity="0.5" />
                </svg>
              </button>
              <button
                className={`scroll-mode-btn ${scrollMode === 'page' ? 'scroll-mode-btn--active' : ''}`}
                onClick={() => onScrollModeChange('page')}
                title="Page by page"
                aria-label="Page-by-page mode"
                aria-pressed={scrollMode === 'page'}
              >
                {/* Single page icon */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <rect x="5" y="4" width="6" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="5" y="7" width="6" height="1.5" rx="0.5" fill="currentColor" />
                  <rect x="5" y="10" width="4" height="1.5" rx="0.5" fill="currentColor" opacity="0.5" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* TXT mode: font size controls */
          <div className="font-controls" aria-label="Font size controls">
            <button
              className="toolbar-btn"
              onClick={() => onFontSizeChange(-2)}
              aria-label="Decrease font size"
              title="Smaller text"
            >
              A−
            </button>
            <span className="font-size-display">{fontSize}px</span>
            <button
              className="toolbar-btn"
              onClick={() => onFontSizeChange(2)}
              aria-label="Increase font size"
              title="Larger text"
            >
              A+
            </button>
          </div>
        )}
      </div>

      {/* ── Center: mic button ── */}
      <div className="toolbar-center">
        <button
          id="mic-toggle"
          className={`mic-btn ${isListening ? 'mic-btn--active' : ''}`}
          onClick={onMicToggle}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
          title={isListening ? 'Stop mic' : 'Start mic'}
        >
          <span className={`mic-dot ${isListening ? 'mic-dot--pulsing' : ''}`} />
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="7" y="2" width="6" height="10" rx="3" fill="currentColor" />
            <path d="M4 10a6 6 0 0012 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <line x1="10" y1="16" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="7" y1="19" x2="13" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="mic-label">{isListening ? 'Listening' : 'Mic off'}</span>
        </button>
      </div>

      {/* ── Right: progress ── */}
      <div className="toolbar-right">
        <div className="progress-info">
          <span className="progress-text">
            {currentLine + 1} / {totalLines}
          </span>
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* ── Heard strip (debug) ── */}
      {(transcript || micError) && (
        <div className="heard-strip">
          {micError ? (
            <span className="heard-error">⚠️ {micError}</span>
          ) : (
            <span className="heard-text">🎙 {transcript}</span>
          )}
        </div>
      )}
    </div>
  );
}
