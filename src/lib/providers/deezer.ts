/**
 * Deezer Provider Implementation
 *
 * Uses Deezer API for music streaming integration.
 * Get API credentials: https://developers.deezer.com/myapps
 *
 * Features:
 * - Simple REST API
 * - Large music catalog
 * - Free developer access
 * - No quota limits
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

// ==================== Deezer API Types ====================

interface DeezerTrack {
  id: number;
  title: string;
  title_short: string;
  duration: number;
  artist: {
    id: number;
    name: string;
    picture?: string;
  };
  album: {
    id: number;
    title: string;
    cover?: string;
    cover_small?: string;
    cover_medium?: string;
    cover_big?: string;
  };
  link: string;
  preview?: string;
  isrc?: string;
}

interface DeezerPlaylist {
  id: number;
  title: string;
  description?: string;
  nb_tracks: number;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  link: string;
  public?: boolean;
}

// ==================== Deezer Provider ====================

export class DeezerProvider extends BaseMusicProvider {
  readonly platform: Platform = 'deezer';
  readonly name = 'Deezer';
  readonly config: ProviderConfig;

  constructor(config?: Partial<ProviderConfig>) {
    super();

    this.config = {
      clientId: process.env.DEEZER_APP_ID || '',
      clientSecret: process.env.DEEZER_SECRET_KEY || '',
      redirectUri: config?.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/deezer/callback`,
      scopes: [
        'basic_access',
        'email',
        'offline_access',
        'manage_library',
        'delete_library',
      ],
      apiBaseUrl: 'https://api.deezer.com',
    };
  }

  // ===== Authentication =====

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      app_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      perms: this.config.scopes.join(','),
      state,
    });

    return `https://connect.deezer.com/oauth/auth.php?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<AuthTokens> {
    const params = new URLSearchParams({
      app_id: this.config.clientId,
      secret: this.config.clientSecret!,
      code,
      output: 'json',
    });

    const response = await fetch(
      `https://connect.deezer.com/oauth/access_token.php?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Deezer OAuth failed: ${response.statusText}`);
    }

    const text = await response.text();

    // Deezer returns URL-encoded response OR JSON
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // Parse URL-encoded format: access_token=xxx&expires=3600
      const urlParams = new URLSearchParams(text);
      data = {
        access_token: urlParams.get('access_token'),
        expires: urlParams.get('expires'),
      };
    }

    if (!data.access_token) {
      throw new Error('No access token received from Deezer');
    }

    const expiresIn = parseInt(data.expires || '0');

    return {
      accessToken: data.access_token,
      // Deezer doesn't provide refresh tokens with offline_access
      expiresIn: expiresIn,
      expiresAt: expiresIn > 0 ? Date.now() + expiresIn * 1000 : undefined,
    };
  }

  async refreshToken(accessToken: string): Promise<AuthTokens> {
    // Deezer tokens with offline_access don't expire
    // Just validate the existing token
    const isValid = await this.validateToken(accessToken);
    if (!isValid) {
      throw new Error('Deezer token is no longer valid. User needs to re-authorize.');
    }

    return {
      accessToken,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest('/user/me', accessToken);
      return true;
    } catch {
      return false;
    }
  }

  // ===== User Profile =====

  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const data = await this.makeAuthenticatedRequest<any>('/user/me', accessToken);

    return {
      id: data.id?.toString(),
      displayName: data.name,
      email: data.email,
      platform: 'deezer',
      profileUrl: data.link,
      avatarUrl: data.picture_medium || data.picture,
    };
  }

  // ===== Playlists =====

  async getUserPlaylists(accessToken: string, limit = 50): Promise<Playlist[]> {
    const data = await this.makeAuthenticatedRequest<any>(
      `/user/me/playlists?limit=${limit}`,
      accessToken
    );

    return (data.data || []).map((item: any) => this.transformPlaylist(item));
  }

  async getPlaylist(accessToken: string, playlistId: string): Promise<Playlist> {
    const [playlistData, tracksData] = await Promise.all([
      this.makeAuthenticatedRequest<any>(`/playlist/${playlistId}`, accessToken),
      this.makeAuthenticatedRequest<any>(
        `/playlist/${playlistId}/tracks?limit=100`,
        accessToken
      ),
    ]);

    const tracks = (tracksData.data || []).map((item: any) => this.transformTrack(item));

    return {
      ...this.transformPlaylist(playlistData),
      tracks,
    };
  }

  async createPlaylist(
    accessToken: string,
    name: string,
    description?: string,
    isPublic = false
  ): Promise<Playlist> {
    const profile = await this.getUserProfile(accessToken);

    const params = new URLSearchParams({
      title: name,
      ...(description && { description }),
    });

    const data = await this.makeAuthenticatedRequest<any>(
      `/user/${profile.id}/playlists?${params.toString()}`,
      accessToken,
      { method: 'POST' }
    );

    // Get the created playlist
    const playlistId = data.id;
    const playlist = await this.makeAuthenticatedRequest<any>(
      `/playlist/${playlistId}`,
      accessToken
    );

    return this.transformPlaylist(playlist);
  }

  async addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackIds: string[]
  ): Promise<void> {
    // Deezer accepts comma-separated track IDs
    const songs = trackIds.join(',');

    await this.makeAuthenticatedRequest(
      `/playlist/${playlistId}/tracks?songs=${songs}`,
      accessToken,
      { method: 'POST' }
    );
  }

  // ===== Library/Liked Songs =====

  async getLikedTracks(accessToken: string, limit = 50): Promise<Track[]> {
    const data = await this.makeAuthenticatedRequest<any>(
      `/user/me/tracks?limit=${limit}`,
      accessToken
    );

    return (data.data || []).map((item: any) => this.transformTrack(item));
  }

  async addToLikedTracks(accessToken: string, trackIds: string[]): Promise<void> {
    // Add tracks one by one (Deezer API limitation)
    for (const trackId of trackIds) {
      await this.makeAuthenticatedRequest(
        `/user/me/tracks?track_id=${trackId}`,
        accessToken,
        { method: 'POST' }
      );
      // Small delay to avoid rate limiting
      await this.delay(100);
    }
  }

  // ===== Search =====

  async searchTracks(query: string, options: SearchOptions = {}): Promise<Track[]> {
    const limit = options.limit || 10;
    const offset = options.offset || 0;

    const params = this.buildQueryString({
      q: query,
      limit,
      index: offset,
    });

    // Deezer search doesn't require authentication
    const data = await this.makeRequest<any>(
      `${this.config.apiBaseUrl}/search/track?${params}`
    );

    return (data.data || []).map((item: any) => this.transformTrack(item));
  }

  async getTrack(accessToken: string | null, trackId: string): Promise<Track | null> {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const data = await this.makeRequest<any>(
        `${this.config.apiBaseUrl}/track/${trackId}`,
        { headers }
      );

      return this.transformTrack(data);
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
    // Deezer uses access_token query parameter instead of Authorization header
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.config.apiBaseUrl}${endpoint}${separator}access_token=${accessToken}`;

    return this.makeRequest<T>(url, options);
  }

  private transformTrack(track: any): Track {
    return {
      id: track.id?.toString(),
      title: track.title || track.title_short,
      artist: track.artist?.name || 'Unknown Artist',
      album: track.album?.title,
      durationMs: track.duration * 1000, // Deezer returns seconds
      platform: 'deezer',
      externalUrl: track.link,
      thumbnailUrl: track.album?.cover_medium || track.album?.cover,
      isrc: track.isrc,
    };
  }

  private transformPlaylist(playlist: any): Playlist {
    return {
      id: playlist.id?.toString(),
      name: playlist.title,
      description: playlist.description,
      trackCount: playlist.nb_tracks || 0,
      platform: 'deezer',
      externalUrl: playlist.link,
      thumbnailUrl: playlist.picture_medium || playlist.picture,
    };
  }
}
