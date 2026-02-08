'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SessionStatus {
  spotify: { connected: boolean; displayName?: string };
  youtube: { connected: boolean; displayName?: string };
  tidal: { connected: boolean; displayName?: string };
  deezer: { connected: boolean; displayName?: string };
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

  function connectTidal() {
    openOAuthPopup('/api/auth/tidal/login', 'Connect Tidal');
  }

  function connectDeezer() {
    openOAuthPopup('/api/auth/deezer/login', 'Connect Deezer');
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

  async function disconnectTidal() {
    try {
      await fetch('/api/auth/tidal/logout', { method: 'POST' });
      fetchSession();
    } catch (error) {
      console.error('Failed to disconnect Tidal:', error);
    }
  }

  async function disconnectDeezer() {
    try {
      await fetch('/api/auth/deezer/logout', { method: 'POST' });
      fetchSession();
    } catch (error) {
      console.error('Failed to disconnect Deezer:', error);
    }
  }

  const connectedCount = [
    session?.spotify.connected,
    session?.youtube.connected,
    session?.tidal.connected,
    session?.deezer.connected,
  ].filter(Boolean).length;

  const bothConnected = session?.spotify.connected && session?.youtube.connected;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-purple-200">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-3">Dashboard</h1>
          <p className="text-purple-200 text-lg">Connect your music platforms to start syncing</p>
          <p className="text-purple-300/70 mt-2">{connectedCount} of 4 platforms connected</p>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Spotify Card */}
          <div className={`group relative bg-gradient-to-br ${session?.spotify.connected ? 'from-green-500 to-green-600' : 'from-gray-800 to-gray-900'} p-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 ${session?.spotify.connected ? 'hover:shadow-green-500/50' : ''}`}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center mb-3">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Spotify</h3>
              {session?.spotify.connected && session.spotify.displayName && (
                <p className="text-white/80 text-sm truncate w-full px-2">{session.spotify.displayName}</p>
              )}
            </div>

            {session?.spotify.connected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-white/90 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Connected</span>
                </div>
                <button
                  onClick={disconnectSpotify}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-200 text-sm font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectSpotify}
                className="w-full px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-all duration-200 font-bold shadow-lg hover:shadow-xl"
              >
                Connect
              </button>
            )}
          </div>

          {/* YouTube Card */}
          <div className={`group relative bg-gradient-to-br ${session?.youtube.connected ? 'from-red-500 to-red-600' : 'from-gray-800 to-gray-900'} p-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 ${session?.youtube.connected ? 'hover:shadow-red-500/50' : ''}`}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center mb-3">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">YouTube</h3>
              {session?.youtube.connected && session.youtube.displayName && (
                <p className="text-white/80 text-sm truncate w-full px-2">{session.youtube.displayName}</p>
              )}
            </div>

            {session?.youtube.connected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-white/90 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Connected</span>
                </div>
                <button
                  onClick={disconnectYouTube}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-200 text-sm font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectYouTube}
                className="w-full px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-all duration-200 font-bold shadow-lg hover:shadow-xl"
              >
                Connect
              </button>
            )}
          </div>

          {/* Tidal Card */}
          <div className={`group relative bg-gradient-to-br ${session?.tidal.connected ? 'from-cyan-500 to-blue-600' : 'from-gray-800 to-gray-900'} p-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 ${session?.tidal.connected ? 'hover:shadow-cyan-500/50' : ''}`}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center mb-3">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.012 3.992L8 8.004 12.012 12l4.004-3.996L12.012 3.992zm0 8.016l-4.004 4.004 4.004 3.992 4.004-3.992-4.004-4.004zM5.996 8L2 11.996 6.004 16l3.996-4.004L5.996 8zM18.016 8l-4.004 3.996L18.016 16l3.996-4.004L18.016 8z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Tidal</h3>
              {session?.tidal.connected && session.tidal.displayName && (
                <p className="text-white/80 text-sm truncate w-full px-2">{session.tidal.displayName}</p>
              )}
            </div>

            {session?.tidal.connected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-white/90 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Connected</span>
                </div>
                <button
                  onClick={disconnectTidal}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-200 text-sm font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectTidal}
                className="w-full px-4 py-2 bg-white text-cyan-600 rounded-lg hover:bg-gray-100 transition-all duration-200 font-bold shadow-lg hover:shadow-xl"
              >
                Connect
              </button>
            )}
          </div>

          {/* Deezer Card */}
          <div className={`group relative bg-gradient-to-br ${session?.deezer.connected ? 'from-orange-500 to-pink-600' : 'from-gray-800 to-gray-900'} p-6 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 ${session?.deezer.connected ? 'hover:shadow-orange-500/50' : ''}`}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center mb-3">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.81 5.28h3.31v3.29h-3.31V5.28zm0 5.42h3.31v3.29h-3.31V10.7zm0 5.41h3.31v3.3h-3.31v-3.3zM14.46 10.7h3.3v3.29h-3.3V10.7zm0 5.41h3.3v3.3h-3.3v-3.3zm0-10.83h3.3v3.29h-3.3V5.28zm-4.35 10.83h3.3v3.3h-3.3v-3.3zm0-5.42h3.3v3.29h-3.3V10.7zm0-5.42h3.3v3.29h-3.3V5.28zM5.76 16.11h3.3v3.3h-3.3v-3.3zm0-5.41h3.3v3.29h-3.3V10.7zm-4.35 5.41h3.3v3.3h-3.3v-3.3zm0-5.41h3.3v3.29h-3.3V10.7z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Deezer</h3>
              {session?.deezer.connected && session.deezer.displayName && (
                <p className="text-white/80 text-sm truncate w-full px-2">{session.deezer.displayName}</p>
              )}
            </div>

            {session?.deezer.connected ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-white/90 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Connected</span>
                </div>
                <button
                  onClick={disconnectDeezer}
                  className="w-full px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-200 text-sm font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectDeezer}
                className="w-full px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-gray-100 transition-all duration-200 font-bold shadow-lg hover:shadow-xl"
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Ready to Sync Banner */}
        {bothConnected && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 rounded-2xl shadow-2xl text-center transform hover:scale-105 transition-all duration-300 mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Ready to Sync!</h2>
            <p className="text-white/90 mb-6 text-lg">
              {connectedCount} platforms connected. Start transferring your music now.
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

        {/* Smart Import - Only requires Spotify */}
        {session?.spotify.connected && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 shadow-2xl">
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
