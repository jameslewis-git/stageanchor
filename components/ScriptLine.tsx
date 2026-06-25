'use client';

interface ScriptLineProps {
  text: string;
  state: 'current' | 'past' | 'upcoming';
  fontSize: number;
  onClick: () => void;
}

export default function ScriptLine({ text, state, fontSize, onClick }: ScriptLineProps) {
  return (
    <div
      className={`script-line script-line--${state}`}
      style={{ fontSize: `${fontSize}px` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Line: ${text}`}
      aria-current={state === 'current' ? 'true' : undefined}
    >
      {state === 'current' && <span className="line-indicator" aria-hidden="true" />}
      <span className="line-text">{text}</span>
    </div>
  );
}
