import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { SessionData } from '../session';
import { refreshSpotifyToken } from './auth';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;

async function ensureValidToken(session: SessionData): Promise<void> {
  if (!session.spotify) {
    throw new Error('Spotify not connected');
  }

  // Refresh if token is expired or about to expire (within 5 minutes)
  if (Date.now() >= session.spotify.expiresAt - 5 * 60 * 1000) {
    const newSession = await refreshSpotifyToken(session);
    session.spotify = newSession;
  }
}

export async function getSpotifyClient(session: SessionData): Promise<SpotifyApi> {
  await ensureValidToken(session);

  if (!session.spotify) {
    throw new Error('Spotify not connected');
  }

  return SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, {
    access_token: session.spotify.accessToken,
    token_type: 'Bearer',
    expires_in: Math.floor((session.spotify.expiresAt - Date.now()) / 1000),
    refresh_token: session.spotify.refreshToken,
  });
}

export async function getUserPlaylists(session: SessionData) {
  const client = await getSpotifyClient(session);
  const playlists: any[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await client.currentUser.playlists.playlists(limit, offset);
    playlists.push(...response.items);

    if (!response.next) break;
    offset += limit;
  }

  return playlists.map((p) => ({
    id: p.id,
    name: p.name,
    trackCount: p.tracks.total,
    imageUrl: p.images?.[0]?.url,
  }));
}

export async function getPlaylistTracks(session: SessionData, playlistId: string) {
  const client = await getSpotifyClient(session);
  const tracks: any[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await client.playlists.getPlaylistItems(playlistId, undefined, undefined, limit, offset);
    tracks.push(...response.items);

    if (!response.next) break;
    offset += limit;
  }

  return tracks
    .filter((item) => item.track && item.track.type === 'track')
    .map((item) => ({
      id: item.track.uri,
      platform: 'spotify' as const,
      title: item.track.name,
      artist: item.track.artists[0]?.name || 'Unknown',
      artists: item.track.artists.map((a: any) => a.name),
      album: item.track.album?.name,
      durationMs: item.track.duration_ms,
      isrc: item.track.external_ids?.isrc,
      raw: item.track,
    }));
}

export async function getLikedSongs(session: SessionData) {
  const client = await getSpotifyClient(session);
  const tracks: any[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await client.currentUser.tracks.savedTracks(limit, offset);
    tracks.push(...response.items);

    if (!response.next) break;
    offset += limit;
  }

  return tracks
    .filter((item) => item.track && item.track.type === 'track')
    .map((item) => ({
      id: item.track.uri,
      platform: 'spotify' as const,
      title: item.track.name,
      artist: item.track.artists[0]?.name || 'Unknown',
      artists: item.track.artists.map((a: any) => a.name),
      album: item.track.album?.name,
      durationMs: item.track.duration_ms,
      isrc: item.track.external_ids?.isrc,
      raw: item.track,
    }));
}

export async function searchTrack(session: SessionData, query: string) {
  const client = await getSpotifyClient(session);
  const response = await client.search(query, ['track'], undefined, 5);

  return response.tracks.items.map((track) => ({
    id: track.uri,
    platform: 'spotify' as const,
    title: track.name,
    artist: track.artists[0]?.name || 'Unknown',
    artists: track.artists.map((a) => a.name),
    album: track.album?.name,
    durationMs: track.duration_ms,
    isrc: track.external_ids?.isrc,
    raw: track,
  }));
}

export async function addToLiked(session: SessionData, trackIds: string[]) {
  const client = await getSpotifyClient(session);

  // Remove "spotify:track:" prefix if present
  const ids = trackIds.map((id) => id.replace('spotify:track:', ''));

  // Batch in groups of 50
  const batchSize = 50;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    await client.currentUser.tracks.saveTracks(batch);
  }
}

export async function addToPlaylist(session: SessionData, playlistId: string, trackUris: string[]) {
  const client = await getSpotifyClient(session);

  // Batch in groups of 100
  const batchSize = 100;
  for (let i = 0; i < trackUris.length; i += batchSize) {
    const batch = trackUris.slice(i, i + batchSize);
    await client.playlists.addItemsToPlaylist(playlistId, batch);
  }
}

export async function createPlaylist(session: SessionData, name: string, description?: string) {
  const client = await getSpotifyClient(session);

  if (!session.spotify?.userId) {
    throw new Error('User ID not available');
  }

  const playlist = await client.playlists.createPlaylist(session.spotify.userId, {
    name,
    description,
    public: false,
  });

  return {
    id: playlist.id,
    name: playlist.name,
    url: playlist.external_urls.spotify,
  };
}

export async function getPlaylistTrackUris(session: SessionData, playlistId: string): Promise<Set<string>> {
  const tracks = await getPlaylistTracks(session, playlistId);
  return new Set(tracks.map((t) => t.id));
}

export async function getLikedTrackUris(session: SessionData): Promise<Set<string>> {
  const tracks = await getLikedSongs(session);
  return new Set(tracks.map((t) => t.id));
}
