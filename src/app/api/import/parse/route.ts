import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';
const MAX_CHUNK_SIZE = 8000; // Characters per chunk

interface ParsedSong {
  title: string;
  artist: string;
}

export async function POST(request: Request) {
  try {
    console.log('[Parse API] Received request');

    // Validate API key
    if (!GEMINI_API_KEY) {
      console.error('[Parse API] GEMINI_API_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error: Gemini API key not set' }, { status: 500 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      console.log('[Parse API] Invalid text input');
      return NextResponse.json({ error: 'Invalid text input' }, { status: 400 });
    }

    // Limit input size to prevent abuse (500KB max)
    if (text.length > 500000) {
      console.log('[Parse API] Text too long:', text.length);
      return NextResponse.json({ error: 'Text is too long. Maximum 500,000 characters.' }, { status: 400 });
    }

    console.log('[Parse API] Text length:', text.length);

    // Chunk text if too long
    const chunks = chunkText(text, MAX_CHUNK_SIZE);
    console.log('[Parse API] Split into', chunks.length, 'chunks');

    const allSongs: ParsedSong[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[Parse API] Processing chunk ${i + 1}/${chunks.length}`);
      const songs = await parseChunkWithGemini(chunks[i]);
      console.log(`[Parse API] Chunk ${i + 1} found ${songs.length} songs`);
      allSongs.push(...songs);
    }

    // Deduplicate songs
    const uniqueSongs = deduplicateSongs(allSongs);
    console.log('[Parse API] Total unique songs:', uniqueSongs.length);

    return NextResponse.json({
      songs: uniqueSongs,
      totalFound: uniqueSongs.length,
      chunksProcessed: chunks.length,
    });
  } catch (error: any) {
    console.error('[Parse API] Error:', error);
    console.error('[Parse API] Stack:', error.stack);
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
    console.log('[Parse Gemini] Calling API with text length:', text.length);
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

    console.log('[Parse Gemini] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Parse Gemini] Error response:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text_response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[Parse Gemini] Response:', text_response.substring(0, 200));

    // Extract JSON from response
    const jsonMatch = text_response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[Parse Gemini] No JSON found in response');
      return [];
    }

    const songs: ParsedSong[] = JSON.parse(jsonMatch[0]);
    console.log('[Parse Gemini] Parsed', songs.length, 'songs');
    return songs.filter(s => s.title && s.artist);
  } catch (error: any) {
    console.error('[Parse Gemini] Error:', error.message);
    console.error('[Parse Gemini] Stack:', error.stack);
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
