import type { FlatLine } from './scriptUtils';

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordOverlapScore(a: string, b: string): number {
  const wordsA = normalizeText(a).split(' ').filter(Boolean);
  const wordsB = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (wordsA.length === 0 || wordsB.size === 0) return 0;
  const overlap = wordsA.filter((w) => w && wordsB.has(w)).length;
  return overlap / Math.max(wordsA.length, wordsB.size);
}

// Returns the index of the best-matching line within [currentIdx, currentIdx + windowSize],
// or -1 if nothing exceeds the threshold.
export function matchTranscriptToScript(
  transcript: string,
  lines: FlatLine[],
  currentIdx: number,
  windowSize = 20,
  threshold = 0.35,
): number {
  if (!transcript.trim() || lines.length === 0) return -1;
  const start = Math.max(0, currentIdx);
  const end = Math.min(lines.length - 1, currentIdx + windowSize);
  let bestIdx = -1;
  let bestScore = threshold;
  for (let i = start; i <= end; i++) {
    const score = wordOverlapScore(transcript, lines[i]?.line.text ?? '');
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// Builds a short script excerpt around currentIdx for use as a recognizer context hint.
export function buildContextHint(lines: FlatLine[], currentIdx: number, windowSize = 8): string {
  if (lines.length === 0) return '';
  const start = Math.max(0, currentIdx);
  const end = Math.min(lines.length - 1, start + windowSize);
  return lines
    .slice(start, end + 1)
    .map((fl) => (fl.line.character ? `${fl.line.character}: ${fl.line.text}` : fl.line.text))
    .join('\n');
}
