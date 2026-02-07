import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { addToLiked, addToPlaylist, createPlaylist } from '@/lib/spotify/client';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const { tracks, syncMode, playlistName } = await request.json();

    if (!session.spotify) {
      return NextResponse.json({ error: 'Spotify not connected' }, { status: 401 });
    }

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ error: 'No tracks provided' }, { status: 400 });
    }

    const trackUris = tracks.map((t: any) => t.id || t.uri).filter(Boolean);

    if (trackUris.length === 0) {
      return NextResponse.json({ error: 'No valid track URIs' }, { status: 400 });
    }

    let playlistUrl = '';
    let added = 0;
    let failed = 0;

    try {
      if (syncMode === 'liked') {
        // Add to Liked Songs
        await addToLiked(session, trackUris);
        playlistUrl = 'https://open.spotify.com/collection/tracks';
        added = trackUris.length;
      } else {
        // Create new playlist and add tracks
        const finalPlaylistName = playlistName || `Imported Playlist - ${new Date().toLocaleDateString()}`;
        const playlist = await createPlaylist(
          session,
          finalPlaylistName,
          `Imported via SpotifyT on ${new Date().toLocaleDateString()}`
        );

        await addToPlaylist(session, playlist.id, trackUris);
        playlistUrl = playlist.url;
        added = trackUris.length;
      }
    } catch (error) {
      console.error('Failed to add tracks:', error);
      failed = trackUris.length;
    }

    return NextResponse.json({
      success: true,
      added,
      failed,
      playlistUrl,
    });
  } catch (error: any) {
    console.error('[Import Add API] Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to add tracks',
    }, { status: 500 });
  }
}
