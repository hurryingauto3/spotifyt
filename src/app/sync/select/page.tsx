'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  imageUrl?: string | null;
}

function SelectPlaylistsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const direction = searchParams.get('direction');

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const sourcePlatform = direction === 'spotify_to_youtube' ? 'spotify' : 'youtube';
  const targetPlatform = direction === 'spotify_to_youtube' ? 'youtube' : 'spotify';

  useEffect(() => {
    fetchPlaylists();
  }, []);

  async function fetchPlaylists() {
    try {
      const endpoint = sourcePlatform === 'spotify' ? '/api/spotify/playlists' : '/api/youtube/playlists';
      const res = await fetch(endpoint);
      const data = await res.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    } finally {
      setLoading(false);
    }
  }

  function togglePlaylist(id: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  }

  function handleNext() {
    if (selected.size > 0) {
      const ids = Array.from(selected).join(',');
      router.push(`/sync/preview?direction=${direction}&playlists=${ids}`);
    }
  }

  const selectedPlaylists = playlists.filter((p) => selected.has(p.id));
  const totalTracks = selectedPlaylists.reduce((sum, p) => sum + p.trackCount, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
        <div className="text-purple-200 text-lg">Loading playlists...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">Select Playlists</h1>
          <p className="text-purple-200 text-lg">Step 2 of 4: Choose playlists to sync</p>
          <div className="mt-3 text-purple-300/80 font-medium">
            From: {sourcePlatform === 'spotify' ? 'Spotify' : 'YouTube Music'} → To: {targetPlatform === 'spotify' ? 'Spotify' : 'YouTube Music'}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 mb-6 overflow-hidden shadow-2xl">
          {playlists.length === 0 ? (
            <div className="p-8 text-center text-purple-200">No playlists found</div>
          ) : (
            <div className="divide-y divide-white/10">
              {playlists.map((playlist) => (
                <label
                  key={playlist.id}
                  className="flex items-center gap-4 p-5 hover:bg-white/10 cursor-pointer transition-all duration-200"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(playlist.id)}
                    onChange={() => togglePlaylist(playlist.id)}
                    className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-gradient-to-r checked:from-purple-500 checked:to-pink-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-white">{playlist.name}</div>
                    <div className="text-sm text-purple-200/70">{playlist.trackCount} tracks</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {selected.size > 0 && (
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-5 mb-6 text-white shadow-lg">
            <strong className="text-lg">{selected.size}</strong> playlists selected ({totalTracks} tracks total)
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => router.back()}
            className="px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium backdrop-blur-lg"
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={selected.size === 0}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-bold shadow-lg hover:shadow-purple-500/50 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Next: Preview Matches →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SelectPlaylists() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
        <div className="text-purple-200 text-lg">Loading...</div>
      </div>
    }>
      <SelectPlaylistsContent />
    </Suspense>
  );
}
