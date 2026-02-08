/**
 * Tidal Provider Implementation
 *
 * Uses Tidal API v1 for music streaming integration.
 * Get API credentials: https://developer.tidal.com/
 *
 * Features:
 * - High-quality audio metadata
 * - Extensive catalog
 * - Free developer API
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

// ==================== Tidal API Types ====================

interface TidalTrack {
  id: number;
  title: string;
  duration: number;
  artist: {
    name: string;
  };
  artists?: Array<{ name: string }>;
  album: {
    title: string;
    cover?: string;
  };
  url: string;
  isrc?: string;
}

interface TidalPlaylist {
  uuid: string;
  title: string;
  description?: string;
  numberOfTracks: number;
  image?: string;
  url: string;
}

// ==================== Tidal Provider ====================

export class TidalProvider extends BaseMusicProvider {
  readonly platform: Platform = 'tidal';
  readonly name = 'Tidal';
  readonly config: ProviderConfig;

  constructor(config?: Partial<ProviderConfig>) {
    super();

    this.config = {
      clientId: process.env.TIDAL_CLIENT_ID || '',
      clientSecret: process.env.TIDAL_CLIENT_SECRET || '',
      redirectUri: config?.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/tidal/callback`,
      scopes: ['r_usr', 'w_usr', 'w_sub'], // read user, write user, write subscription
      apiBaseUrl: 'https://api.tidal.com/v1',
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

    return `https://login.tidal.com/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<AuthTokens> {
    const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
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
        scope: this.config.scopes.join(' '),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tidal OAuth failed: ${error}`);
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
    const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
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
      throw new Error(`Tidal token refresh failed: ${response.statusText}`);
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
      await this.makeAuthenticatedRequest('/users/me', accessToken);
      return true;
    } catch {
      return false;
    }
  }

  // ===== User Profile =====

  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const data = await this.makeAuthenticatedRequest<any>('/users/me', accessToken);

    return {
      id: data.userId?.toString() || data.id?.toString(),
      displayName: data.username || data.firstName || 'Tidal User',
      platform: 'tidal',
      profileUrl: `https://listen.tidal.com/user/${data.userId}`,
    };
  }

  // ===== Playlists =====

  async getUserPlaylists(accessToken: string, limit = 50): Promise<Playlist[]> {
    const profile = await this.getUserProfile(accessToken);
    const data = await this.makeAuthenticatedRequest<any>(
      `/users/${profile.id}/playlists?limit=${limit}`,
      accessToken
    );

    return (data.items || []).map((item: any) => this.transformPlaylist(item));
  }

  async getPlaylist(accessToken: string, playlistId: string): Promise<Playlist> {
    const [playlistData, tracksData] = await Promise.all([
      this.makeAuthenticatedRequest<any>(`/playlists/${playlistId}`, accessToken),
      this.makeAuthenticatedRequest<any>(
        `/playlists/${playlistId}/tracks?limit=100`,
        accessToken
      ),
    ]);

    const tracks = (tracksData.items || []).map((item: any) => this.transformTrack(item));

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

    const data = await this.makeAuthenticatedRequest<any>(
      `/users/${profile.id}/playlists`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          title: name,
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
    // Tidal uses comma-separated track IDs
    const trackIdString = trackIds.join(',');

    await this.makeAuthenticatedRequest(
      `/playlists/${playlistId}/tracks`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          trackIds: trackIdString,
          onDupes: 'SKIP', // Skip duplicates
        }),
      }
    );
  }

  // ===== Library/Liked Songs =====

  async getLikedTracks(accessToken: string, limit = 50): Promise<Track[]> {
    const profile = await this.getUserProfile(accessToken);
    const data = await this.makeAuthenticatedRequest<any>(
      `/users/${profile.id}/favorites/tracks?limit=${limit}`,
      accessToken
    );

    return (data.items || []).map((item: any) => this.transformTrack(item));
  }

  async addToLikedTracks(accessToken: string, trackIds: string[]): Promise<void> {
    const profile = await this.getUserProfile(accessToken);

    // Tidal allows adding multiple tracks at once
    const trackIdString = trackIds.join(',');

    await this.makeAuthenticatedRequest(
      `/users/${profile.id}/favorites/tracks`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          trackIds: trackIdString,
        }),
      }
    );
  }

  // ===== Search =====

  async searchTracks(query: string, options: SearchOptions = {}): Promise<Track[]> {
    const limit = options.limit || 10;
    const offset = options.offset || 0;

    const params = this.buildQueryString({
      query,
      type: 'TRACKS',
      limit,
      offset,
    });

    // Tidal search doesn't require authentication
    const data = await this.makeRequest<any>(
      `${this.config.apiBaseUrl}/search?${params}`,
      {
        headers: {
          'x-tidal-token': this.config.clientId,
        },
      }
    );

    return (data.tracks?.items || []).map((item: any) => this.transformTrack(item));
  }

  async getTrack(accessToken: string | null, trackId: string): Promise<Track | null> {
    try {
      const headers: Record<string, string> = {
        'x-tidal-token': this.config.clientId,
      };

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
        'x-tidal-token': this.config.clientId,
        ...options.headers,
      },
    });
  }

  private transformTrack(track: any): Track {
    // Get artist name from either artist object or artists array
    const artistName = track.artist?.name ||
                      track.artists?.map((a: any) => a.name).join(', ') ||
                      'Unknown Artist';

    // Tidal cover images use template: {uuid}/{width}x{height}.jpg
    const coverUrl = track.album?.cover
      ? `https://resources.tidal.com/images/${track.album.cover.replace(/-/g, '/')}/320x320.jpg`
      : undefined;

    return {
      id: track.id?.toString(),
      title: track.title,
      artist: artistName,
      album: track.album?.title,
      durationMs: track.duration * 1000, // Tidal returns seconds
      platform: 'tidal',
      externalUrl: track.url || `https://listen.tidal.com/track/${track.id}`,
      thumbnailUrl: coverUrl,
      isrc: track.isrc,
    };
  }

  private transformPlaylist(playlist: any): Playlist {
    // Tidal image URLs use similar template
    const imageUrl = playlist.image || playlist.squareImage
      ? `https://resources.tidal.com/images/${(playlist.image || playlist.squareImage).replace(/-/g, '/')}/320x320.jpg`
      : undefined;

    return {
      id: playlist.uuid,
      name: playlist.title,
      description: playlist.description,
      trackCount: playlist.numberOfTracks || 0,
      platform: 'tidal',
      externalUrl: playlist.url || `https://listen.tidal.com/playlist/${playlist.uuid}`,
      thumbnailUrl: imageUrl,
    };
  }
}
