/**
 * Spotify Provider Implementation
 *
 * Refactored from existing Spotify client to use provider abstraction.
 * This allows easy addition of new music services.
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

// ==================== Spotify Provider ====================

export class SpotifyProvider extends BaseMusicProvider {
  readonly platform: Platform = 'spotify';
  readonly name = 'Spotify';
  readonly config: ProviderConfig;

  constructor(config?: Partial<ProviderConfig>) {
    super();

    this.config = {
      clientId: process.env.SPOTIFY_CLIENT_ID || '',
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/spotify/callback`,
      scopes: [
        'user-read-private',
        'user-read-email',
        'playlist-read-private',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-library-read',
        'user-library-modify',
      ],
      apiBaseUrl: 'https://api.spotify.com/v1',
    };
  }

  // ===== Authentication =====

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<AuthTokens> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${this.config.clientId}:${this.config.clientSecret}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Spotify OAuth failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${this.config.clientId}:${this.config.clientSecret}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Spotify token refresh failed: ${response.statusText}`);
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
      await this.makeAuthenticatedRequest('/me', accessToken);
      return true;
    } catch {
      return false;
    }
  }

  // ===== User Profile =====

  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const data = await this.makeAuthenticatedRequest<any>('/me', accessToken);

    return {
      id: data.id,
      displayName: data.display_name,
      email: data.email,
      platform: 'spotify',
      profileUrl: data.external_urls?.spotify,
      avatarUrl: data.images?.[0]?.url,
    };
  }

  // ===== Playlists =====

  async getUserPlaylists(accessToken: string, limit = 50): Promise<Playlist[]> {
    const data = await this.makeAuthenticatedRequest<any>(
      `/me/playlists?limit=${limit}`,
      accessToken
    );

    return data.items.map((item: any) => this.transformPlaylist(item));
  }

  async getPlaylist(accessToken: string, playlistId: string): Promise<Playlist> {
    const data = await this.makeAuthenticatedRequest<any>(
      `/playlists/${playlistId}`,
      accessToken
    );

    const tracks = data.tracks?.items?.map((item: any) => this.transformTrack(item.track)) || [];

    return {
      ...this.transformPlaylist(data),
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

    const data = await this.makeAuthenticatedRequest<any>(
      `/users/${profile.id}/playlists`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || '',
          public: isPublic,
        }),
      }
    );

    return this.transformPlaylist(data);
  }

  async addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackIds: string[]
  ): Promise<void> {
    const uris = trackIds.map((id) => `spotify:track:${id}`);

    // Spotify allows max 100 tracks per request
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      await this.makeAuthenticatedRequest(
        `/playlists/${playlistId}/tracks`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ uris: batch }),
        }
      );
    }
  }

  // ===== Library/Liked Songs =====

  async getLikedTracks(accessToken: string, limit = 50): Promise<Track[]> {
    const data = await this.makeAuthenticatedRequest<any>(
      `/me/tracks?limit=${limit}`,
      accessToken
    );

    return data.items.map((item: any) => this.transformTrack(item.track));
  }

  async addToLikedTracks(accessToken: string, trackIds: string[]): Promise<void> {
    // Spotify allows max 50 tracks per request
    for (let i = 0; i < trackIds.length; i += 50) {
      const batch = trackIds.slice(i, i + 50);
      await this.makeAuthenticatedRequest(`/me/tracks`, accessToken, {
        method: 'PUT',
        body: JSON.stringify({ ids: batch }),
      });
    }
  }

  // ===== Search =====

  async searchTracks(query: string, options: SearchOptions = {}): Promise<Track[]> {
    const limit = options.limit || 10;
    const offset = options.offset || 0;

    const params = this.buildQueryString({
      q: query,
      type: 'track',
      limit,
      offset,
    });

    // Search doesn't require authentication
    const data = await this.makeRequest<any>(
      `${this.config.apiBaseUrl}/search?${params}`
    );

    return data.tracks?.items?.map((item: any) => this.transformTrack(item)) || [];
  }

  async getTrack(accessToken: string | null, trackId: string): Promise<Track | null> {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const data = await this.makeRequest<any>(
        `${this.config.apiBaseUrl}/tracks/${trackId}`,
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
    const url = `${this.config.apiBaseUrl}${endpoint}`;

    return this.makeRequest<T>(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
  }

  private transformTrack(track: any): Track {
    return {
      id: track.id,
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      album: track.album?.name,
      durationMs: track.duration_ms,
      platform: 'spotify',
      externalUrl: track.external_urls?.spotify,
      thumbnailUrl: track.album?.images?.[0]?.url,
      isrc: track.external_ids?.isrc,
    };
  }

  private transformPlaylist(playlist: any): Playlist {
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      trackCount: playlist.tracks?.total || 0,
      platform: 'spotify',
      externalUrl: playlist.external_urls?.spotify,
      thumbnailUrl: playlist.images?.[0]?.url,
    };
  }
}
