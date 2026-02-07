import { UnifiedTrack, MatchResult } from '@/lib/matching/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

interface GeminiMatchRequest {
  sourceTrack: UnifiedTrack;
  candidates: UnifiedTrack[];
}

interface GeminiMatchResponse {
  bestMatchIndex: number | null;
  confidence: number;
  reasoning: string;
}

export async function matchWithGemini(
  sourceTrack: UnifiedTrack,
  candidates: UnifiedTrack[]
): Promise<{ match: UnifiedTrack | null; confidence: number; reasoning: string }> {
  // Validate API key
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable not set');
  }

  if (candidates.length === 0) {
    return { match: null, confidence: 0, reasoning: 'No candidates provided' };
  }

  const prompt = `You are a music matching expert. Your task is to find the best match for a source track among candidate tracks.

Source Track:
- Title: "${sourceTrack.title}"
- Artist: "${sourceTrack.artist}"
- Duration: ${Math.round(sourceTrack.durationMs / 1000)} seconds

Candidate Tracks:
${candidates.map((c, i) => `${i}. Title: "${c.title}" | Artist: "${c.artist}" | Duration: ${Math.round(c.durationMs / 1000)} seconds`).join('\n')}

Instructions:
1. Consider variations in titles (e.g., "Official Video", "Lyrics", "Remaster", different spellings)
2. Consider artist name variations (e.g., "VEVO" suffix, featuring artists, different order)
3. Duration should be similar (within ~10 seconds is acceptable)
4. Return the index of the best match (0-${candidates.length - 1}), or -1 if no good match exists
5. Provide a confidence score from 0.0 to 1.0
6. Explain your reasoning briefly

Respond ONLY with valid JSON in this exact format:
{
  "bestMatchIndex": <number or -1>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>"
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response (Gemini might wrap it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const result: GeminiMatchResponse = JSON.parse(jsonMatch[0]);

    if (result.bestMatchIndex === -1 || result.bestMatchIndex === null) {
      return { match: null, confidence: result.confidence, reasoning: result.reasoning };
    }

    if (result.bestMatchIndex < 0 || result.bestMatchIndex >= candidates.length) {
      throw new Error(`Invalid match index: ${result.bestMatchIndex}`);
    }

    return {
      match: candidates[result.bestMatchIndex],
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error('[Gemini] Matching error:', error);
    // Fallback to first candidate with low confidence
    return {
      match: candidates[0],
      confidence: 0.3,
      reasoning: `Gemini matching failed: ${error}. Using first candidate as fallback.`
    };
  }
}

export async function batchMatchWithGemini(
  sources: UnifiedTrack[],
  searchFn: (query: string) => Promise<UnifiedTrack[]>,
  existingIds: Set<string>,
  onProgress?: (current: number, total: number) => void
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    // Search for candidates
    const query = `${source.artist} ${source.title}`;
    await delay(200); // Rate limiting
    const candidates = await searchFn(query);

    // Use Gemini to find best match
    const { match, confidence, reasoning } = await matchWithGemini(source, candidates);

    let status: 'matched' | 'low_confidence' | 'not_found' | 'already_exists' = 'not_found';

    if (match) {
      if (existingIds.has(match.id)) {
        status = 'already_exists';
      } else if (confidence >= 0.75) {
        status = 'matched';
      } else if (confidence >= 0.50) {
        status = 'low_confidence';
      }
    }

    results.push({
      source,
      target: match,
      confidence,
      status,
      existingId: status === 'already_exists' ? match?.id : undefined
    });

    onProgress?.(i + 1, sources.length);

    // Rate limit Gemini API calls
    await delay(300);
  }

  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
