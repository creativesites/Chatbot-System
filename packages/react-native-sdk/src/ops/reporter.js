/**
 * Error reporting (TASK-008 M5). Every failure the SDK surfaces, and every
 * place it used to swallow one, goes through here with the conversation it
 * belongs to. The host decides where reports go (Crashlytics, Sentry, logs);
 * the SDK only guarantees nothing is dropped silently and that reporting itself
 * can never throw into the UI.
 */

function createReporter({ onReport, getContext } = {}) {
  function report(err, where, extra) {
    try {
      const e = err instanceof Error ? err : new Error(String(err));
      const ctx = Object.assign({}, getContext ? getContext() : {}, extra || {}, { where: where || 'unknown' });
      // Mutating the error means a host that also sees it via onError gets the same ids.
      if (ctx.conversationId && !e.conversationId) e.conversationId = ctx.conversationId;
      if (onReport) onReport(e, ctx);
      else if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[Mya] ${ctx.where}:`, e.message);
    } catch (reportErr) {
      // Reporting must never be the thing that breaks the chat.
    }
  }
  return { report };
}

module.exports = { createReporter };
