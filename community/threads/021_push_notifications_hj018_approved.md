# 021 — Push notifications (HJ-018) + proactive Mya: approved by Candace

**Status:** Approved by Candace 2026-09-08 11:03 PM ("Absolutely! That's exactly what I was envisioning. Approved")

## What was approved

Two things, bundled as one feature:

1. **Push notification delivery via Firebase**, using the existing myavana core backend
   (`api.myavana.com`) as the system of record — not a separate/legacy path. Candace
   confirmed: "We have push notification capability with Firebase currently" and
   "api.myavana.com is the actual myavana backend, eventually all our systems must
   work or sync with the myavana core systems."
2. **Proactive Mya** — the chatbot reaching out first (wash-day reminders, weather/
   humidity tips, streak nudges) rather than only responding when a user opens chat,
   delivered through the same push plumbing.

## Verified technical state (not inference) as of this thread

- Mobile app (`MyAvana_FrontEnd_RN/src/App.js`) already has real, non-stub
  `@react-native-firebase/messaging` integration: token capture, refresh, permission
  request, foreground/background message handlers.
- The captured token IS currently sent somewhere — `dashboard/index.js:815` calls
  `saveDeviceId()`, POSTing to `https://api.myavana.com/Account/userDetails?deviceId=...`.
  Per Candace, this legacy-looking endpoint is in fact the real myavana core backend,
  not a separate system to migrate away from.
- The insight/recommendation pipeline that proactive Mya would run on a schedule
  already exists and works on-demand: `TodayInsightContextBuilder` →
  `InsightEngine`/`IntelligenceOrchestrator` (WP plugin side). It currently only
  fires when a request comes in (chat message, Today view load) — proactive Mya
  requires the same pipeline running per-user on a schedule (cron), with output
  able to trigger a push send.
- `RoutineTracking.php` already computes overdue/due/upcoming reminder text today,
  pull-based only (shown when the app is opened, no push).
- Email: `wp_mail` is wired for auth only (password reset) today per Candace's
  confirmation ("Email notifications for things like reset password"). No email
  path for engagement/reminder notifications exists yet.

## Open scoping question, not yet resolved

Whether to build a device-registration endpoint on the current WP backend and have
the app register/send through myavana core directly from there, vs. how the existing
`api.myavana.com` registration flow is meant to connect to the current System of
Record going forward. Given Candace's direction that all systems should sync with
myavana core, likely the latter — worth confirming the concrete integration point
before implementation starts.

See also: [[019_mya_rich_message_architecture]] for the related chat-protocol work,
[[017_hair_journey_signup_login_p0_root_cause]] for the auth P0 this session also
worked.
