import { google, youtube_v3 } from 'googleapis';
import { SessionData } from '../session';
import { refreshYouTubeToken } from './auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

async function ensureValidToken(session: SessionData): Promise<void> {
  if (!session.youtube) {
    throw new Error('YouTube not connected');
  }

  // Refresh if token is expired or about to expire (within 5 minutes)
  if (Date.now() >= session.youtube.expiresAt - 5 * 60 * 1000) {
    const newSession = await refreshYouTubeToken(session);
    session.youtube = newSession;
  }
}

function getYouTubeClient(session: SessionData): youtube_v3.Youtube {
  if (!session.youtube) {
    throw new Error('YouTube not connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: session.youtube.accessToken,
    refresh_token: session.youtube.refreshToken,
  });

  return google.youtube({ version: 'v3', auth: oauth2Client });
}

export async function getUserPlaylists(session: SessionData) {
  await ensureValidToken(session);
  const youtube = getYouTubeClient(session);

  const playlists: any[] = [];
  let pageToken: string | undefined;

  // Try fetching playlists with mine=true
  do {
    const response = await youtube.playlists.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
      maxResults: 50,
      pageToken,
    });

    console.log('[YouTube] Playlists API response (mine=true):', {
      itemCount: response.data.items?.length || 0,
      totalResults: response.data.pageInfo?.totalResults,
      hasNextPage: !!response.data.nextPageToken,
    });

    if (response.data.items) {
      playlists.push(...response.data.items);
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  // If no playlists found with mine=true, try using channelId
  if (playlists.length === 0 && session.youtube?.channelId) {
    console.log('[YouTube] No playlists with mine=true, trying channelId:', session.youtube.channelId);
    pageToken = undefined;

    do {
      const result = await youtube.playlists.list({
        part: ['snippet', 'contentDetails'],
        channelId: session.youtube.channelId,
        maxResults: 50,
        pageToken,
      });

      console.log('[YouTube] Playlists API response (channelId):', {
        itemCount: result.data.items?.length || 0,
        totalResults: result.data.pageInfo?.totalResults,
      });

      if (result.data.items) {
        playlists.push(...result.data.items);
      }

      pageToken = result.data.nextPageToken || undefined;
    } while (pageToken);
  }

  console.log('[YouTube] Total playlists found:', playlists.length);

  return playlists.map((p) => ({
    id: p.id!,
    name: p.snippet?.title || 'Untitled',
    trackCount: p.contentDetails?.itemCount || 0,
    imageUrl: p.snippet?.thumbnails?.medium?.url,
  }));
}

export async function getPlaylistItems(session: SessionData, playlistId: string) {
  await ensureValidToken(session);
  const youtube = getYouTubeClient(session);

  const items: any[] = [];
  let pageToken: string | undefined;

  do {
    const response = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId,
      maxResults: 50,
      pageToken,
    });

    if (response.data.items) {
      items.push(...response.data.items);
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return items;
}

export async function getVideoDetails(session: SessionData, videoIds: string[]) {
  await ensureValidToken(session);
  const youtube = getYouTubeClient(session);

  const videos: any[] = [];

  // Batch in groups of 50
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: batch,
    });

    if (response.data.items) {
      videos.push(...response.data.items);
    }
  }

  return videos;
}

export async function getPlaylistTracks(session: SessionData, playlistId: string) {
  const items = await getPlaylistItems(session, playlistId);
  const videoIds = items
    .map((item) => item.contentDetails?.videoId)
    .filter((id): id is string => !!id);

  const videos = await getVideoDetails(session, videoIds);

  return videos.map((video) => ({
    id: `youtube:video:${video.id}`,
    platform: 'youtube' as const,
    title: video.snippet?.title || 'Unknown',
    artist: video.snippet?.channelTitle || 'Unknown',
    artists: [video.snippet?.channelTitle || 'Unknown'],
    album: undefined,
    durationMs: parseDuration(video.contentDetails?.duration),
    videoId: video.id,
    raw: video,
  }));
}

function parseDuration(isoDuration?: string): number {
  if (!isoDuration) return 0;

  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

export async function createPlaylist(session: SessionData, title: string, description?: string) {
  await ensureValidToken(session);
  const youtube = getYouTubeClient(session);

  const response = await youtube.playlists.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
      },
      status: {
        privacyStatus: 'private',
      },
    },
  });

  return {
    id: response.data.id!,
    name: response.data.snippet?.title || title,
    url: `https://www.youtube.com/playlist?list=${response.data.id}`,
  };
}

export async function addVideoToPlaylist(session: SessionData, playlistId: string, videoId: string) {
  await ensureValidToken(session);
  const youtube = getYouTubeClient(session);

  await youtube.playlistItems.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: videoId.replace('youtube:video:', ''),
        },
      },
    },
  });
}

export async function addVideosToPlaylist(
  session: SessionData,
  playlistId: string,
  videoIds: string[],
  onProgress?: (completed: number, total: number) => void
) {
  for (let i = 0; i < videoIds.length; i++) {
    await addVideoToPlaylist(session, playlistId, videoIds[i]);
    onProgress?.(i + 1, videoIds.length);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export async function searchYouTube(session: SessionData, query: string) {
  await ensureValidToken(session);
  const youtube = getYouTubeClient(session);

  const response = await youtube.search.list({
    part: ['snippet'],
    q: query,
    type: ['video'],
    videoCategoryId: '10', // Music category
    maxResults: 5,
  });

  if (!response.data.items) {
    return [];
  }

  const videoIds = response.data.items
    .map((item) => item.id?.videoId)
    .filter((id): id is string => !!id);

  const videos = await getVideoDetails(session, videoIds);

  return videos.map((video) => ({
    id: `youtube:video:${video.id}`,
    platform: 'youtube' as const,
    title: video.snippet?.title || 'Unknown',
    artist: video.snippet?.channelTitle || 'Unknown',
    artists: [video.snippet?.channelTitle || 'Unknown'],
    album: undefined,
    durationMs: parseDuration(video.contentDetails?.duration),
    videoId: video.id,
    raw: video,
  }));
}

export async function getPlaylistVideoIds(session: SessionData, playlistId: string): Promise<Set<string>> {
  const items = await getPlaylistItems(session, playlistId);
  const videoIds = items
    .map((item) => item.contentDetails?.videoId)
    .filter((id): id is string => !!id)
    .map((id) => `youtube:video:${id}`);
  return new Set(videoIds);
}
