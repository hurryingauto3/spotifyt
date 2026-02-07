import { SessionData } from '../session';
import { getPlaylistTrackUris, getLikedTrackUris } from '../spotify/client';
import { getPlaylistVideoIds } from '../youtube/client';

export async function getExistingTrackIds(
  session: SessionData,
  platform: 'spotify' | 'youtube',
  playlistId: string | null
): Promise<Set<string>> {
  if (platform === 'spotify') {
    if (playlistId === 'liked' || !playlistId) {
      return getLikedTrackUris(session);
    }
    return getPlaylistTrackUris(session, playlistId);
  } else {
    if (!playlistId) {
      return new Set(); // YouTube doesn't have a "liked" endpoint
    }
    return getPlaylistVideoIds(session, playlistId);
  }
}
