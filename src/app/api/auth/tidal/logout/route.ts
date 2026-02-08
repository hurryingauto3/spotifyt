import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    session.tidal = undefined;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tidal logout error:', error);
    return NextResponse.json({ error: 'Failed to logout from Tidal' }, { status: 500 });
  }
}
