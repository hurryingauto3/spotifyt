/**
 * Music Provider Registry and Initialization
 *
 * This file exports all providers and initializes the registry.
 * Import providers from here to ensure they're properly registered.
 */

// Export base types and classes
export * from './base';

// Export provider implementations
export { SpotifyProvider } from './spotify';
export { YouTubeProvider } from './youtube';
export { AppleMusicProvider, generateDeveloperToken } from './apple-music';

// Import for registration
import { ProviderRegistry } from './base';
import { SpotifyProvider } from './spotify';
import { YouTubeProvider } from './youtube';
import { AppleMusicProvider } from './apple-music';

// ==================== Provider Initialization ====================

let initialized = false;

/**
 * Initialize all music providers
 * Call this once at app startup
 */
export function initializeProviders() {
  if (initialized) {
    return;
  }

  try {
    // Register Spotify
    const spotifyProvider = new SpotifyProvider();
    ProviderRegistry.register(spotifyProvider);

    // Register YouTube
    const youtubeProvider = new YouTubeProvider();
    ProviderRegistry.register(youtubeProvider);

    // Register Apple Music (if configured)
    if (process.env.APPLE_MUSIC_DEVELOPER_TOKEN) {
      const appleMusicProvider = new AppleMusicProvider();
      ProviderRegistry.register(appleMusicProvider);
    } else {
      console.warn('[Providers] Apple Music not configured - skipping registration');
    }

    initialized = true;
    console.log('[Providers] Initialized:', ProviderRegistry.getPlatforms().join(', '));
  } catch (error) {
    console.error('[Providers] Initialization failed:', error);
    throw error;
  }
}

/**
 * Get provider by platform
 * Ensures providers are initialized before returning
 */
export function getProvider(platform: string) {
  if (!initialized) {
    initializeProviders();
  }
  return ProviderRegistry.get(platform as any);
}

/**
 * Get all registered providers
 */
export function getAllProviders() {
  if (!initialized) {
    initializeProviders();
  }
  return ProviderRegistry.getAll();
}

/**
 * Check if a platform is supported
 */
export function isPlatformSupported(platform: string): boolean {
  if (!initialized) {
    initializeProviders();
  }
  return ProviderRegistry.has(platform as any);
}

// Auto-initialize in browser/server context
if (typeof window !== 'undefined' || typeof process !== 'undefined') {
  initializeProviders();
}
