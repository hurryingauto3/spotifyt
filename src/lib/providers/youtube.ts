/**
 * YouTube Music Provider Implementation
 *
 * Uses ytmusic-api for search (no auth required, no quota cost)
 * Note: YouTube Data API has strict quotas and can't access all playlists
 */

import {
  BaseMusicProvider,
  Platform,
  Track,
  Playlist,
  UserProfile,
  AuthTokens,
  SearchOptions,
  ProviderConfig,
} from './base';

// ==================== YouTube Provider ====================

export class YouTubeProvider extends BaseMusicProvider {
  readonly platform: Platform = 'youtube';
  readonly name = 'YouTube Music';
  readonly config: ProviderConfig;

  constructor(config?: Partial<ProviderConfig>) {
    super();

    this.config = {
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/youtube/callback`,
      scopes: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube',
      ],
      apiBaseUrl: 'https://www.googleapis.com/youtube/v3',
    };
  }

  // ===== Authentication =====

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<AuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret!,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`YouTube OAuth failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret!,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`YouTube token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  // ===== User Profile =====

  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const data = await this.makeAuthenticatedRequest<any>(
      '/channels?part=snippet&mine=true',
      accessToken
    );

    const channel = data.items?.[0];
    if (!channel) {
      throw new Error('No YouTube channel found');
    }

    return {
      id: channel.id,
      displayName: channel.snippet.title,
      platform: 'youtube',
      profileUrl: `https://www.youtube.com/channel/${channel.id}`,
      avatarUrl: channel.snippet.thumbnails?.default?.url,
    };
  }

  // ===== Playlists =====

  async getUserPlaylists(accessToken: string, limit = 50): Promise<Playlist[]> {
    const data = await this.makeAuthenticatedRequest<any>(
      `/playlists?part=snippet,contentDetails&mine=true&maxResults=${limit}`,
      accessToken
    );

    return data.items?.map((item: any) => this.transformPlaylist(item)) || [];
  }

  async getPlaylist(accessToken: string, playlistId: string): Promise<Playlist> {
    // Get playlist info
    const playlistData = await this.makeAuthenticatedRequest<any>(
      `/playlists?part=snippet,contentDetails&id=${playlistId}`,
      accessToken
    );

    const playlist = playlistData.items?.[0];
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Get playlist items (videos)
    const itemsData = await this.makeAuthenticatedRequest<any>(
      `/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
      accessToken
    );

    const tracks = itemsData.items?.map((item: any) => this.transformTrackFromPlaylistItem(item)) || [];

    return {
      ...this.transformPlaylist(playlist),
      tracks,
    };
  }

  async createPlaylist(
    accessToken: string,
    name: string,
    description?: string,
    isPublic = false
  ): Promise<Playlist> {
    const data = await this.makeAuthenticatedRequest<any>(
      '/playlists?part=snippet,status',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          snippet: {
            title: name,
            description: description || '',
          },
          status: {
            privacyStatus: isPublic ? 'public' : 'private',
          },
        }),
      }
    );

    return this.transformPlaylist(data);
  }

  async addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    videoIds: string[]
  ): Promise<void> {
    for (const videoId of videoIds) {
      await this.makeAuthenticatedRequest(
        '/playlistItems?part=snippet',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId,
              },
            },
          }),
        }
      );
      // Add delay to avoid rate limiting
      await this.delay(100);
    }
  }

  // ===== Library/Liked Songs =====

  async getLikedTracks(accessToken: string, limit = 50): Promise<Track[]> {
    // YouTube doesn't have a "liked songs" API that works well
    // We can get liked videos but it's limited
    const data = await this.makeAuthenticatedRequest<any>(
      `/videos?part=snippet,contentDetails&myRating=like&maxResults=${limit}`,
      accessToken
    );

    return data.items?.map((item: any) => this.transformTrackFromVideo(item)) || [];
  }

  async addToLikedTracks(accessToken: string, videoIds: string[]): Promise<void> {
    for (const videoId of videoIds) {
      await this.makeAuthenticatedRequest(
        `/videos/rate?id=${videoId}&rating=like`,
        accessToken,
        { method: 'POST' }
      );
      await this.delay(100);
    }
  }

  // ===== Search =====

  async searchTracks(query: string, options: SearchOptions = {}): Promise<Track[]> {
    // Use ytmusic-api for search (no auth required, better results)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const YTMusic = require('ytmusic-api').default;
      const ytmusic = new YTMusic();
      await ytmusic.initialize();

      const results = await ytmusic.search(query, 'song');
      const limit = options.limit || 10;

      return results.slice(0, limit).map((result: any) => ({
        id: result.videoId,
        title: result.name,
        artist: result.artist?.name || 'Unknown Artist',
        album: result.album?.name,
        durationMs: result.duration ? result.duration * 1000 : 0,
        platform: 'youtube' as Platform,
        externalUrl: `https://music.youtube.com/watch?v=${result.videoId}`,
        thumbnailUrl: result.thumbnails?.[0]?.url,
      }));
    } catch (error) {
      console.error('[YouTube] ytmusic-api search failed:', error);
      return [];
    }
  }

  async getTrack(accessToken: string | null, videoId: string): Promise<Track | null> {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const data = await this.makeRequest<any>(
        `${this.config.apiBaseUrl}/videos?part=snippet,contentDetails&id=${videoId}`,
        { headers }
      );

      const video = data.items?.[0];
      return video ? this.transformTrackFromVideo(video) : null;
    } catch {
      return null;
    }
  }

  // ===== Helper Methods =====

  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;

    return this.makeRequest<T>(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
  }

  private transformPlaylist(playlist: any): Playlist {
    return {
      id: playlist.id,
      name: playlist.snippet.title,
      description: playlist.snippet.description,
      trackCount: playlist.contentDetails?.itemCount || 0,
      platform: 'youtube',
      externalUrl: `https://www.youtube.com/playlist?list=${playlist.id}`,
      thumbnailUrl: playlist.snippet.thumbnails?.default?.url,
    };
  }

  private transformTrackFromPlaylistItem(item: any): Track {
    return {
      id: item.contentDetails.videoId,
      title: item.snippet.title,
      artist: item.snippet.videoOwnerChannelTitle || 'Unknown Artist',
      durationMs: 0, // Not available in playlist items
      platform: 'youtube',
      externalUrl: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
      thumbnailUrl: item.snippet.thumbnails?.default?.url,
    };
  }

  private transformTrackFromVideo(video: any): Track {
    // Parse duration from ISO 8601 format (e.g., PT4M13S)
    const duration = video.contentDetails?.duration || 'PT0S';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match?.[1] || '0');
    const minutes = parseInt(match?.[2] || '0');
    const seconds = parseInt(match?.[3] || '0');
    const durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

    return {
      id: video.id,
      title: video.snippet.title,
      artist: video.snippet.channelTitle || 'Unknown Artist',
      durationMs,
      platform: 'youtube',
      externalUrl: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnailUrl: video.snippet.thumbnails?.default?.url,
    };
  }
}
