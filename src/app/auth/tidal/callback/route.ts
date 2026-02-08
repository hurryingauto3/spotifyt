/**
 * Tidal OAuth Callback Handler
 *
 * Handles the OAuth callback from Tidal after user authorization.
 * Exchanges authorization code for access tokens and stores in session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('[Tidal Auth] OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?error=tidal_${error}`, request.url)
    );
  }

  // Validate authorization code
  if (!code) {
    console.error('[Tidal Auth] No authorization code received');
    return NextResponse.redirect(
      new URL('/?error=tidal_no_code', request.url)
    );
  }

  try {
    console.log('[Tidal Auth] Processing callback...');

    // Get Tidal provider
    const provider = getProvider('tidal');

    // Exchange code for tokens
    const tokens = await provider.handleCallback(code);
    console.log('[Tidal Auth] Tokens received, expires in:', tokens.expiresIn);

    // Store tokens in session
    const session = await getSession();
    session.tidal = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };
    await session.save();

    console.log('[Tidal Auth] Session saved successfully');

    // Redirect to home page
    return NextResponse.redirect(new URL('/?tidal=connected', request.url));
  } catch (error) {
    console.error('[Tidal Auth] Authentication failed:', error);
    return NextResponse.redirect(
      new URL('/?error=tidal_auth_failed', request.url)
    );
  }
}
