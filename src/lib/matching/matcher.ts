import { fuzzy } from 'fast-fuzzy';
import { UnifiedTrack, MatchResult, MatchConfig, DEFAULT_MATCH_CONFIG } from './types';
import { normalizeTrackTitle, normalizeArtistName, buildSearchQuery } from './normalize';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function matchTrack(
  source: UnifiedTrack,
  searchFn: (query: string) => Promise<UnifiedTrack[]>,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): Promise<MatchResult> {
  // Fast path: Try ISRC search first for Spotify sources
  if (source.isrc) {
    try {
      const isrcResults = await searchFn(source.isrc);
      if (isrcResults.length > 0) {
        return {
          source,
          target: isrcResults[0],
          confidence: 0.99,
          status: 'matched',
        };
      }
    } catch (error) {
      // ISRC search failed, fall through to fuzzy matching
    }
  }

  const query = buildSearchQuery(source);
  const candidates = await searchFn(query);

  if (candidates.length === 0) {
    return { source, target: null, confidence: 0, status: 'not_found' };
  }

  let bestMatch: UnifiedTrack | null = null;
  let bestScore = 0;

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
      titleScore = Math.max(titleScore, 0.98); // Near-perfect for exact title match
    }
    if (normalizedSourceArtist === normalizedCandidateArtist) {
      artistScore = Math.max(artistScore, 0.98); // Near-perfect for exact artist match
    }

    // Duration similarity: 1.0 if within tolerance, degrades linearly
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
      compositeScore = Math.min(0.99, compositeScore + 0.10); // Boost by 10%
    }

    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestMatch = candidate;
    }
  }

  if (!bestMatch || bestScore < config.lowConfidenceThreshold) {
    return { source, target: bestMatch, confidence: bestScore, status: 'not_found' };
  }

  return {
    source,
    target: bestMatch,
    confidence: bestScore,
    status: bestScore >= config.highConfidenceThreshold ? 'matched' : 'low_confidence',
  };
}

export async function matchTracks(
  sources: UnifiedTrack[],
  searchFn: (query: string) => Promise<UnifiedTrack[]>,
  existingIds: Set<string>,
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
  onProgress?: (completed: number, total: number) => void
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    const result = await matchTrack(source, searchFn, config);

    // Check if already exists in target
    if (result.target && existingIds.has(result.target.id)) {
      result.status = 'already_exists';
      result.existingId = result.target.id;
    }

    results.push(result);
    onProgress?.(i + 1, sources.length);

    // Rate limiting: small delay between searches
    await delay(200);
  }

  return results;
}

export function deduplicateResults(results: MatchResult[]): MatchResult[] {
  const seen = new Set<string>();
  return results.map((r) => {
    if (!r.target) return r;
    if (seen.has(r.target.id)) {
      return { ...r, status: 'already_exists' as const };
    }
    seen.add(r.target.id);
    return r;
  });
}
