import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPlaylistTracks } from '@/lib/youtube/client';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session.youtube) {
      return NextResponse.json({ error: 'YouTube not connected' }, { status: 401 });
    }

    const tracks = await getPlaylistTracks(session, id);

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error('YouTube playlist tracks error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch playlist tracks' }, { status: 500 });
  }
}
