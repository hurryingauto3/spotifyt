/**
 * Apple Music Provider Implementation
 *
 * Uses Apple Music API with MusicKit for authentication.
 * Requires:
 * - Apple Developer Program membership
 * - MusicKit identifier and private key
 * - Team ID for JWT generation
 *
 * Documentation: https://developer.apple.com/documentation/applemusicapi
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

// ==================== Apple Music API Types ====================

interface AppleMusicTrack {
  id: string;
  type: 'songs';
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    url: string;
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
    isrc?: string;
  };
}

interface AppleMusicPlaylist {
  id: string;
  type: 'playlists';
  attributes: {
    name: string;
    description?: {
      standard: string;
    };
    artwork?: {
      url: string;
    };
    url: string;
  };
  relationships?: {
    tracks: {
      data: AppleMusicTrack[];
    };
  };
}

interface AppleMusicLibraryPlaylist {
  id: string;
  type: 'library-playlists';
  attributes: {
    name: string;
    description?: {
      standard: string;
    };
    artwork?: {
      url: string;
    };
  };
  relationships?: {
    tracks: {
      data: AppleMusicTrack[];
    };
  };
}

// ==================== Apple Music Provider ====================

export class AppleMusicProvider extends BaseMusicProvider {
  readonly platform: Platform = 'apple';
  readonly name = 'Apple Music';
  readonly config: ProviderConfig;

  private developerToken: string;
  private apiVersion = 'v1';

  constructor(config: Partial<ProviderConfig> = {}) {
    super();

    // Apple Music uses JWT developer token instead of OAuth client secret
    this.developerToken = process.env.APPLE_MUSIC_DEVELOPER_TOKEN || '';

    this.config = {
      clientId: process.env.APPLE_MUSIC_KEY_ID || '',
      clientSecret: process.env.APPLE_MUSIC_TEAM_ID || '',
      redirectUri: config.redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/apple/callback`,
      scopes: ['playlist-read-private', 'playlist-modify-public', 'library-read', 'library-modify'],
      apiBaseUrl: 'https://api.music.apple.com',
    };

    if (!this.developerToken) {
      console.warn('[Apple Music] Developer token not configured');
    }
  }

  // ===== Authentication =====

  /**
   * Apple Music uses MusicKit for web authentication
   * This returns a URL to initialize MusicKit authorization
   */
  getAuthUrl(state: string): string {
    // For Apple Music, we'll use MusicKit JS on the client side
    // This URL is just a placeholder - actual auth happens via MusicKit.authorize()
    const params = new URLSearchParams({
      state,
      redirect_uri: this.config.redirectUri,
    });
    return `/auth/apple?${params.toString()}`;
  }

  /**
   * Exchange MusicKit user token
   * For Apple Music, the "code" is actually the music user token from MusicKit
   */
  async handleCallback(musicUserToken: string): Promise<AuthTokens> {
    // Validate the music user token
    const isValid = await this.validateToken(musicUserToken);
    if (!isValid) {
      throw new Error('Invalid Apple Music user token');
    }

    return {
      accessToken: musicUserToken,
      // Apple Music tokens don't expire in the traditional sense
      // They're tied to the user's Apple Music subscription
      expiresIn: 86400 * 180, // 180 days
      expiresAt: Date.now() + 86400 * 180 * 1000,
    };
  }

  /**
   * Refresh Apple Music token
   * Note: Music user tokens are managed by MusicKit and don't need manual refresh
   */
  async refreshToken(musicUserToken: string): Promise<AuthTokens> {
    // For Apple Music, we just validate the existing token
    const isValid = await this.validateToken(musicUserToken);
    if (!isValid) {
      throw new Error('Apple Music token is no longer valid. User needs to re-authorize.');
    }

    return {
      accessToken: musicUserToken,
      expiresIn: 86400 * 180,
      expiresAt: Date.now() + 86400 * 180 * 1000,
    };
  }

  /**
   * Validate Apple Music user token
   */
  async validateToken(musicUserToken: string): Promise<boolean> {
    try {
      // Try to fetch user's storefront (region)
      await this.makeAuthenticatedRequest<any>(
        `/me/storefront`,
        musicUserToken
      );
      return true;
    } catch (error) {
      console.error('[Apple Music] Token validation failed:', error);
      return false;
    }
  }

  // ===== User Profile =====

  async getUserProfile(musicUserToken: string): Promise<UserProfile> {
    // Apple Music doesn't provide user profile info
    // We can only get the storefront (region)
    const storefront = await this.makeAuthenticatedRequest<{
      data: Array<{
        id: string;
        attributes: {
          name: string;
          defaultLanguageTag: string;
        };
      }>;
    }>(`/me/storefront`, musicUserToken);

    const storefrontData = storefront.data[0];

    return {
      id: 'apple-music-user', // Apple doesn't provide user ID
      displayName: `Apple Music User (${storefrontData.attributes.name})`,
      platform: 'apple',
      profileUrl: 'https://music.apple.com',
    };
  }

  // ===== Playlists =====

  async getUserPlaylists(musicUserToken: string, limit = 50): Promise<Playlist[]> {
    const response = await this.makeAuthenticatedRequest<{
      data: AppleMusicLibraryPlaylist[];
    }>(`/me/library/playlists?limit=${limit}`, musicUserToken);

    return response.data.map((playlist) => this.transformPlaylist(playlist));
  }

  async getPlaylist(musicUserToken: string, playlistId: string): Promise<Playlist> {
    // Check if it's a library playlist (starts with 'p.')
    const isLibraryPlaylist = playlistId.startsWith('p.');
    const endpoint = isLibraryPlaylist
      ? `/me/library/playlists/${playlistId}`
      : `/catalog/us/playlists/${playlistId}`;

    const response = await this.makeAuthenticatedRequest<{
      data: [AppleMusicLibraryPlaylist | AppleMusicPlaylist];
    }>(`${endpoint}?include=tracks`, musicUserToken);

    const playlist = response.data[0];
    const tracks = playlist.relationships?.tracks?.data || [];

    return {
      ...this.transformPlaylist(playlist),
      tracks: tracks.map((track) => this.transformTrack(track)),
    };
  }

  async createPlaylist(
    musicUserToken: string,
    name: string,
    description?: string,
    isPublic = false
  ): Promise<Playlist> {
    const response = await this.makeAuthenticatedRequest<{
      data: [AppleMusicLibraryPlaylist];
    }>(
      `/me/library/playlists`,
      musicUserToken,
      {
        method: 'POST',
        body: JSON.stringify({
          attributes: {
            name,
            description: description ? { standard: description } : undefined,
          },
        }),
      }
    );

    return this.transformPlaylist(response.data[0]);
  }

  async addTracksToPlaylist(
    musicUserToken: string,
    playlistId: string,
    trackIds: string[]
  ): Promise<void> {
    // Apple Music requires catalog track IDs for library playlists
    const tracks = trackIds.map((id) => ({
      id,
      type: 'songs',
    }));

    await this.makeAuthenticatedRequest(
      `/me/library/playlists/${playlistId}/tracks`,
      musicUserToken,
      {
        method: 'POST',
        body: JSON.stringify({
          data: tracks,
        }),
      }
    );
  }

  // ===== Library/Liked Songs =====

  async getLikedTracks(musicUserToken: string, limit = 100): Promise<Track[]> {
    const response = await this.makeAuthenticatedRequest<{
      data: AppleMusicTrack[];
    }>(`/me/library/songs?limit=${limit}`, musicUserToken);

    return response.data.map((track) => this.transformTrack(track));
  }

  async addToLikedTracks(musicUserToken: string, trackIds: string[]): Promise<void> {
    // Apple Music adds tracks to library
    const tracks = trackIds.map((id) => ({
      id,
      type: 'songs',
    }));

    await this.makeAuthenticatedRequest(
      `/me/library`,
      musicUserToken,
      {
        method: 'POST',
        body: JSON.stringify({
          data: tracks,
        }),
      }
    );
  }

  // ===== Search =====

  async searchTracks(query: string, options: SearchOptions = {}): Promise<Track[]> {
    const limit = options.limit || 10;
    const offset = options.offset || 0;

    // For search, we use the developer token (no user auth required)
    const params = this.buildQueryString({
      term: query,
      types: 'songs',
      limit,
      offset,
    });

    const response = await this.makeRequest<{
      results: {
        songs: {
          data: AppleMusicTrack[];
        };
      };
    }>(
      `${this.config.apiBaseUrl}/${this.apiVersion}/catalog/us/search?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.developerToken}`,
        },
      }
    );

    return response.results.songs?.data?.map((track) => this.transformTrack(track)) || [];
  }

  async getTrack(musicUserToken: string | null, trackId: string): Promise<Track | null> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.developerToken}`,
      };

      // If user token provided, add it for personalized data
      if (musicUserToken) {
        headers['Music-User-Token'] = musicUserToken;
      }

      const response = await this.makeRequest<{
        data: [AppleMusicTrack];
      }>(
        `${this.config.apiBaseUrl}/${this.apiVersion}/catalog/us/songs/${trackId}`,
        { headers }
      );

      return this.transformTrack(response.data[0]);
    } catch (error) {
      console.error('[Apple Music] Failed to get track:', error);
      return null;
    }
  }

  // ===== Helper Methods =====

  /**
   * Make authenticated request to Apple Music API
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    musicUserToken: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiBaseUrl}/${this.apiVersion}${endpoint}`;

    return this.makeRequest<T>(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.developerToken}`,
        'Music-User-Token': musicUserToken,
        ...options.headers,
      },
    });
  }

  /**
   * Transform Apple Music track to our Track format
   */
  private transformTrack(track: AppleMusicTrack): Track {
    const artworkUrl = track.attributes.artwork?.url
      ? track.attributes.artwork.url
          .replace('{w}', '300')
          .replace('{h}', '300')
      : undefined;

    return {
      id: track.id,
      title: track.attributes.name,
      artist: track.attributes.artistName,
      album: track.attributes.albumName,
      durationMs: track.attributes.durationInMillis,
      platform: 'apple',
      externalUrl: track.attributes.url,
      thumbnailUrl: artworkUrl,
      isrc: track.attributes.isrc,
    };
  }

  /**
   * Transform Apple Music playlist to our Playlist format
   */
  private transformPlaylist(
    playlist: AppleMusicLibraryPlaylist | AppleMusicPlaylist
  ): Playlist {
    const artworkUrl =
      playlist.attributes.artwork?.url
        ?.replace('{w}', '300')
        ?.replace('{h}', '300');

    return {
      id: playlist.id,
      name: playlist.attributes.name,
      description: playlist.attributes.description?.standard,
      trackCount: playlist.relationships?.tracks?.data?.length || 0,
      platform: 'apple',
      externalUrl: 'url' in playlist.attributes ? playlist.attributes.url : undefined,
      thumbnailUrl: artworkUrl,
    };
  }
}

// ==================== Developer Token Generation ====================

/**
 * Generate Apple Music Developer Token (JWT)
 *
 * This should be done server-side with your private key.
 * The token is valid for 6 months.
 *
 * Requirements:
 * - Team ID (from Apple Developer account)
 * - Key ID (from MusicKit key)
 * - Private Key (.p8 file from Apple)
 *
 * Example usage:
 * ```typescript
 * import jwt from 'jsonwebtoken';
 * import fs from 'fs';
 *
 * const privateKey = fs.readFileSync('AuthKey_XXXXXXXXXX.p8', 'utf8');
 * const token = generateDeveloperToken(
 *   'YOUR_TEAM_ID',
 *   'YOUR_KEY_ID',
 *   privateKey
 * );
 * ```
 */
export function generateDeveloperToken(
  teamId: string,
  keyId: string,
  privateKey: string
): string {
  // Note: This requires 'jsonwebtoken' package
  // Install with: npm install jsonwebtoken @types/jsonwebtoken

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jwt = require('jsonwebtoken');

  const payload = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (86400 * 180), // 180 days
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: keyId,
  });
}
