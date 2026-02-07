'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ParsedSong {
  title: string;
  artist: string;
}

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  uri: string;
}

interface MatchResult {
  parsed: ParsedSong;
  match: SpotifyTrack | null;
  confidence: number;
  status: 'matched' | 'low_confidence' | 'not_found';
}

export default function ImportPreview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [syncMode, setSyncMode] = useState<'playlist' | 'liked'>('playlist');
  const [playlistName, setPlaylistName] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadAndMatch();
  }, []);

  async function loadAndMatch() {
    try {
      // Get parsed songs from sessionStorage
      const stored = sessionStorage.getItem('importedSongs');
      if (!stored) {
        router.push('/import');
        return;
      }

      const parsedSongs: ParsedSong[] = JSON.parse(stored);
      setLoading(false);
      setMatching(true);
      setProgress({ current: 0, total: parsedSongs.length });

      // Match each song on Spotify
      const matchResults: MatchResult[] = [];

      for (let i = 0; i < parsedSongs.length; i++) {
        const song = parsedSongs[i];

        // Search Spotify
        const searchRes = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${song.artist} ${song.title}`,
            platform: 'spotify',
          }),
        });

        const searchData = await searchRes.json();
        const candidates = searchData.results || [];

        // Simple matching: take first result with confidence based on similarity
        let match: SpotifyTrack | null = null;
        let confidence = 0;
        let status: 'matched' | 'low_confidence' | 'not_found' = 'not_found';

        if (candidates.length > 0) {
          const candidate = candidates[0];
          match = candidate;

          // Simple confidence: check title and artist similarity
          const titleMatch = candidate.title.toLowerCase().includes(song.title.toLowerCase()) ||
                           song.title.toLowerCase().includes(candidate.title.toLowerCase());
          const artistMatch = candidate.artist.toLowerCase().includes(song.artist.toLowerCase()) ||
                            song.artist.toLowerCase().includes(candidate.artist.toLowerCase());

          if (titleMatch && artistMatch) {
            confidence = 0.90;
            status = 'matched';
          } else if (titleMatch || artistMatch) {
            confidence = 0.65;
            status = 'low_confidence';
          } else {
            confidence = 0.40;
            status = 'low_confidence';
          }
        }

        matchResults.push({ parsed: song, match, confidence, status });
        setProgress({ current: i + 1, total: parsedSongs.length });
        setResults([...matchResults]); // Update UI in real-time

        // Rate limit
        await delay(200);
      }

      setMatching(false);
    } catch (error) {
      console.error('Failed to match songs:', error);
      setMatching(false);
    }
  }

  function handleAdd() {
    const tracksToAdd = results.filter(r => r.match && (r.status === 'matched' || r.status === 'low_confidence'));
    sessionStorage.setItem('importResults', JSON.stringify({
      results: tracksToAdd,
      syncMode,
      playlistName: syncMode === 'playlist'
        ? (playlistName.trim() || `Imported Playlist - ${new Date().toLocaleDateString()}`)
        : undefined,
    }));
    router.push('/import/result');
  }

  const filteredResults = results.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const stats = {
    matched: results.filter((r) => r.status === 'matched').length,
    lowConfidence: results.filter((r) => r.status === 'low_confidence').length,
    notFound: results.filter((r) => r.status === 'not_found').length,
    totalToAdd: results.filter((r) => r.match && (r.status === 'matched' || r.status === 'low_confidence')).length,
  };

  if (loading || matching) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white mb-3">
            {loading ? 'Loading...' : 'Searching Spotify...'}
          </div>
          {matching && progress.total > 0 && (
            <div className="mt-4 space-y-3">
              <div className="text-purple-200">
                {progress.current} of {progress.total} songs searched
              </div>
              <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/import"
            className="inline-flex items-center gap-2 text-purple-200 hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Import
          </Link>
          <h1 className="text-4xl font-bold text-white mb-3">Review Matches</h1>
          <p className="text-purple-200 text-lg">Found {stats.totalToAdd} songs on Spotify</p>
        </div>

        {/* Sync Mode Selector */}
        <div className="mb-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-2xl">
          <label className="block text-white font-medium mb-3">Where to add tracks?</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSyncMode('playlist')}
              className={`p-4 rounded-xl border-2 transition-all ${
                syncMode === 'playlist'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500 shadow-lg'
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              <div className="text-white font-semibold mb-1">New Playlist</div>
              <div className="text-purple-200/70 text-sm">Create a new playlist</div>
            </button>
            <button
              onClick={() => setSyncMode('liked')}
              className={`p-4 rounded-xl border-2 transition-all ${
                syncMode === 'liked'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500 shadow-lg'
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              <div className="text-white font-semibold mb-1">Liked Songs</div>
              <div className="text-purple-200/70 text-sm">Add to your liked songs</div>
            </button>
          </div>
        </div>

        {/* Playlist Name Input */}
        {syncMode === 'playlist' && (
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
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg p-6 rounded-2xl border border-green-500/30 shadow-lg">
            <div className="text-3xl font-bold text-green-400">{stats.matched}</div>
            <div className="text-sm text-green-200/80">Matched</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg p-6 rounded-2xl border border-yellow-500/30 shadow-lg">
            <div className="text-3xl font-bold text-yellow-400">{stats.lowConfidence}</div>
            <div className="text-sm text-yellow-200/80">Low Confidence</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-lg p-6 rounded-2xl border border-red-500/30 shadow-lg">
            <div className="text-3xl font-bold text-red-400">{stats.notFound}</div>
            <div className="text-sm text-red-200/80">Not Found</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 mb-6 shadow-2xl">
          <div className="p-5 border-b border-white/10">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                All ({results.length})
              </button>
              <button
                onClick={() => setFilter('matched')}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${
                  filter === 'matched'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                    : 'bg-white/10 text-green-300 hover:bg-white/20'
                }`}
              >
                Matched ({stats.matched})
              </button>
              <button
                onClick={() => setFilter('low_confidence')}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${
                  filter === 'low_confidence'
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg'
                    : 'bg-white/10 text-yellow-300 hover:bg-white/20'
                }`}
              >
                Low ({stats.lowConfidence})
              </button>
              <button
                onClick={() => setFilter('not_found')}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${
                  filter === 'not_found'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                    : 'bg-white/10 text-red-300 hover:bg-white/20'
                }`}
              >
                Missing ({stats.notFound})
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
            {filteredResults.map((result, idx) => (
              <div key={idx} className="p-5 grid grid-cols-2 gap-6 items-center hover:bg-white/5 transition-colors">
                <div>
                  <div className="font-semibold text-white">{result.parsed.title}</div>
                  <div className="text-sm text-purple-200/70">{result.parsed.artist}</div>
                  <div className="text-xs text-purple-300/50 mt-1">From text</div>
                </div>
                <div>
                  {result.match ? (
                    <>
                      <div className="font-semibold text-white">{result.match.title}</div>
                      <div className="text-sm text-purple-200/70">{result.match.artist}</div>
                      {result.match.album && (
                        <div className="text-xs text-purple-300/50 mt-1">{result.match.album}</div>
                      )}
                      <div className={`text-xs font-medium mt-1 ${
                        result.status === 'matched' ? 'text-green-400' :
                        result.status === 'low_confidence' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
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

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => router.push('/import')}
            className="px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium backdrop-blur-lg"
          >
            ← Back
          </button>
          <button
            onClick={handleAdd}
            disabled={stats.totalToAdd === 0}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-bold shadow-lg hover:shadow-purple-500/50 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {syncMode === 'liked'
              ? `Add ${stats.totalToAdd} to Liked Songs →`
              : `Add ${stats.totalToAdd} to Playlist →`
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
