'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { LuClock } from 'react-icons/lu';

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

const UNITS: { key: 'h' | 'm' | 's'; label: string }[] = [
  { key: 'h', label: 'Hours' },
  { key: 'm', label: 'Mins' },
  { key: 's', label: 'Secs' },
];

/**
 * Deal countdown.
 * - `boxes` renders the reference-style stat boxes (for dark banners)
 * - the default renders an inline "Ends in" chip (for light sections)
 */
export function DealsCountdown({
  endsAt,
  variant = 'inline',
}: {
  endsAt: string;
  variant?: 'inline' | 'boxes';
}) {
  const now = useTicker();
  const time = now === null ? null : remaining(endsAt, now);

  if (variant === 'boxes') {
    const values = time ? { h: time.h, m: time.m, s: time.s } : { h: '--', m: '--', s: '--' };
    return (
      <div className="flex items-center gap-2" aria-label="Deal ends in">
        {UNITS.map(({ key, label }, i) => (
          <span key={key} className="flex items-center gap-2">
            {i > 0 && <span className="text-xs font-bold text-brand-200">:</span>}
            <span className="qb-stat-box">
              <span className="text-lg font-extrabold leading-none text-ink-900 sm:text-xl">{values[key]}</span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
            </span>
          </span>
        ))}
      </div>
    );
  }

  // Inline variant: deal expired / loaded states share one layout.
  const done = time?.done;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-white px-3.5 py-1.5 text-sm">
      <LuClock className="h-4 w-4 text-accent-500" aria-hidden />
      {done ? (
        <span className="font-semibold text-red-600">Deal ended</span>
      ) : (
        <>
          <span className="text-gray-500">Ends in</span>
          <span className="font-mono font-bold text-ink-900">
            {time ? `${time.h}:${time.m}:${time.s}` : '--:--:--'}
          </span>
        </>
      )}
    </div>
  );
}
