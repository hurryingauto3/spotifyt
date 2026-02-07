import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { searchTrack as searchSpotify } from '@/lib/spotify/client';
import { searchYTMusicSong as searchYouTube } from '@/lib/youtube/ytmusic-client';
import { UnifiedTrack } from '@/lib/matching/types';

export async function POST(request: Request) {
  try {
    const { query, platform } = await request.json();

    if (!query || !platform) {
      return NextResponse.json({ error: 'Missing query or platform' }, { status: 400 });
    }

    const session = await getSession();

    let results: UnifiedTrack[] = [];

    if (platform === 'spotify') {
      if (!session.spotify) {
        return NextResponse.json({ error: 'Spotify not connected' }, { status: 401 });
      }
      results = await searchSpotify(session, query);
    } else if (platform === 'youtube') {
      // YouTube search doesn't require auth (using ytmusic-api)
      results = await searchYouTube(query);
    } else {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[Search API] Error:', error);
    return NextResponse.json({
      error: error.message || 'Search failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
