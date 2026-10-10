'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Ticks once per second as an external store — avoids setState-in-effect. */
function useTicker(intervalMs = 1000): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = setInterval(onChange, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs],
  );
  // Snapshot is bucketed to the interval so repeated calls return the same value.
  const getSnapshot = useCallback(() => Math.floor(Date.now() / intervalMs) * intervalMs, [intervalMs]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function remaining(endsAt: string, now: number) {
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return { h: '00', m: '00', s: '00', done: true };
  return {
    h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
    m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
    s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
    done: false,
  };
}

export function DealsCountdown({ endsAt }: { endsAt: string }) {
  const now = useTicker();

  // Server snapshot is null → first client paint matches SSR, then it ticks.
  // Render the same layout with placeholders so there is no layout shift.
  if (now === null) {
    return (
      <div className="flex items-center gap-1.5" aria-label="Deal ends in">
        <span className="text-sm text-gray-500">Ends in:</span>
        {['--', '--', '--'].map((unit, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-400">:</span>}
            <span className="rounded bg-brand-800 px-2 py-1 font-mono text-sm font-bold text-white">{unit}</span>
          </span>
        ))}
      </div>
    );
  }

  const time = remaining(endsAt, now);
  if (time.done) return <span className="text-sm font-semibold text-red-600">Deal ended</span>;

  return (
    <div className="flex items-center gap-1.5" aria-label="Deal ends in">
      <span className="text-sm text-gray-500">Ends in:</span>
      {[time.h, time.m, time.s].map((unit, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-400">:</span>}
          <span className="rounded bg-brand-800 px-2 py-1 font-mono text-sm font-bold text-white">{unit}</span>
        </span>
      ))}
    </div>
  );
}
