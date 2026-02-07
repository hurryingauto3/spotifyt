'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncDirection() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  function handleNext() {
    if (selected) {
      router.push(`/sync/select?direction=${selected}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">Sync Music</h1>
          <p className="text-purple-200 text-lg">Step 1 of 4: Choose sync direction</p>
        </div>

        <div className="space-y-4 mb-8">
          <button
            onClick={() => setSelected('youtube_to_spotify')}
            className={`w-full p-8 rounded-2xl border text-left transition-all duration-300 ${
              selected === 'youtube_to_spotify'
                ? 'border-red-500/50 bg-gradient-to-r from-red-500/20 to-green-500/20 backdrop-blur-lg scale-105 shadow-2xl shadow-red-500/20'
                : 'border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 hover:scale-105 hover:border-purple-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">YouTube Music → Spotify</h2>
                <p className="text-purple-200">
                  Transfer your YouTube Music playlists to Spotify
                </p>
              </div>
              <div className="text-4xl text-white opacity-70">→</div>
            </div>
          </button>

          <button
            onClick={() => setSelected('spotify_to_youtube')}
            className={`w-full p-8 rounded-2xl border text-left transition-all duration-300 ${
              selected === 'spotify_to_youtube'
                ? 'border-green-500/50 bg-gradient-to-r from-green-500/20 to-red-500/20 backdrop-blur-lg scale-105 shadow-2xl shadow-green-500/20'
                : 'border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 hover:scale-105 hover:border-purple-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Spotify → YouTube Music</h2>
                <p className="text-purple-200">
                  Transfer your Spotify playlists to YouTube Music
                </p>
              </div>
              <div className="text-4xl text-white opacity-70">→</div>
            </div>
          </button>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium backdrop-blur-lg"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={handleNext}
            disabled={!selected}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-bold shadow-lg hover:shadow-purple-500/50 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
