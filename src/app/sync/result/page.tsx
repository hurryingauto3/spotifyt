'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SyncResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const direction = searchParams.get('direction');

  const [syncing, setSyncing] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    executeSync();
  }, []);

  async function executeSync() {
    try {
      // Get results from sessionStorage
      const storedData = sessionStorage.getItem('syncResults');
      if (!storedData) {
        setError('No sync data found');
        setSyncing(false);
        return;
      }

      const { results, direction: syncDirection } = JSON.parse(storedData);

      // Execute sync
      const res = await fetch('/api/sync/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchResults: results,
          direction: syncDirection,
          createNew: true,
          targetPlaylistName: `Synced from ${syncDirection === 'spotify_to_youtube' ? 'Spotify' : 'YouTube Music'} - ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }

      // Clear sessionStorage
      sessionStorage.removeItem('syncResults');
    } catch (err: any) {
      setError(err.message || 'Failed to execute sync');
    } finally {
      setSyncing(false);
    }
  }

  if (syncing) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white mb-3">Syncing tracks...</div>
          <div className="text-purple-200">Please wait, this may take a few minutes</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-500/10 backdrop-blur-lg border border-red-500/30 rounded-2xl p-10 shadow-2xl">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-red-400 mb-4">Sync Failed</h1>
            <p className="text-red-200 mb-8 text-lg">{error}</p>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-bold shadow-lg"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">Sync Complete!</h1>
          <p className="text-purple-200 text-lg">Step 4 of 4: Results</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-lg border border-green-500/30 rounded-2xl p-10 mb-8 text-center shadow-2xl">
          <div className="text-7xl mb-6">✓</div>
          <h2 className="text-3xl font-bold text-white mb-8">Successfully synced your music!</h2>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-2xl border border-green-500/30">
              <div className="text-4xl font-bold text-green-400">{result?.added || 0}</div>
              <div className="text-sm text-green-200/80 mt-2">Tracks Added</div>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
              <div className="text-4xl font-bold text-purple-300">{result?.failed || 0}</div>
              <div className="text-sm text-purple-200/70 mt-2">Failed</div>
            </div>
          </div>

          {result?.playlistUrl && (
            <a
              href={result.playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-blue-500/50 mb-4"
            >
              <span>Open Playlist</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/sync"
            className="px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium backdrop-blur-lg"
          >
            Sync Another Playlist
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-bold shadow-lg hover:shadow-purple-500/50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SyncResult() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
        <div className="text-purple-200 text-lg">Loading...</div>
      </div>
    }>
      <SyncResultContent />
    </Suspense>
  );
}
