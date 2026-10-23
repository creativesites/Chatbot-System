/**
 * Pacing for streamed text. The server delivers text in uneven bursts; showing
 * each burst as it lands reads as stutter. This releases words at a steady
 * cadence, the way the prototype's ink typing feels, catching up smoothly when
 * the backlog grows so the screen never lags the stream by more than ~0.4 s.
 *
 * Pure functions here; the hook that drives them is in useInkPacing.js.
 */

import { PACING } from './tokens';

/** Split into units that keep their trailing whitespace, so joining them reproduces the text exactly. */
export function toWordUnits(text) {
  return String(text || '').match(/\S+\s*|\s+/g) || [];
}

/**
 * How many units to show next.
 * @param {number} shown     units currently shown
 * @param {number} total     units available
 * @param {boolean} streaming is the reply still arriving
 * @param {boolean} reduced   reduce-motion: show everything at once
 */
export function nextShownCount(shown, total, streaming, reduced) {
  if (reduced) return total;
  if (shown >= total) return total;
  const backlog = total - shown;
  if (!streaming) {
    // The stream is over: flush the rest in a fixed number of ticks (~flushMs)
    // by taking equal steps, however long the reply is.
    const budgetTicks = Math.max(1, Math.round(PACING.flushMs / PACING.tickMs));
    return Math.min(total, shown + Math.max(1, Math.ceil(total / budgetTicks)));
  }
  // Still streaming: one word per tick normally; when behind, take bigger steps
  // (proportional to the backlog) so the screen never lags the stream by much.
  return Math.min(total, shown + Math.max(1, Math.ceil(backlog / PACING.maxBacklogWords)));
}

export function joinUnits(units, count) {
  return units.slice(0, count).join('');
}
