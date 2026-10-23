import { useEffect, useMemo, useRef, useState } from 'react';
import { PACING } from './tokens';
import { toWordUnits, nextShownCount, joinUnits } from './inkPacing';
import { useMotion } from './useMotion';

/**
 * The text to show for a streamed reply, released at a steady word cadence.
 * Messages that were never streamed in this session (history, cache) show in
 * full immediately.
 *
 * @returns {{shown: string, complete: boolean}}
 */
export default function useInkPacing(fullText, streaming) {
  const { reduced } = useMotion();
  const units = useMemo(() => toWordUnits(fullText), [fullText]);
  const wasStreaming = useRef(false);
  if (streaming) wasStreaming.current = true;

  // Only pace replies we watched arrive.
  const paced = wasStreaming.current;
  const [count, setCount] = useState(paced && !reduced ? 0 : units.length);

  useEffect(() => {
    if (!paced) {
      setCount(units.length);
      return undefined;
    }
    if (count >= units.length) return undefined;
    const id = setTimeout(() => setCount((c) => nextShownCount(c, units.length, streaming, reduced)), PACING.tickMs);
    return () => clearTimeout(id);
  }, [paced, count, units.length, streaming, reduced]);

  const shownCount = paced ? Math.min(count, units.length) : units.length;
  return { shown: joinUnits(units, shownCount), complete: shownCount >= units.length };
}
