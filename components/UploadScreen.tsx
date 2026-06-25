'use client';

import { useCallback, useRef } from 'react';

interface UploadScreenProps {
  onFile: (file: File) => void;
  isExtracting: boolean;
  isSupported: boolean;
}

export default function UploadScreen({ onFile, isExtracting, isSupported }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type === 'application/pdf' || file.type === 'text/plain') {
        onFile(file);
      }
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="upload-screen">
      <div className="upload-hero">
        <div className="upload-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="url(#grad)" />
            <path d="M14 34V20l10-8 10 8v14H14z" stroke="white" strokeWidth="2" fill="none" />
            <path d="M20 34v-8h8v8" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="24" cy="14" r="2" fill="white" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="upload-title">Stage Anchor</h1>
        <p className="upload-subtitle">Voice-tracked script reader for stage performances</p>
      </div>

      {!isSupported && (
        <div className="browser-warning">
          <span className="warning-icon">⚠️</span>
          <div>
            <strong>Browser not supported</strong>
            <p>Web Speech API requires Chrome, Edge, or Safari (iOS 14.5+). Firefox is not supported.</p>
          </div>
        </div>
      )}

      <div
        className={`drop-zone ${isExtracting ? 'drop-zone--extracting' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !isExtracting && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF or TXT script file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleChange}
          style={{ display: 'none' }}
          id="file-input"
        />

        {isExtracting ? (
          <div className="extracting-state">
            <div className="spinner" />
            <p>Reading your script…</p>
          </div>
        ) : (
          <div className="drop-content">
            <div className="drop-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M20 28V12M12 20l8-8 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 32h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="drop-main">Drop your script here</p>
            <p className="drop-sub">or click to browse — PDF or TXT</p>
          </div>
        )}
      </div>

      <div className="upload-features">
        <div className="feature">
          <span className="feature-icon">🎙️</span>
          <span>Mic listens continuously</span>
        </div>
        <div className="feature">
          <span className="feature-icon">🎯</span>
          <span>Auto-highlights current line</span>
        </div>
        <div className="feature">
          <span className="feature-icon">⏸️</span>
          <span>Holds position on pauses</span>
        </div>
      </div>
    </div>
  );
}
