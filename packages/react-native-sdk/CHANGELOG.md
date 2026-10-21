# Changelog

## 1.3.0 (unreleased, TASK-008 M1)
- **Fix:** photos now reach the model. Attachments are normalised to inline `data:image/…;base64,` or `https://`; `file://` and other unreadable assets are rejected before any request, so the UI can no longer claim a photo was sent. Max 4 per message.
- **Fix:** the host's `userId` always wins over a stored one; a different stored user's conversation is not inherited. New `clearSession()` (client and hook) for logout.
- **Fix:** no staging fallback. A missing `apiBase` throws in dev and reports a `config` error in production.
- Hook-level in-flight guard: two sends in one tick make one request.
- Error taxonomy (`offline | timeout | server | auth | aborted | attachment | config | unknown`) with distinct user copy; `error.kind` and `error.userMessage` on every surfaced failure.
- A turn that fails before Mya says anything is removed from the thread and returned as `unsentDraft`; partial replies are kept and marked `interrupted`.
- Stream silence timeout (default 45 s) and 15 s timeouts on history and journal fetches.
- Types: `MyaError`, `UnsentDraft`, `normalizeAttachments`, `classifyError`.
- Fixed the stale route-sync test.

## 1.2.0
- Initial published version.
