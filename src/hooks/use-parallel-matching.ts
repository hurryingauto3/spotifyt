import { useState, useCallback, useRef } from 'react';
import { UnifiedTrack, MatchResult, MatchConfig, DEFAULT_MATCH_CONFIG } from '@/lib/matching/types';
import { buildSearchQuery } from '@/lib/matching/normalize';

interface SearchFunction {
  (query: string): Promise<UnifiedTrack[]>;
}

export function useParallelMatching() {
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isMatching, setIsMatching] = useState(false);
  const workersRef = useRef<Worker[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const initWorkers = useCallback((count: number) => {
    // Clean up existing workers
    workersRef.current.forEach(worker => worker.terminate());
    workersRef.current = [];

    // Create new worker pool
    for (let i = 0; i < count; i++) {
      const worker = new Worker(new URL('../workers/matcher.worker.ts', import.meta.url));
      workersRef.current.push(worker);
    }

    return workersRef.current;
  }, []);

  const matchTracks = useCallback(async (
    sources: UnifiedTrack[],
    searchFn: SearchFunction,
    existingIds: Set<string>,
    config: MatchConfig = DEFAULT_MATCH_CONFIG,
    onProgress?: (current: number, total: number) => void
  ): Promise<MatchResult[]> => {
    setIsMatching(true);
    abortControllerRef.current = new AbortController();

    try {
      // Detect CPU cores (max 8 workers to avoid overwhelming the system)
      const numWorkers = Math.min(navigator.hardwareConcurrency || 4, 8);
      const workers = initWorkers(numWorkers);

      const results: MatchResult[] = new Array(sources.length);
      const existingIdsArray = Array.from(existingIds);
      let completed = 0;

      setProgress({ current: 0, total: sources.length });

      // Process tracks with controlled concurrency for API calls
      const concurrency = 3; // Max 3 simultaneous searches to respect rate limits
      const queue = [...sources];
      const active = new Set<Promise<void>>();

      const processTrack = async (index: number) => {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Matching cancelled');
        }

        const source = sources[index];

        // Step 1: Make API search call (rate-limited)
        await delay(200); // Rate limiting delay
        const query = buildSearchQuery(source);
        const candidates = await searchFn(query);

        // Step 2: Offload CPU-intensive matching to worker
        const workerIndex = index % workers.length;
        const worker = workers[workerIndex];

        const result = await new Promise<MatchResult>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Worker timeout'));
          }, 10000);

          worker.onmessage = (e) => {
            clearTimeout(timeout);
            resolve(e.data.result);
          };

          worker.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };

          worker.postMessage({
            type: 'match',
            source,
            candidates,
            config,
            existingIds: existingIdsArray
          });
        });

        results[index] = result;
        completed++;

        const progressData = { current: completed, total: sources.length };
        setProgress(progressData);
        onProgress?.(completed, sources.length);
      };

      // Process queue with concurrency control
      while (queue.length > 0 || active.size > 0) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Matching cancelled');
        }

        // Start new tasks up to concurrency limit
        while (active.size < concurrency && queue.length > 0) {
          const source = queue.shift()!;
          const index = sources.indexOf(source);

          const promise = processTrack(index)
            .catch((error) => {
              // On error, create a not_found result
              results[index] = {
                source,
                target: null,
                confidence: 0,
                status: 'not_found'
              };
              completed++;
              setProgress({ current: completed, total: sources.length });
            })
            .finally(() => {
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
      // Clean up workers
      workersRef.current.forEach(worker => worker.terminate());
      workersRef.current = [];
    }
  }, [initWorkers]);

  const cancelMatching = useCallback(() => {
    abortControllerRef.current?.abort();
    workersRef.current.forEach(worker => worker.terminate());
    workersRef.current = [];
    setIsMatching(false);
  }, []);

  return {
    matchTracks,
    cancelMatching,
    isMatching,
    progress
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
