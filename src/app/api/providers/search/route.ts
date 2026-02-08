/**
 * Multi-Platform Search API
 *
 * Example endpoint demonstrating the provider architecture.
 * Searches across all registered music platforms simultaneously.
 *
 * Usage:
 *   GET /api/providers/search?q=artist+song&platforms=spotify,apple,youtube
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllProviders, getProvider, isPlatformSupported } from '@/lib/providers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const platformsParam = searchParams.get('platforms');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter "q"' },
        { status: 400 }
      );
    }

    // Determine which platforms to search
    let providers;
    if (platformsParam) {
      const requestedPlatforms = platformsParam.split(',');
      const validPlatforms = requestedPlatforms.filter(isPlatformSupported);

      if (validPlatforms.length === 0) {
        return NextResponse.json(
          {
            error: 'No valid platforms specified',
            availablePlatforms: getAllProviders().map((p) => p.platform),
          },
          { status: 400 }
        );
      }

      providers = validPlatforms.map((platform) => getProvider(platform));
    } else {
      // Search all platforms
      providers = getAllProviders();
    }

    console.log(`[Multi-Search] Searching "${query}" across ${providers.length} platforms`);

    // Search all platforms in parallel
    const searchPromises = providers.map(async (provider) => {
      try {
        const results = await provider.searchTracks(query, { limit });
        return {
          platform: provider.platform,
          name: provider.name,
          success: true,
          count: results.length,
          tracks: results,
        };
      } catch (error) {
        console.error(`[Multi-Search] ${provider.name} failed:`, error);
        return {
          platform: provider.platform,
          name: provider.name,
          success: false,
          error: (error as Error).message,
          tracks: [],
        };
      }
    });

    const results = await Promise.all(searchPromises);

    // Calculate stats
    const totalTracks = results.reduce((sum, r) => sum + r.tracks.length, 0);
    const successfulPlatforms = results.filter((r) => r.success).length;

    return NextResponse.json({
      query,
      stats: {
        platforms: results.length,
        successful: successfulPlatforms,
        totalTracks,
      },
      results,
    });
  } catch (error: any) {
    console.error('[Multi-Search] Error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get available platforms
 *
 * Usage:
 *   GET /api/providers/search?info=true
 */
export async function OPTIONS() {
  const providers = getAllProviders();

  return NextResponse.json({
    platforms: providers.map((p) => ({
      platform: p.platform,
      name: p.name,
      scopes: p.config.scopes,
    })),
  });
}
