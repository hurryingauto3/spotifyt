import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();

    return NextResponse.json({
      spotify: session.spotify
        ? {
            connected: true,
            displayName: session.spotify.displayName,
          }
        : { connected: false },
      youtube: session.youtube
        ? {
            connected: true,
            displayName: session.youtube.displayName,
          }
        : { connected: false },
      tidal: session.tidal
        ? {
            connected: true,
            displayName: session.tidal.displayName,
          }
        : { connected: false },
      deezer: session.deezer
        ? {
            connected: true,
            displayName: session.deezer.displayName,
          }
        : { connected: false },
    });
  } catch (error) {
    console.error('Session status error:', error);
    return NextResponse.json({ error: 'Failed to get session status' }, { status: 500 });
  }
}
