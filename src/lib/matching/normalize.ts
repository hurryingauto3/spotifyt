import { UnifiedTrack } from './types';

export function normalizeTrackTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(feat\.?\s+[^)]+\)/gi, '') // Remove (feat. ...)
    .replace(/\s*\(ft\.?\s+[^)]+\)/gi, '') // Remove (ft. ...)
    .replace(/\s*\[feat\.?\s+[^\]]+\]/gi, '') // Remove [feat. ...]
    .replace(/\s*[-–]\s*(official\s+)?(music\s+)?video/gi, '') // Remove "- Official Music Video"
    .replace(/\s*[-–]\s*official\s+audio/gi, '') // Remove "- Official Audio"
    .replace(/\s*\(official\s+[^)]+\)/gi, '') // Remove (Official ...)
    .replace(/\s*\(lyrics?\s*\)/gi, '') // Remove (Lyrics)
    .replace(/\s*\(audio\s*\)/gi, '') // Remove (Audio)
    .replace(/\s*\(visuali[sz]er\s*\)/gi, '') // Remove (Visualizer)
    .replace(/\s*\|\s*.*$/g, '') // Remove everything after |
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

export function normalizeArtistName(artist: string): string {
  return artist
    .toLowerCase()
    // Remove YouTube-specific suffixes
    .replace(/vevo$/i, '') // Remove VEVO (handles "JeremyZuckerVEVO")
    .replace(/\s*-?\s*topic$/i, '') // Remove Topic
    .replace(/\s*-?\s*official$/i, '') // Remove Official
    // Add spaces between camelCase (JeremyZucker -> Jeremy Zucker)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Handle common patterns
    .replace(/\s*&\s*/g, ' and ') // & -> and
    .replace(/\s*,\s*/g, ' and ') // , -> and (for multi-artist)
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchQuery(track: UnifiedTrack): string {
  const title = normalizeTrackTitle(track.title);
  const artist = normalizeArtistName(track.artist);

  // Always include both artist and title for better matching
  return `${artist} ${title}`;
}
