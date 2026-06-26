'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { findBestMatch } from '../utils/fuzzyMatch';

interface UseScriptTrackerReturn {
  currentLine: number;
  setCurrentLine: (line: number) => void;
  processTranscript: (transcript: string) => void;
}

export function useScriptTracker(lines: string[]): UseScriptTrackerReturn {
  const [currentLine, setCurrentLine] = useState(0);
  const currentLineRef = useRef(0);
  const lastTranscriptRef = useRef('');

  // Keep ref in sync with state for use inside callbacks
  useEffect(() => {
    currentLineRef.current = currentLine;
  }, [currentLine]);

  const processTranscript = useCallback(
    (transcript: string) => {
      if (!lines.length || transcript === lastTranscriptRef.current) return;
      lastTranscriptRef.current = transcript;

      const match = findBestMatch(transcript, lines, currentLineRef.current);
      console.log(
        `[StageAnchor] transcript="${transcript.slice(0, 60)}" → match=${match} (current=${currentLineRef.current})`
      );
      if (match !== -1 && match !== currentLineRef.current) {
        console.log(`[StageAnchor] ✅ Advancing to line ${match}: "${lines[match].slice(0, 60)}"`);
        currentLineRef.current = match;
        setCurrentLine(match);
      } else if (match === -1) {
        console.log(`[StageAnchor] ❌ No match found. Line ${currentLineRef.current} held.`);
      }
    },
    [lines]
  );

  const handleSetCurrentLine = useCallback((line: number) => {
    currentLineRef.current = line;
    setCurrentLine(line);
  }, []);

  return { currentLine, setCurrentLine: handleSetCurrentLine, processTranscript };
}
