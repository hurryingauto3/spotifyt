'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UnifiedTrack } from '@/lib/matching/types';
import { useGeminiMatching } from '@/hooks/use-gemini-matching';

interface MatchResult {
  source: UnifiedTrack;
  target: UnifiedTrack | null;
  confidence: number;
  status: 'matched' | 'low_confidence' | 'not_found' | 'already_exists';
}

function PreviewMatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const direction = searchParams.get('direction');
  const playlistIds = searchParams.get('playlists')?.split(',') || [];

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [playlistName, setPlaylistName] = useState('');
  const { matchTracks, isMatching, progress, cancelMatching } = useGeminiMatching();

  useEffect(() => {
    fetchAndMatch();
    // Set default playlist name
    const targetPlatform = direction === 'spotify_to_youtube' ? 'YouTube' : 'Spotify';
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setPlaylistName(`Synced to ${targetPlatform} - ${date}`);
  }, []);

  async function fetchAndMatch() {
    try {
      setLoading(true);
      const sourcePlatform = direction === 'spotify_to_youtube' ? 'spotify' : 'youtube';
      const targetPlatform = direction === 'spotify_to_youtube' ? 'youtube' : 'spotify';

      // Fetch tracks from selected playlists
      const allTracks: UnifiedTrack[] = [];
      for (const playlistId of playlistIds) {
        const endpoint = sourcePlatform === 'spotify'
          ? `/api/spotify/playlist/${playlistId}`
          : `/api/youtube/playlist/${playlistId}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        allTracks.push(...data.tracks);
      }

      setLoading(false);

      // Client-side parallelized Gemini AI matching
      const searchFn = async (query: string) => {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, platform: targetPlatform }),
        });
        const data = await res.json();
        return data.results || [];
      };

      const existingIds = new Set<string>();
      const matchResults = await matchTracks(allTracks, searchFn, existingIds);
      setResults(matchResults);
    } catch (error) {
      console.error('Failed to match tracks:', error);
    }
  }

  function handleSync() {
    // Sync all tracks that have a match (excluding not_found and already_exists)
    const tracksToSync = results.filter(r =>
      r.target !== null && r.status !== 'already_exists'
    );
    sessionStorage.setItem('syncResults', JSON.stringify({
      results: tracksToSync,
      direction,
      playlistName: playlistName.trim() || `Synced Playlist - ${new Date().toLocaleDateString()}`
    }));
    router.push(`/sync/result?direction=${direction}`);
  }

  const filteredResults = results.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const stats = {
    matched: results.filter((r) => r.status === 'matched').length,
    lowConfidence: results.filter((r) => r.status === 'low_confidence').length,
    notFound: results.filter((r) => r.status === 'not_found').length,
    alreadyExists: results.filter((r) => r.status === 'already_exists').length,
    totalToSync: results.filter((r) => r.target !== null && r.status !== 'already_exists').length,
  };

  if (loading || isMatching) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white mb-3">
            {loading ? 'Loading tracks...' : 'Matching tracks...'}
          </div>
          {isMatching && progress.total > 0 && (
            <div className="mt-4 space-y-3">
              <div className="text-purple-200">
                {progress.current} of {progress.total} tracks processed
              </div>
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <button
                onClick={cancelMatching}
                className="mt-4 px-6 py-2 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/10 transition-all"
              >
                Cancel
              </button>
            </div>
          )}
          {!isMatching && (
            <div className="text-purple-200">This may take a minute</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">Preview Sync</h1>
          <p className="text-purple-200 text-lg">Step 3 of 4: Review matched tracks</p>
        </div>

        {/* Playlist Name Input */}
        <div className="mb-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
          <label className="block text-white font-medium mb-2">Playlist Name</label>
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Enter playlist name..."
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg p-6 rounded-2xl border border-green-500/30 shadow-lg hover:scale-105 transition-transform">
            <div className="text-3xl font-bold text-green-400">{stats.matched}</div>
            <div className="text-sm text-green-200/80">Matched</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg p-6 rounded-2xl border border-yellow-500/30 shadow-lg hover:scale-105 transition-transform">
            <div className="text-3xl font-bold text-yellow-400">{stats.lowConfidence}</div>
            <div className="text-sm text-yellow-200/80">Low Confidence</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-lg p-6 rounded-2xl border border-red-500/30 shadow-lg hover:scale-105 transition-transform">
            <div className="text-3xl font-bold text-red-400">{stats.notFound}</div>
            <div className="text-sm text-red-200/80">Not Found</div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-lg hover:scale-105 transition-transform">
            <div className="text-3xl font-bold text-purple-300">{stats.alreadyExists}</div>
            <div className="text-sm text-purple-200/70">Already Exists</div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 mb-6 shadow-2xl">
          <div className="p-5 border-b border-white/10">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${filter === 'all' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-white/10 text-purple-200 hover:bg-white/20'}`}
              >
                All ({results.length})
              </button>
              <button
                onClick={() => setFilter('matched')}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${filter === 'matched' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' : 'bg-white/10 text-green-300 hover:bg-white/20'}`}
              >
                Matched ({stats.matched})
              </button>
              <button
                onClick={() => setFilter('low_confidence')}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${filter === 'low_confidence' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg' : 'bg-white/10 text-yellow-300 hover:bg-white/20'}`}
              >
                Low ({stats.lowConfidence})
              </button>
              <button
                onClick={() => setFilter('not_found')}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${filter === 'not_found' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' : 'bg-white/10 text-red-300 hover:bg-white/20'}`}
              >
                Missing ({stats.notFound})
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
            {filteredResults.map((result, idx) => (
              <div key={idx} className="p-5 grid grid-cols-2 gap-6 items-center hover:bg-white/5 transition-colors">
                <div>
                  <div className="font-semibold text-white">{result.source.title}</div>
                  <div className="text-sm text-purple-200/70">{result.source.artist}</div>
                </div>
                <div>
                  {result.target ? (
                    <>
                      <div className="font-semibold text-white">{result.target.title}</div>
                      <div className="text-sm text-purple-200/70">{result.target.artist}</div>
                      <div className="text-xs text-purple-300/60 mt-1 font-medium">
                        {(result.confidence * 100).toFixed(0)}% match
                      </div>
                    </>
                  ) : (
                    <div className="text-purple-400/50 italic">No match found</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => router.back()}
            className="px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium backdrop-blur-lg"
          >
            ← Back
          </button>
          <button
            onClick={handleSync}
            disabled={stats.totalToSync === 0}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-bold shadow-lg hover:shadow-purple-500/50 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Sync {stats.totalToSync} Tracks →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreviewMatches() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
        <div className="text-purple-200 text-lg">Loading...</div>
      </div>
    }>
      <PreviewMatchesContent />
    </Suspense>
  );
}
