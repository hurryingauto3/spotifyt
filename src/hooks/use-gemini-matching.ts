import { useState, useCallback, useRef } from 'react';
import { UnifiedTrack, MatchResult } from '@/lib/matching/types';
import { buildSearchQuery } from '@/lib/matching/normalize';

interface SearchFunction {
  (query: string): Promise<UnifiedTrack[]>;
}

export function useGeminiMatching() {
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isMatching, setIsMatching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const matchTracks = useCallback(async (
    sources: UnifiedTrack[],
    searchFn: SearchFunction,
    existingIds: Set<string>,
    onProgress?: (current: number, total: number) => void
  ): Promise<MatchResult[]> => {
    setIsMatching(true);
    abortControllerRef.current = new AbortController();

    try {
      const results: MatchResult[] = new Array(sources.length);
      const existingIdsArray = Array.from(existingIds);
      let completed = 0;

      setProgress({ current: 0, total: sources.length });

      // Process tracks with controlled concurrency for both search and Gemini API calls
      const maxConcurrency = 5; // 5 simultaneous tracks being processed
      const queue = [...sources];
      const active = new Set<Promise<void>>();

      const processTrack = async (index: number) => {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Matching cancelled');
        }

        const source = sources[index];

        try {
          // Step 1: Search for candidates (with delay)
          await delay(200);
          const query = buildSearchQuery(source);
          const candidates = await searchFn(query);

          if (candidates.length === 0) {
            results[index] = {
              source,
              target: null,
              confidence: 0,
              status: 'not_found'
            };
            completed++;
            setProgress({ current: completed, total: sources.length });
            onProgress?.(completed, sources.length);
            return;
          }

          // Step 2: Use Gemini AI to find best match
          await delay(300); // Rate limit Gemini
          const geminiResult = await callGeminiAPI(source, candidates);

          // Simple categorization: if Gemini found a match, show it
          let status: 'matched' | 'low_confidence' | 'not_found' | 'already_exists' = 'not_found';

          if (geminiResult.match) {
            if (existingIdsArray.includes(geminiResult.match.id)) {
              status = 'already_exists';
            } else {
              // Categorize based on Gemini's confidence
              status = geminiResult.confidence >= 0.70 ? 'matched' : 'low_confidence';
            }
          }

          results[index] = {
            source,
            target: geminiResult.match,
            confidence: geminiResult.confidence,
            status,
            existingId: status === 'already_exists' ? geminiResult.match?.id : undefined
          };

          completed++;
          setProgress({ current: completed, total: sources.length });
          onProgress?.(completed, sources.length);
        } catch (error) {
          console.error(`[Gemini Match] Error processing track ${index}:`, error);
          // On error, mark as not found
          results[index] = {
            source,
            target: null,
            confidence: 0,
            status: 'not_found'
          };
          completed++;
          setProgress({ current: completed, total: sources.length });
        }
      };

      // Process queue with concurrency control
      while (queue.length > 0 || active.size > 0) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Matching cancelled');
        }

        // Start new tasks up to concurrency limit
        while (active.size < maxConcurrency && queue.length > 0) {
          const source = queue.shift()!;
          const index = sources.indexOf(source);

          const promise = processTrack(index).finally(() => {
            active.delete(promise);
          });

          active.add(promise);
        }

        // Wait for at least one task to complete
        if (active.size > 0) {
          await Promise.race(active);
        }
      }

      return results;
    } finally {
      setIsMatching(false);
    }
  }, []);

  const cancelMatching = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsMatching(false);
  }, []);

  return {
    matchTracks,
    cancelMatching,
    isMatching,
    progress
  };
}

async function callGeminiAPI(
  sourceTrack: UnifiedTrack,
  candidates: UnifiedTrack[]
): Promise<{ match: UnifiedTrack | null; confidence: number }> {
  const GEMINI_API_KEY = 'AIzaSyDRsICRoVYSCUtX8JxkVx5J2omrDYQhn2o';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

  const prompt = `You are a music matching expert. Find the best match for the source track among candidates.

Source: "${sourceTrack.title}" by "${sourceTrack.artist}" (${Math.round(sourceTrack.durationMs / 1000)}s)

Candidates:
${candidates.map((c, i) => `${i}. "${c.title}" by "${c.artist}" (${Math.round(c.durationMs / 1000)}s)`).join('\n')}

Consider: title variations (Official, Remaster, Live), artist variations (VEVO, feat.), duration (±10s OK).

Respond ONLY with JSON:
{
  "bestMatchIndex": <number 0-${candidates.length - 1} or -1 if no match>,
  "confidence": <0.0-1.0>
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON in Gemini response');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.bestMatchIndex === -1 || result.bestMatchIndex < 0 || result.bestMatchIndex >= candidates.length) {
      return { match: null, confidence: result.confidence || 0 };
    }

    return {
      match: candidates[result.bestMatchIndex],
      confidence: result.confidence || 0
    };
  } catch (error) {
    console.error('[Gemini API] Error:', error);
    // Fallback to first candidate with low confidence
    return { match: candidates[0] || null, confidence: 0.3 };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
