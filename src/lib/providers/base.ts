/**
 * Music Provider Abstraction Layer
 *
 * This provides a unified interface for all music streaming services.
 * To add a new provider:
 * 1. Implement the MusicProvider interface
 * 2. Extend BaseMusicProvider for common functionality
 * 3. Register in the ProviderRegistry
 */

// ==================== Core Types ====================

export type Platform = 'spotify' | 'youtube' | 'apple' | 'deezer' | 'tidal';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationMs: number;
  platform: Platform;
  externalUrl?: string;
  thumbnailUrl?: string;
  isrc?: string; // International Standard Recording Code - helps with matching
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackCount: number;
  platform: Platform;
  tracks?: Track[];
  externalUrl?: string;
  thumbnailUrl?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  platform: Platform;
  profileUrl?: string;
  avatarUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: number;
  scope?: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  includeAlbums?: boolean;
  includeArtists?: boolean;
}

export interface ProviderConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  apiBaseUrl: string;
}

// ==================== Provider Interface ====================

export interface MusicProvider {
  readonly platform: Platform;
  readonly name: string;
  readonly config: ProviderConfig;

  // ===== Authentication =====
  /**
   * Generate OAuth authorization URL
   * @param state - CSRF protection token
   * @returns Authorization URL to redirect user to
   */
  getAuthUrl(state: string): string;

  /**
   * Exchange authorization code for access tokens
   * @param code - Authorization code from OAuth callback
   * @returns Access and refresh tokens
   */
  handleCallback(code: string): Promise<AuthTokens>;

  /**
   * Refresh expired access token
   * @param refreshToken - Refresh token
   * @returns New access tokens
   */
  refreshToken(refreshToken: string): Promise<AuthTokens>;

  /**
   * Validate if access token is still valid
   * @param accessToken - Access token to validate
   * @returns True if valid, false otherwise
   */
  validateToken(accessToken: string): Promise<boolean>;

  // ===== User Profile =====
  /**
   * Get authenticated user's profile
   * @param accessToken - User's access token
   * @returns User profile information
   */
  getUserProfile(accessToken: string): Promise<UserProfile>;

  // ===== Playlists =====
  /**
   * Get user's playlists
   * @param accessToken - User's access token
   * @param limit - Max number of playlists to return
   * @returns Array of user's playlists
   */
  getUserPlaylists(accessToken: string, limit?: number): Promise<Playlist[]>;

  /**
   * Get playlist details including tracks
   * @param accessToken - User's access token
   * @param playlistId - Playlist ID
   * @returns Playlist with tracks
   */
  getPlaylist(accessToken: string, playlistId: string): Promise<Playlist>;

  /**
   * Create a new playlist
   * @param accessToken - User's access token
   * @param name - Playlist name
   * @param description - Playlist description
   * @param isPublic - Whether playlist is public
   * @returns Created playlist
   */
  createPlaylist(
    accessToken: string,
    name: string,
    description?: string,
    isPublic?: boolean
  ): Promise<Playlist>;

  /**
   * Add tracks to a playlist
   * @param accessToken - User's access token
   * @param playlistId - Playlist ID
   * @param trackIds - Array of track IDs
   */
  addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackIds: string[]
  ): Promise<void>;

  // ===== Library/Liked Songs =====
  /**
   * Get user's liked/saved tracks
   * @param accessToken - User's access token
   * @param limit - Max number of tracks to return
   * @returns Array of liked tracks
   */
  getLikedTracks(accessToken: string, limit?: number): Promise<Track[]>;

  /**
   * Add tracks to user's liked/saved tracks
   * @param accessToken - User's access token
   * @param trackIds - Array of track IDs
   */
  addToLikedTracks(accessToken: string, trackIds: string[]): Promise<void>;

  // ===== Search =====
  /**
   * Search for tracks
   * @param query - Search query
   * @param options - Search options (limit, offset, etc.)
   * @returns Array of matching tracks
   */
  searchTracks(query: string, options?: SearchOptions): Promise<Track[]>;

  /**
   * Get track by ID
   * @param accessToken - User's access token (may be optional for some providers)
   * @param trackId - Track ID
   * @returns Track details
   */
  getTrack(accessToken: string | null, trackId: string): Promise<Track | null>;
}

// ==================== Base Provider Class ====================

/**
 * Base class providing common functionality for all music providers
 * Extend this class to implement a new provider
 */
export abstract class BaseMusicProvider implements MusicProvider {
  abstract readonly platform: Platform;
  abstract readonly name: string;
  abstract readonly config: ProviderConfig;

  // ===== Helper Methods =====

  /**
   * Make authenticated HTTP request with retry logic
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}\n${errorBody}`
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[${this.platform}] Request failed (attempt ${i + 1}/${retries}):`,
          error
        );

        // Wait before retrying (exponential backoff)
        if (i < retries - 1) {
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    throw new Error(
      `[${this.platform}] Request failed after ${retries} retries: ${lastError?.message}`
    );
  }

  /**
   * Delay execution
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build query string from object
   */
  protected buildQueryString(params: Record<string, string | number | boolean>): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      query.append(key, String(value));
    });
    return query.toString();
  }

  /**
   * Normalize track data for consistent matching
   */
  protected normalizeTrack(track: Track): Track {
    return {
      ...track,
      title: this.normalizeString(track.title),
      artist: this.normalizeString(track.artist),
    };
  }

  /**
   * Normalize string for matching (remove extra spaces, lowercase)
   */
  protected normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ===== Abstract Methods (must be implemented by subclasses) =====

  abstract getAuthUrl(state: string): string;
  abstract handleCallback(code: string): Promise<AuthTokens>;
  abstract refreshToken(refreshToken: string): Promise<AuthTokens>;
  abstract validateToken(accessToken: string): Promise<boolean>;
  abstract getUserProfile(accessToken: string): Promise<UserProfile>;
  abstract getUserPlaylists(accessToken: string, limit?: number): Promise<Playlist[]>;
  abstract getPlaylist(accessToken: string, playlistId: string): Promise<Playlist>;
  abstract createPlaylist(
    accessToken: string,
    name: string,
    description?: string,
    isPublic?: boolean
  ): Promise<Playlist>;
  abstract addTracksToPlaylist(
    accessToken: string,
    playlistId: string,
    trackIds: string[]
  ): Promise<void>;
  abstract getLikedTracks(accessToken: string, limit?: number): Promise<Track[]>;
  abstract addToLikedTracks(accessToken: string, trackIds: string[]): Promise<void>;
  abstract searchTracks(query: string, options?: SearchOptions): Promise<Track[]>;
  abstract getTrack(accessToken: string | null, trackId: string): Promise<Track | null>;
}

// ==================== Provider Registry ====================

/**
 * Registry for managing available music providers
 */
export class ProviderRegistry {
  private static providers: Map<Platform, MusicProvider> = new Map();

  /**
   * Register a music provider
   */
  static register(provider: MusicProvider): void {
    this.providers.set(provider.platform, provider);
    console.log(`[ProviderRegistry] Registered provider: ${provider.name}`);
  }

  /**
   * Get provider by platform
   */
  static get(platform: Platform): MusicProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider not found for platform: ${platform}`);
    }
    return provider;
  }

  /**
   * Get all registered providers
   */
  static getAll(): MusicProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if provider is registered
   */
  static has(platform: Platform): boolean {
    return this.providers.has(platform);
  }

  /**
   * Get all registered platform names
   */
  static getPlatforms(): Platform[] {
    return Array.from(this.providers.keys());
  }
}
