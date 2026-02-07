import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
const MAX_CHUNK_SIZE = 8000; // Characters per chunk

interface ParsedSong {
  title: string;
  artist: string;
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text input' }, { status: 400 });
    }

    // Chunk text if too long
    const chunks = chunkText(text, MAX_CHUNK_SIZE);
    const allSongs: ParsedSong[] = [];

    for (const chunk of chunks) {
      const songs = await parseChunkWithGemini(chunk);
      allSongs.push(...songs);
    }

    // Deduplicate songs
    const uniqueSongs = deduplicateSongs(allSongs);

    return NextResponse.json({
      songs: uniqueSongs,
      totalFound: uniqueSongs.length,
      chunksProcessed: chunks.length,
    });
  } catch (error: any) {
    console.error('[Parse API] Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to parse text',
    }, { status: 500 });
  }
}

function chunkText(text: string, maxSize: number): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  const lines = text.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      // If single line is too long, split it
      if (line.length > maxSize) {
        const lineChunks = line.match(new RegExp(`.{1,${maxSize}}`, 'g')) || [];
        chunks.push(...lineChunks);
      } else {
        currentChunk = line + '\n';
      }
    } else {
      currentChunk += line + '\n';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function parseChunkWithGemini(text: string): Promise<ParsedSong[]> {
  const prompt = `You are a music playlist parser. Extract ALL song titles and artists from the following text.

The text may contain:
- Numbered lists (e.g., "1. Artist - Song" or "1) Song by Artist")
- Simple lines (e.g., "Artist - Song" or "Song by Artist")
- YouTube video titles (e.g., "Artist - Song (Official Video)")
- Mixed formats and descriptions

Rules:
1. Extract EVERY song you can identify
2. Clean up formatting: remove "(Official Video)", "[Official Audio]", "(Lyrics)", etc.
3. Separate artist and title clearly
4. If artist is unclear, use "Unknown Artist"
5. Ignore non-music lines (descriptions, comments, etc.)

Text to parse:
${text}

Respond ONLY with valid JSON array:
[
  {"title": "Song Name", "artist": "Artist Name"},
  {"title": "Another Song", "artist": "Another Artist"}
]

If no songs found, return: []`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text_response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text_response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[Parse] No JSON found in Gemini response');
      return [];
    }

    const songs: ParsedSong[] = JSON.parse(jsonMatch[0]);
    return songs.filter(s => s.title && s.artist);
  } catch (error) {
    console.error('[Parse] Gemini error:', error);
    return [];
  }
}

function deduplicateSongs(songs: ParsedSong[]): ParsedSong[] {
  const seen = new Set<string>();
  const unique: ParsedSong[] = [];

  for (const song of songs) {
    const key = `${song.title.toLowerCase().trim()}::${song.artist.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(song);
    }
  }

  return unique;
}
