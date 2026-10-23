/**
 * Performance marks and budgets (TASK-008 M5).
 *
 * Budgets, measured on device and compared with the M0 baseline:
 *   chat interactive from tap ........ < 1000 ms
 *   first token on 4G (p75) .......... < 2500 ms
 *   dropped frames while streaming ... none on the reference Android
 *   memory across a 200-message thread  flat
 * Only the first two are measurable here; the SDK reports them as events so
 * the p75 can be read from the funnel data. Frames and memory need a profiler.
 */

const BUDGETS = Object.freeze({ chatInteractiveMs: 1000, firstTokenP75Ms: 2500 });

function createPerf({ now = () => Date.now(), onMark } = {}) {
  const starts = new Map();
  return {
    start(name) {
      starts.set(name, now());
    },
    /** Ends a span and reports it. Returns the duration, or null if it never started. */
    end(name, extra) {
      if (!starts.has(name)) return null;
      const ms = Math.max(0, now() - starts.get(name));
      starts.delete(name);
      try {
        if (onMark) onMark(name, ms, extra || {});
      } catch (e) {
        // Telemetry never breaks the chat.
      }
      return ms;
    },
  };
}

/** Nearest-rank percentile (p in 0..100). */
function percentile(values, p) {
  const v = (values || []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const rank = Math.max(1, Math.ceil((p / 100) * v.length));
  return v[Math.min(v.length, rank) - 1];
}

function withinBudget(name, samples) {
  if (name === 'chat_interactive') {
    const worst = samples.length ? Math.max(...samples) : null;
    return { ok: worst !== null && worst < BUDGETS.chatInteractiveMs, value: worst, budget: BUDGETS.chatInteractiveMs };
  }
  if (name === 'first_token') {
    const p75 = percentile(samples, 75);
    return { ok: p75 !== null && p75 < BUDGETS.firstTokenP75Ms, value: p75, budget: BUDGETS.firstTokenP75Ms };
  }
  return { ok: false, value: null, budget: null };
}

module.exports = { BUDGETS, createPerf, percentile, withinBudget };
