import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { matchTracks, deduplicateResults } from '@/lib/matching/matcher';
import { UnifiedTrack } from '@/lib/matching/types';
import { searchTrack } from '@/lib/spotify/client';
import { searchYouTube } from '@/lib/youtube/client';
import { getExistingTrackIds } from '@/lib/sync/dedup';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();

    const {
      sourceTracks,
      direction,
      targetPlaylistId,
    }: {
      sourceTracks: UnifiedTrack[];
      direction: 'spotify_to_youtube' | 'youtube_to_spotify';
      targetPlaylistId?: string;
    } = body;

    if (!sourceTracks || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate authentication
    if (direction === 'spotify_to_youtube' && !session.youtube) {
      return NextResponse.json({ error: 'YouTube not connected' }, { status: 401 });
    }
    if (direction === 'youtube_to_spotify' && !session.spotify) {
      return NextResponse.json({ error: 'Spotify not connected' }, { status: 401 });
    }

    // Check match cache first
    const cachedMatches = await prisma.matchCache.findMany({
      where: {
        sourceTrackId: { in: sourceTracks.map((t) => t.id) },
        direction,
        expiresAt: { gte: new Date() },
      },
    });

    const cacheMap = new Map(cachedMatches.map((m) => [m.sourceTrackId, m]));

    // Determine search function based on direction
    const searchFn = async (query: string) => {
      if (direction === 'spotify_to_youtube') {
        return searchYouTube(session, query);
      } else {
        return searchTrack(session, query);
      }
    };

    // Get existing tracks in target playlist for dedup
    const targetPlatform = direction === 'spotify_to_youtube' ? 'youtube' : 'spotify';
    const existingIds = await getExistingTrackIds(session, targetPlatform, targetPlaylistId || null);

    // Match tracks
    const results = await matchTracks(sourceTracks, searchFn, existingIds);

    // Deduplicate within batch
    const dedupedResults = deduplicateResults(results);

    // Cache new matches
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    for (const result of dedupedResults) {
      if (result.target && result.status === 'matched' && !cacheMap.has(result.source.id)) {
        await prisma.matchCache.upsert({
          where: {
            sourceTrackId_direction: {
              sourceTrackId: result.source.id,
              direction,
            },
          },
          update: {
            targetTrackId: result.target.id,
            confidence: result.confidence,
            expiresAt,
          },
          create: {
            sourceTrackId: result.source.id,
            targetTrackId: result.target.id,
            confidence: result.confidence,
            direction,
            expiresAt,
          },
        });
      }
    }

    // Calculate stats
    const stats = {
      matched: dedupedResults.filter((r) => r.status === 'matched').length,
      lowConfidence: dedupedResults.filter((r) => r.status === 'low_confidence').length,
      notFound: dedupedResults.filter((r) => r.status === 'not_found').length,
      alreadyExists: dedupedResults.filter((r) => r.status === 'already_exists').length,
    };

    return NextResponse.json({ results: dedupedResults, stats });
  } catch (error: any) {
    console.error('Match error:', error);
    return NextResponse.json({ error: error.message || 'Failed to match tracks' }, { status: 500 });
  }
}
