'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ImportPage() {
  const router = useRouter();
  const [textInput, setTextInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exampleText = `1. Billie Eilish - bad guy
2. The Weeknd - Blinding Lights
3. Dua Lipa - Levitating
4. Olivia Rodrigo - drivers license
5. Ed Sheeran - Shape of You`;

  async function handleParse() {
    if (!textInput.trim()) {
      setError('Please paste some text');
      return;
    }

    try {
      setParsing(true);
      setError(null);

      const response = await fetch('/api/import/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Store parsed songs and navigate to preview
      sessionStorage.setItem('importedSongs', JSON.stringify(data.songs));
      router.push('/import/preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse text');
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-purple-200 hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-3">Smart Import</h1>
          <p className="text-purple-200 text-lg">
            Paste any song list and let AI parse it for you 🤖
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-500/10 backdrop-blur-lg border border-blue-500/30 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">✨ How it works</h3>
          <ul className="text-blue-200/80 space-y-1 text-sm">
            <li>• Paste any format: "Artist - Song", numbered lists, YouTube descriptions, etc.</li>
            <li>• Gemini AI extracts song titles and artists</li>
            <li>• We search and match on Spotify</li>
            <li>• You choose where to add them (Liked Songs or Playlist)</li>
          </ul>
        </div>

        {/* Text Input */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 shadow-2xl mb-6">
          <label className="block text-white font-medium mb-3">
            Paste your song list
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Example:\n${exampleText}`}
            className="w-full h-64 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setTextInput(exampleText)}
              className="text-sm text-purple-300 hover:text-purple-200 transition-colors"
            >
              Use example
            </button>
            <div className="text-sm text-purple-300/70">
              {textInput.trim().split('\n').filter(line => line.trim()).length} lines
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 backdrop-blur-lg border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setTextInput('')}
            disabled={!textInput.trim() || parsing}
            className="px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all duration-200 font-medium backdrop-blur-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={handleParse}
            disabled={!textInput.trim() || parsing}
            className="flex-1 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-bold shadow-lg hover:shadow-purple-500/50 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {parsing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Parsing with AI...
              </span>
            ) : (
              '🤖 Parse with Gemini AI'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
