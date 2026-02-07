import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();

    // Clear YouTube session
    delete session.youtube;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('YouTube logout error:', error);
    return NextResponse.json({ error: 'Failed to logout from YouTube' }, { status: 500 });
  }
}
