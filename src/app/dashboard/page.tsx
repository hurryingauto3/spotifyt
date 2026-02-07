'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SessionStatus {
  spotify: { connected: boolean; displayName?: string };
  youtube: { connected: boolean; displayName?: string };
}

export default function Dashboard() {
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();

    // Listen for messages from OAuth popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'auth_success') {
        fetchSession();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setSession(data);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  }

  function openOAuthPopup(url: string, title: string) {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  function connectSpotify() {
    openOAuthPopup('/api/auth/spotify/login', 'Connect Spotify');
  }

  function connectYouTube() {
    openOAuthPopup('/api/auth/youtube/login', 'Connect YouTube');
  }

  async function disconnectSpotify() {
    try {
      await fetch('/api/auth/spotify/logout', { method: 'POST' });
      fetchSession();
    } catch (error) {
      console.error('Failed to disconnect Spotify:', error);
    }
  }

  async function disconnectYouTube() {
    try {
      await fetch('/api/auth/youtube/logout', { method: 'POST' });
      fetchSession();
    } catch (error) {
      console.error('Failed to disconnect YouTube:', error);
    }
  }

  const bothConnected = session?.spotify.connected && session?.youtube.connected;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-3">Dashboard</h1>
          <p className="text-purple-200 text-lg">Connect your accounts to start syncing music</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Spotify Card */}
          <div className={`group relative bg-gradient-to-br ${session?.spotify.connected ? 'from-green-500 to-green-600' : 'from-gray-800 to-gray-900'} p-8 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-green-500/50`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Spotify</h2>
                  {session?.spotify.connected && (
                    <p className="text-white/80 text-sm">{session.spotify.displayName}</p>
                  )}
                </div>
              </div>
            </div>

            {session?.spotify.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Connected & Ready</span>
                </div>
                <button
                  onClick={disconnectSpotify}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectSpotify}
                className="w-full px-6 py-4 bg-white text-green-600 rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl"
              >
                Connect Spotify
              </button>
            )}
          </div>

          {/* YouTube Card */}
          <div className={`group relative bg-gradient-to-br ${session?.youtube.connected ? 'from-red-500 to-red-600' : 'from-gray-800 to-gray-900'} p-8 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-red-500/50`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">YouTube</h2>
                  {session?.youtube.connected && (
                    <p className="text-white/80 text-sm">{session.youtube.displayName}</p>
                  )}
                </div>
              </div>
            </div>

            {session?.youtube.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Connected & Ready</span>
                </div>
                <button
                  onClick={disconnectYouTube}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectYouTube}
                className="w-full px-6 py-4 bg-white text-red-600 rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl"
              >
                Connect YouTube
              </button>
            )}
          </div>
        </div>

        {bothConnected && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 rounded-2xl shadow-2xl text-center transform hover:scale-105 transition-all duration-300">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Ready to Sync!</h2>
            <p className="text-white/90 mb-6 text-lg">
              Both accounts are connected. Start transferring your music now.
            </p>
            <Link
              href="/sync"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl hover:bg-gray-100 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl"
            >
              <span>Start Sync</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

        {!bothConnected && (
          <div className="bg-yellow-500/10 backdrop-blur-lg border border-yellow-500/30 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-3 text-yellow-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-lg font-medium">Connect both Spotify and YouTube to start syncing</span>
            </div>
          </div>
        )}

        {/* Smart Import - Only requires Spotify */}
        {session?.spotify.connected && (
          <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 shadow-2xl">
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">🤖 Smart Import</h3>
                <p className="text-purple-200 mb-4">
                  Paste any song list (from websites, notes, YouTube descriptions) and let AI parse it for you!
                </p>
                <ul className="text-purple-200/70 text-sm space-y-1 mb-4">
                  <li>• Works with any format - numbered lists, "Artist - Song", etc.</li>
                  <li>• Gemini AI automatically extracts titles and artists</li>
                  <li>• Add to Liked Songs or create a new playlist</li>
                </ul>
                <Link
                  href="/import"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-bold shadow-lg hover:shadow-blue-500/50"
                >
                  <span>Try Smart Import</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
