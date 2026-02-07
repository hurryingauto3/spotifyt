import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserPlaylists, getLikedSongs } from '@/lib/spotify/client';

export async function GET() {
  try {
    const session = await getSession();

    if (!session.spotify) {
      return NextResponse.json({ error: 'Spotify not connected' }, { status: 401 });
    }

    const playlists = await getUserPlaylists(session);

    // Add "Liked Songs" as a special playlist
    const likedSongs = await getLikedSongs(session);
    const allPlaylists = [
      {
        id: 'liked',
        name: 'Liked Songs',
        trackCount: likedSongs.length,
        imageUrl: null,
      },
      ...playlists,
    ];

    return NextResponse.json({ playlists: allPlaylists });
  } catch (error: any) {
    console.error('Spotify playlists error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch playlists' }, { status: 500 });
  }
}
