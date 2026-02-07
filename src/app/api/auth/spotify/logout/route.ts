import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();

    // Clear Spotify session
    delete session.spotify;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Spotify logout error:', error);
    return NextResponse.json({ error: 'Failed to logout from Spotify' }, { status: 500 });
  }
}
