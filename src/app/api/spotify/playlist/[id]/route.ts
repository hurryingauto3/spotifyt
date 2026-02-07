import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPlaylistTracks, getLikedSongs } from '@/lib/spotify/client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session.spotify) {
      return NextResponse.json({ error: 'Spotify not connected' }, { status: 401 });
    }

    const tracks = id === 'liked'
      ? await getLikedSongs(session)
      : await getPlaylistTracks(session, id);

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error('Spotify playlist tracks error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch playlist tracks' }, { status: 500 });
  }
}
