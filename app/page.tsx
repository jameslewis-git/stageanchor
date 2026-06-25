'use client';

import { useState, useCallback, useEffect } from 'react';
import UploadScreen from '../components/UploadScreen';
import ScriptDisplay from '../components/ScriptDisplay';
import Toolbar from '../components/Toolbar';
import { usePdfExtractor } from '../hooks/usePdfExtractor';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useScriptTracker } from '../hooks/useScriptTracker';

const MIN_FONT = 14;
const MAX_FONT = 48;
const DEFAULT_FONT = 24;

export default function Home() {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const [appMode, setAppMode] = useState<'upload' | 'reading'>('upload');

  const { lines, isExtracting, error: extractError, extract, reset } = usePdfExtractor();
  const { isListening, transcript, error: micError, isSupported, start, stop } = useSpeechRecognition();
  const { currentLine, setCurrentLine, processTranscript } = useScriptTracker(lines);

  // Feed transcript into the tracker whenever it changes
  useEffect(() => {
    if (transcript && isListening) {
      processTranscript(transcript);
    }
  }, [transcript, isListening, processTranscript]);

  // Switch to reading mode after extraction completes
  useEffect(() => {
    if (lines.length > 0) {
      setAppMode('reading');
    }
  }, [lines]);

  const handleFile = useCallback(
    async (file: File) => {
      await extract(file);
    },
    [extract]
  );

  const handleBack = useCallback(() => {
    stop();
    reset();
    setAppMode('upload');
    setCurrentLine(0);
  }, [stop, reset, setCurrentLine]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  const handleFontSizeChange = useCallback((delta: number) => {
    setFontSize((prev) => Math.min(MAX_FONT, Math.max(MIN_FONT, prev + delta)));
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
            fontSize={fontSize}
            onFontSizeChange={handleFontSizeChange}
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
          <ScriptDisplay
            lines={lines}
            currentLine={currentLine}
            fontSize={fontSize}
            onLineClick={setCurrentLine}
          />
        </div>
      )}
    </main>
  );
}
