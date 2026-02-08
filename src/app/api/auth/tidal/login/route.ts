import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getProvider } from '@/lib/providers';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const session = await getSession();

    // Generate state for CSRF protection
    const state = randomBytes(16).toString('hex');
    session.tidalState = state;
    await session.save();

    const provider = getProvider('tidal');
    const authUrl = provider.getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Tidal login error:', error);
    return NextResponse.json({ error: 'Failed to initiate Tidal login' }, { status: 500 });
  }
}
