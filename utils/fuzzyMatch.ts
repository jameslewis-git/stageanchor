import { normalize } from './textNormalize';

/**
 * Returns true if enough significant spoken words appear in the script line.
 * "Significant" = longer than 3 chars (filters out "a", "the", "is", etc.)
 * Threshold: ≥40% of significant spoken words must match, minimum 1.
 */
export function wordsMatch(spoken: string, line: string): boolean {
  const spokenWords = normalize(spoken).split(' ');
  const lineNorm = normalize(line);
  const significantWords = spokenWords.filter((w) => w.length > 3);
  if (significantWords.length === 0) return false;
  const matchCount = significantWords.filter((w) => lineNorm.includes(w)).length;
  return matchCount >= Math.max(1, Math.floor(significantWords.length * 0.4));
}

/**
 * Searches a bounded window around currentLine for the best matching line.
 * - First pass: 1 line behind → 10 lines ahead (cheap, handles normal flow)
 * - Second pass: 3 behind → 20 ahead (handles skips / ad-libs)
 * - Returns -1 if no match found (hold last position)
 */
export function findBestMatch(
  transcript: string,
  lines: string[],
  currentLine: number
): number {
  const search = (start: number, end: number): number => {
    for (let i = start; i <= end; i++) {
      if (wordsMatch(transcript, lines[i])) return i;
    }
    return -1;
  };

  // Narrow pass
  const narrowResult = search(
    Math.max(0, currentLine - 1),
    Math.min(lines.length - 1, currentLine + 10)
  );
  if (narrowResult !== -1) return narrowResult;

  // Wide fallback
  return search(
    Math.max(0, currentLine - 3),
    Math.min(lines.length - 1, currentLine + 20)
  );
}
