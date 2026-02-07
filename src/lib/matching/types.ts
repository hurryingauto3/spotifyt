export interface UnifiedTrack {
  id: string; // Platform-specific ID (Spotify URI or YouTube videoId)
  platform: 'spotify' | 'youtube';
  title: string;
  artist: string;
  artists: string[];
  album?: string;
  durationMs: number;
  isrc?: string;
  videoId?: string;
  raw: any;
}

export type MatchStatus = 'matched' | 'low_confidence' | 'not_found' | 'already_exists';

export interface MatchResult {
  source: UnifiedTrack;
  target: UnifiedTrack | null;
  confidence: number; // 0.0 to 1.0
  status: MatchStatus;
  existingId?: string;
}

export interface MatchConfig {
  highConfidenceThreshold: number; // default: 0.85
  lowConfidenceThreshold: number; // default: 0.60
  durationToleranceMs: number; // default: 3000 (3 seconds)
  durationWeight: number; // default: 0.15
  titleWeight: number; // default: 0.55
  artistWeight: number; // default: 0.30
  maxSearchResults: number; // default: 5
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  highConfidenceThreshold: 0.80,
  lowConfidenceThreshold: 0.55,
  durationToleranceMs: 3000,
  durationWeight: 0.15,
  titleWeight: 0.55,
  artistWeight: 0.30,
  maxSearchResults: 10,
};
