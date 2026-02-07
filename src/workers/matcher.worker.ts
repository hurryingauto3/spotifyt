import { fuzzy } from 'fast-fuzzy';
import { UnifiedTrack, MatchResult, MatchConfig } from '@/lib/matching/types';
import { normalizeTrackTitle, normalizeArtistName } from '@/lib/matching/normalize';

interface WorkerMessage {
  type: 'match';
  source: UnifiedTrack;
  candidates: UnifiedTrack[];
  config: MatchConfig;
  existingIds: string[];
}

interface WorkerResponse {
  result: MatchResult;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, source, candidates, config, existingIds } = e.data;

  if (type !== 'match') return;

  if (candidates.length === 0) {
    const response: WorkerResponse = {
      result: { source, target: null, confidence: 0, status: 'not_found' }
    };
    self.postMessage(response);
    return;
  }

  let bestMatch: UnifiedTrack | null = null;
  let bestScore = 0;

  const existingIdSet = new Set(existingIds);

  for (const candidate of candidates) {
    const normalizedSourceTitle = normalizeTrackTitle(source.title);
    const normalizedCandidateTitle = normalizeTrackTitle(candidate.title);
    const normalizedSourceArtist = normalizeArtistName(source.artist);
    const normalizedCandidateArtist = normalizeArtistName(candidate.artist);

    // Calculate fuzzy scores
    let titleScore = fuzzy(normalizedSourceTitle, normalizedCandidateTitle);
    let artistScore = fuzzy(normalizedSourceArtist, normalizedCandidateArtist);

    // Exact match bonuses (case-insensitive)
    if (normalizedSourceTitle === normalizedCandidateTitle) {
      titleScore = Math.max(titleScore, 0.98);
    }
    if (normalizedSourceArtist === normalizedCandidateArtist) {
      artistScore = Math.max(artistScore, 0.98);
    }

    // Duration similarity
    const durationDiff = Math.abs(source.durationMs - candidate.durationMs);
    const durationScore = Math.max(0, 1 - durationDiff / (config.durationToleranceMs * 3));

    // Composite score with weights
    let compositeScore =
      titleScore * config.titleWeight +
      artistScore * config.artistWeight +
      durationScore * config.durationWeight;

    // Bonus for both title AND artist being exact matches
    if (normalizedSourceTitle === normalizedCandidateTitle &&
        normalizedSourceArtist === normalizedCandidateArtist) {
      compositeScore = Math.min(0.99, compositeScore + 0.10);
    }

    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestMatch = candidate;
    }
  }

  let status: 'matched' | 'low_confidence' | 'not_found' | 'already_exists' = 'not_found';

  if (bestMatch && bestScore >= config.lowConfidenceThreshold) {
    status = bestScore >= config.highConfidenceThreshold ? 'matched' : 'low_confidence';

    // Check if already exists
    if (existingIdSet.has(bestMatch.id)) {
      status = 'already_exists';
    }
  }

  const response: WorkerResponse = {
    result: {
      source,
      target: bestMatch,
      confidence: bestScore,
      status,
      existingId: (status === 'already_exists' && bestMatch) ? bestMatch.id : undefined
    }
  };

  self.postMessage(response);
};
