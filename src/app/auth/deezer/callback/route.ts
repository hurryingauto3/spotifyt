/**
 * Deezer OAuth Callback Handler
 *
 * Handles the OAuth callback from Deezer after user authorization.
 * Exchanges authorization code for access tokens and stores in session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error_reason');

  // Handle OAuth errors
  if (error) {
    console.error('[Deezer Auth] OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?error=deezer_${error}`, request.url)
    );
  }

  // Validate authorization code
  if (!code) {
    console.error('[Deezer Auth] No authorization code received');
    return NextResponse.redirect(
      new URL('/?error=deezer_no_code', request.url)
    );
  }

  try {
    console.log('[Deezer Auth] Processing callback...');

    // Get Deezer provider
    const provider = getProvider('deezer');

    // Exchange code for tokens
    const tokens = await provider.handleCallback(code);
    console.log('[Deezer Auth] Tokens received');

    // Store tokens in session
    const session = await getSession();
    session.deezer = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };
    await session.save();

    console.log('[Deezer Auth] Session saved successfully');

    // Redirect to home page
    return NextResponse.redirect(new URL('/?deezer=connected', request.url));
  } catch (error) {
    console.error('[Deezer Auth] Authentication failed:', error);
    return NextResponse.redirect(
      new URL('/?error=deezer_auth_failed', request.url)
    );
  }
}
