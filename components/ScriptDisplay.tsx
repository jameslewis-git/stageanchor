'use client';

import { useEffect, useRef } from 'react';
import ScriptLine from './ScriptLine';

interface ScriptDisplayProps {
  lines: string[];
  currentLine: number;
  fontSize: number;
  onLineClick: (index: number) => void;
}

export default function ScriptDisplay({
  lines,
  currentLine,
  fontSize,
  onLineClick,
}: ScriptDisplayProps) {
  const currentLineRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to current line whenever it changes
  useEffect(() => {
    if (currentLineRef.current) {
      currentLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLine]);

  return (
    <div className="script-display" role="main" aria-label="Script content">
      {lines.map((text, index) => {
        const state =
          index === currentLine ? 'current' : index < currentLine ? 'past' : 'upcoming';
        return (
          <div
            key={index}
            ref={index === currentLine ? currentLineRef : null}
          >
            <ScriptLine
              text={text}
              state={state}
              fontSize={fontSize}
              onClick={() => onLineClick(index)}
            />
          </div>
        );
      })}
    </div>
  );
}
