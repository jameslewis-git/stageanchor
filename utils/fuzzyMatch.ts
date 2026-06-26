import { normalize } from './textNormalize';

/**
 * Scores how well a spoken phrase matches a script line.
 * Returns 0.0 (no match) to 1.0 (perfect match).
 *
 * Uses "significant" words (>2 chars) to filter noise words like
 * "a", "the", "is", "of", etc. Matching is substring-based so
 * "Jehovahs" will still match "Jehovah's" after normalization.
 */
function scoreMatch(spoken: string, line: string): number {
  const spokenWords = normalize(spoken)
    .split(' ')
    .filter((w) => w.length > 2);
  const lineNorm = normalize(line);
  if (spokenWords.length === 0) return 0;
  const matchCount = spokenWords.filter((w) => lineNorm.includes(w)).length;
  return matchCount / spokenWords.length;
}

/**
 * Finds the best-matching script line for the given transcript.
 *
 * Three passes, each searching for the HIGHEST-scoring line (not just
 * the first that clears the threshold):
 *
 *  Pass 1 — Narrow  (currentLine−2 → currentLine+15)
 *    Handles normal line-by-line forward delivery.
 *
 *  Pass 2 — Wide    (currentLine−5 → currentLine+50)
 *    Handles jumping ahead in the script (skipping large sections).
 *    If you jump 30 lines ahead this will still find it.
 *
 *  Pass 3 — Full-script
 *    Emergency recovery when you're completely lost or jumped very far.
 *    Requires ≥3 significant spoken words and a stricter 60% match
 *    threshold to avoid false positives across 100+ lines.
 *
 * Returns -1 if nothing reaches the minimum score (hold current position).
 */
export function findBestMatch(
  transcript: string,
  lines: string[],
  currentLine: number
): number {
  const N = lines.length;

  const bestInRange = (start: number, end: number, minScore: number): number => {
    let bestIdx = -1;
    let bestScore = minScore;
    for (let i = Math.max(0, start); i <= Math.min(N - 1, end); i++) {
      const s = scoreMatch(transcript, lines[i]);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  // Pass 1: narrow forward window (normal delivery)
  const r1 = bestInRange(currentLine - 2, currentLine + 15, 0.40);
  if (r1 !== -1) return r1;

  // Pass 2: wide window (handles jumps up to 50 lines ahead)
  const r2 = bestInRange(currentLine - 5, currentLine + 50, 0.40);
  if (r2 !== -1) return r2;

  // Pass 3: full-script search (completely lost / very large jump)
  // Only trigger with ≥3 significant words to reduce noise
  const sigWords = normalize(transcript).split(' ').filter((w) => w.length > 2);
  if (sigWords.length >= 3) {
    const r3 = bestInRange(0, N - 1, 0.60);
    if (r3 !== -1) return r3;
  }

  return -1;
}
