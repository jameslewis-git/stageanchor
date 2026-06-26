'use client';

import { useState, useCallback, useEffect } from 'react';
import UploadScreen from '../components/UploadScreen';
import ScriptDisplay from '../components/ScriptDisplay';
import PdfViewer from '../components/PdfViewer';
import Toolbar, { HIGHLIGHT_PRESETS } from '../components/Toolbar';
import type { HighlightPreset } from '../components/Toolbar';
import { usePdfExtractor } from '../hooks/usePdfExtractor';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useScriptTracker } from '../hooks/useScriptTracker';
import type { ScrollMode } from '../types';

const MIN_FONT = 14;
const MAX_FONT = 48;
const DEFAULT_FONT = 24;
const DEFAULT_PDF_ZOOM = 1.5;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;

export default function Home() {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const [pdfZoom, setPdfZoom] = useState(DEFAULT_PDF_ZOOM);
  const [scrollMode, setScrollMode] = useState<ScrollMode>('continuous');
  const [appMode, setAppMode] = useState<'upload' | 'reading'>('upload');
  const [highlightPreset, setHighlightPreset] = useState(HIGHLIGHT_PRESETS[0]);

  const {
    lines,
    pageData,
    pdfDoc,
    fileType,
    isExtracting,
    error: extractError,
    extract,
    reset,
  } = usePdfExtractor();

  const {
    isListening,
    transcript,
    error: micError,
    isSupported,
    start,
    stop,
  } = useSpeechRecognition();

  const { currentLine, setCurrentLine, processTranscript } = useScriptTracker(lines);

  // Feed transcript to fuzzy matcher while mic is active
  useEffect(() => {
    if (transcript && isListening) processTranscript(transcript);
  }, [transcript, isListening, processTranscript]);

  // Transition to reading mode once extraction completes
  useEffect(() => {
    if (lines.length > 0) setAppMode('reading');
  }, [lines]);

  const handleFile = useCallback(
    async (file: File) => { await extract(file); },
    [extract]
  );

  const handleBack = useCallback(() => {
    stop();
    reset();
    setAppMode('upload');
    setCurrentLine(0);
  }, [stop, reset, setCurrentLine]);

  const handleMicToggle = useCallback(() => {
    if (isListening) stop(); else start();
  }, [isListening, start, stop]);

  const handleFontSizeChange = useCallback((delta: number) => {
    setFontSize((prev) => Math.min(MAX_FONT, Math.max(MIN_FONT, prev + delta)));
  }, []);

  const handlePdfZoomChange = useCallback((delta: number) => {
    setPdfZoom((prev) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((prev + delta) * 100) / 100))
    );
  }, []);

  const handleHighlightChange = useCallback((preset: HighlightPreset) => {
    setHighlightPreset(preset);
  }, []);

  return (
    <main className="app-root">
      {appMode === 'upload' ? (
        <UploadScreen
          onFile={handleFile}
          isExtracting={isExtracting}
          isSupported={isSupported}
        />
      ) : (
        <div className="reader-layout">
          <Toolbar
            fileType={fileType}
            fontSize={fontSize}
            onFontSizeChange={handleFontSizeChange}
            pdfZoom={pdfZoom}
            onPdfZoomChange={handlePdfZoomChange}
            scrollMode={scrollMode}
            onScrollModeChange={setScrollMode}
            highlightPresetId={highlightPreset.id}
            onHighlightChange={handleHighlightChange}
            isListening={isListening}
            onMicToggle={handleMicToggle}
            transcript={transcript}
            currentLine={currentLine}
            totalLines={lines.length}
            onBack={handleBack}
            micError={micError}
          />
          {extractError && (
            <div className="extract-error" role="alert">
              ⚠️ {extractError}
            </div>
          )}
          {fileType === 'pdf' && pdfDoc ? (
            <PdfViewer
              pdfDoc={pdfDoc}
              pageData={pageData}
              currentLine={currentLine}
              zoom={pdfZoom}
              scrollMode={scrollMode}
              highlightColor={highlightPreset.color}
              onLineClick={setCurrentLine}
            />
          ) : (
            <ScriptDisplay
              lines={lines}
              currentLine={currentLine}
              fontSize={fontSize}
              onLineClick={setCurrentLine}
            />
          )}
        </div>
      )}
    </main>
  );
}
