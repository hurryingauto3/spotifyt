import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { searchTrack as searchSpotify } from '@/lib/spotify/client';
import { searchYTMusicSong as searchYouTube } from '@/lib/youtube/ytmusic-client';
import { batchMatchWithGemini, matchWithGemini } from '@/lib/gemini/client';
import { UnifiedTrack } from '@/lib/matching/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle single track matching (for client-side hook)
    if (body.sourceTrack && body.candidates) {
      const { sourceTrack, candidates } = body;
      const result = await matchWithGemini(sourceTrack, candidates);
      return NextResponse.json({
        match: result.match,
        confidence: result.confidence,
      });
    }

    // Handle batch matching (existing functionality)
    const { sourceTracks, direction, targetPlaylistId } = body;

    if (!sourceTracks || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const session = await getSession();
    const targetPlatform = direction === 'spotify_to_youtube' ? 'youtube' : 'spotify';

    // Create search function for target platform
    const searchFn = async (query: string): Promise<UnifiedTrack[]> => {
      if (targetPlatform === 'spotify') {
        if (!session.spotify) {
          throw new Error('Spotify not connected');
        }
        return await searchSpotify(session, query);
      } else {
        return await searchYouTube(query);
      }
    };

    // Get existing tracks if syncing to existing playlist
    const existingIds = new Set<string>();
    // TODO: Implement fetching existing playlist tracks if targetPlaylistId is provided

    // Use Gemini AI for matching
    console.log('[Match API] Starting Gemini AI matching for', sourceTracks.length, 'tracks');
    const results = await batchMatchWithGemini(sourceTracks, searchFn, existingIds);

    console.log('[Match API] Gemini matching complete:', {
      matched: results.filter(r => r.status === 'matched').length,
      lowConfidence: results.filter(r => r.status === 'low_confidence').length,
      notFound: results.filter(r => r.status === 'not_found').length,
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[Match API] Error:', error);
    return NextResponse.json({
      error: error.message || 'Matching failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
