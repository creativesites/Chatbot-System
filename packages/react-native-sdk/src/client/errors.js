/**
 * Error taxonomy for Mya requests.
 *
 * Every failure the SDK surfaces carries a `kind` so the UI can say the
 * right thing (offline is not the same problem as a server fault) and so
 * retry logic can decide what is worth retrying.
 */

const KINDS = ['offline', 'timeout', 'server', 'auth', 'aborted', 'attachment', 'config', 'unknown'];

const COPY = {
  offline: "You seem to be offline. Check your connection and try again.",
  timeout: "Mya took too long to answer. Please try again in a moment.",
  server: "Mya is having a moment on our side. Please try again shortly.",
  auth: "We couldn't verify your session. Please sign in again to keep chatting.",
  aborted: "That reply was stopped.",
  attachment: "One of your photos couldn't be prepared, so nothing was sent. Please try adding it again.",
  config: "Mya isn't set up correctly in this build. Please update the app or contact support.",
  unknown: "Something went wrong on our side. Please try again."
};

function errorCopy(kind) {
  return COPY[kind] || COPY.unknown;
}

function classifyError(err) {
  if (!err) return { kind: 'unknown', status: null, message: errorCopy('unknown') };
  if (err.kind && KINDS.includes(err.kind)) {
    return { kind: err.kind, status: err.status || null, message: errorCopy(err.kind) };
  }
  const text = String(err.message || err);
  let kind = 'unknown';
  let status = null;

  const http = text.match(/HTTP (\d{3})/);
  if (http) status = Number(http[1]);

  if (err.name === 'AbortError') kind = 'aborted';
  else if (err.code === 'timeout' || err.name === 'TimeoutError' || /timed? ?out/i.test(text)) kind = 'timeout';
  else if (status === 401 || status === 403) kind = 'auth';
  else if (status && status >= 500) kind = 'server';
  else if (status && status >= 400) kind = 'server';
  else if (/network request failed|failed to fetch|network error|networkerror|econn|enotfound|offline|internet/i.test(text)) kind = 'offline';

  return { kind, status, message: errorCopy(kind) };
}

/** Wrap anything thrown into an Error that carries kind/status/userMessage. */
function toMyaError(err, extra = {}) {
  const c = classifyError(err);
  const e = err instanceof Error ? err : new Error(String(err));
  e.kind = c.kind;
  if (c.status) e.status = c.status;
  e.userMessage = c.message;
  Object.assign(e, extra);
  return e;
}

function makeError(kind, message, extra = {}) {
  const e = new Error(message || errorCopy(kind));
  e.kind = kind;
  e.userMessage = errorCopy(kind);
  if (kind === 'timeout') e.code = 'timeout';
  return Object.assign(e, extra);
}

module.exports = { KINDS, classifyError, errorCopy, toMyaError, makeError };
