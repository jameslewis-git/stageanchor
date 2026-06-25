'use client';

interface ToolbarProps {
  fontSize: number;
  onFontSizeChange: (delta: number) => void;
  isListening: boolean;
  onMicToggle: () => void;
  transcript: string;
  currentLine: number;
  totalLines: number;
  onBack: () => void;
  micError: string | null;
}

export default function Toolbar({
  fontSize,
  onFontSizeChange,
  isListening,
  onMicToggle,
  transcript,
  currentLine,
  totalLines,
  onBack,
  micError,
}: ToolbarProps) {
  const progress = totalLines > 0 ? Math.round(((currentLine + 1) / totalLines) * 100) : 0;

  return (
    <div className="toolbar">
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
      </div>

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

      <div className="toolbar-right">
        <div className="progress-info">
          <span className="progress-text">
            {currentLine + 1} / {totalLines}
          </span>
          <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

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
