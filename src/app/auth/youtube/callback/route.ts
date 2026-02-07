import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { exchangeYouTubeCode } from '@/lib/youtube/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return new NextResponse(
        `<html><body><script>
          if (window.opener) {
            window.opener.postMessage('auth_error', '*');
            window.close();
          } else {
            window.location.href = '/dashboard?error=${error}';
          }
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new NextResponse(
        `<html><body><script>
          if (window.opener) {
            window.opener.postMessage('auth_error', '*');
            window.close();
          } else {
            window.location.href = '/dashboard?error=missing_params';
          }
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const session = await getSession();

    // Verify state for CSRF protection
    if (state !== session.youtubeState) {
      return new NextResponse(
        `<html><body><script>
          if (window.opener) {
            window.opener.postMessage('auth_error', '*');
            window.close();
          } else {
            window.location.href = '/dashboard?error=invalid_state';
          }
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Exchange code for tokens
    const youtubeSession = await exchangeYouTubeCode(code);

    // Store in session
    session.youtube = youtubeSession;
    delete session.youtubeState;
    await session.save();

    // Close popup and notify parent
    return new NextResponse(
      `<html><body><script>
        if (window.opener) {
          window.opener.postMessage('auth_success', '*');
          window.close();
        } else {
          window.location.href = '/dashboard';
        }
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('YouTube callback error:', error);
    return new NextResponse(
      `<html><body><script>
        if (window.opener) {
          window.opener.postMessage('auth_error', '*');
          window.close();
        } else {
          window.location.href = '/dashboard?error=auth_failed';
        }
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
