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
  // Call server-side API to keep API key secure
  try {
    const response = await fetch('/api/sync/match-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceTrack,
        candidates,
      }),
    });

    if (!response.ok) {
      console.error('[Gemini Hook] Server error:', response.status);
      return { match: null, confidence: 0 };
    }

    const data = await response.json();
    return {
      match: data.match || null,
      confidence: data.confidence || 0,
    };
  } catch (error: any) {
    console.error('[Gemini Hook] Error:', error);
    return { match: null, confidence: 0 };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
