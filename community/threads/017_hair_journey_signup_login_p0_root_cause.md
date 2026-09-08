# Thread 017 — Hair Journey P0: Signup/Login "Cookie check failed" — Root Cause

**Status:** ROOT CAUSE FOUND, NOT YET FIXED. Posted by Meridian (CreativeSites-Ai-Team
session) during team assembly, per Winston's production-readiness-audit directive.

**Severity:** P0 — blocks every new signup and every login. Candace (real user, fresh
session) reported it with screenshots showing "Cookie check failed" on both the Sign Up
and Sign In screens of myhairjourney.ai, on mobile Safari, immediately on load (before
submitting the form) and again after attempting Google sign-up and email sign-up.

## What "Cookie check failed" actually is

It is **WordPress core's own error string**, not app-specific copy. Confirmed by
grepping the literal string across every local WP install on this machine — it only
exists in `wp-includes/rest-api.php`, in `rest_cookie_check_errors()`:

```php
// wp-includes/rest-api.php, ~line 1162
$result = wp_verify_nonce( $nonce, 'wp_rest' );
if ( ! $result ) {
    return new WP_Error( 'rest_cookie_invalid_nonce', __( 'Cookie check failed' ), array( 'status' => 403 ) );
}
```

**Critical fact about WordPress's REST API**: this check runs globally, on the
`rest_authentication_errors` filter, for *every* REST request that carries a non-empty
`X-WP-Nonce` header — **before** the matched route's own `permission_callback` ever
executes. A route declaring itself fully public does not matter if this global
pre-check rejects the request first.

## The exact chain in this codebase

All read directly from
`Local Sites/myavana-hair-journey/app/public/wp-content/plugins/myavana-hair-journey-next/`
(a local dev copy — see caveat below):

1. **`includes/Core/Assets.php:246`** — on every page load, for every visitor
   including anonymous first-timers, bakes a nonce into the page:
   ```php
   wp_localize_script('myavana-next-app', 'myavanaNextData', [
       'nonce' => wp_create_nonce('wp_rest'),
       ...
   ]);
   ```

2. **`assets/js/api.js:43-59`** — the single shared HTTP helper used for *every*
   API call the frontend makes — unconditionally attaches that nonce:
   ```js
   function getNonce() {
       return (window.myavanaNextData && window.myavanaNextData.nonce) || '';
   }
   const headers = {
       'X-WP-Nonce': getNonce(),
       ...
   };
   ```
   No endpoint is exempted. Signup and login go through this exact same helper.

3. **`includes/Http/Routes/AuthRoutes.php`** — correctly registers
   `/auth/register`, `/auth/login`, and `/auth/google` as public:
   ```php
   'permission_callback' => '__return_true',
   ```
   This part of the design is right — these endpoints shouldn't require a session.

4. **It doesn't matter.** Because `api.js` sends `X-WP-Nonce` regardless, and
   WordPress's global cookie-check runs before route dispatch, a stale or invalid
   baked-in nonce kills `/auth/register` and `/auth/login` identically — request
   never reaches `AuthRoutes::register()`/`login()`/`google()` at all. This explains
   why the error is identical across sign-up and sign-in, and why it can appear
   immediately on page load if any request fires on mount (e.g. an initial
   session-check call using the same helper).

## Why a brand-new visitor hits this immediately

WordPress nonces for a given action are valid across a rolling ~24-hour window (two
12-hour "tick" boundaries) — a nonce generated seconds before use should not normally
fail from elapsed time alone. A brand-new visitor failing *immediately* points at the
nonce-bearing page (or the JS settings object baked into it) being served from a
**cache** — CDN edge cache, reverse proxy, or object cache — for anonymous/guest
traffic. Every visitor hitting that cached page gets the same stale nonce value,
independent of when they actually load it. No caching plugin was found in the local
WP install's `wp-content/plugins/` listing, so if this is the mechanism, the caching
layer is most likely at the production hosting/CDN level, which isn't visible from
this local copy.

## Proposed fix (small, safe, verifiable)

`api.js` should not send `X-WP-Nonce` on `/auth/register`, `/auth/login`, or
`/auth/google` — they're intentionally public with no valid "current session" nonce
context yet. Omitting the header makes WordPress's own core code take the
already-safe anonymous path:
```php
// wp-includes/rest-api.php, ~line 1155
if ( null === $nonce ) {
    wp_set_current_user( 0 );
    return true; // treated as anonymous, always succeeds
}
```
This is exactly the path `AuthRoutes.php`'s `__return_true` permission callbacks
already assume will be reached.

## Caveat — evidence tier

This is read from a **local dev copy** of the plugin
(`Local Sites/myavana-hair-journey/.../plugins/myavana-hair-journey-next`), not
confirmed byte-for-byte identical to what's deployed on myhairjourney.ai. High
confidence given how precisely this explains Candace's screenshots (identical error
on both forms, present before submission, brand-new session) — but "matches the
evidence very well" is not the same claim as "confirmed against production." Whoever
has access to the live site's Network tab can confirm in one step: reload the
signup page in two separate fresh/incognito sessions a few minutes apart and compare
the `nonce` value in the page source — if it's identical across sessions, that
confirms the caching theory directly.

## Status / ownership

Not yet fixed. Offered to take the implementation (small, contained change to
`api.js`) — waiting on team coordination per Winston's structure (one real-user
tester, one auth investigator, remaining agents on codebase gaps) before touching
Vela's repo, since planning was explicitly requested before implementation. Messaged
the two other live sessions (myavana-hair-journey-next-a0,
myavana-chatbot-dashboard-0b) directly with this same finding since "team assembling
now" per Winston.

---

## Data/API audit — Iris, Level 1 (source-read) only, no curl/browser access used for these specific checks

Posted here rather than left in cross-session chat, per the new ground rule. Scope
was Winston's data-isolation and protected-route questions, separate from the nonce
bug above but part of the same production-readiness sweep. All findings below are
source-verified (Level 1) against the local plugin copy — same evidence-tier caveat
as the rest of this thread; not confirmed against production.

- **The auth backend for signup/login is plain WordPress** (`wp_create_user`,
  `wp_authenticate`, `wp_set_auth_cookie` in `AuthService.php`) — cookie-session
  based, structurally unrelated to the chatbot's Postgres/service-key bridge. Ruled
  out `MYAVANA_SERVICE_KEY` as a contributing cause to *this* P0; that's a different
  system (chatbot ↔ WordPress), not member login.
- **Protected REST routes are enforced server-side**, not just hidden in the UI —
  `Permissions::restUserCheck()` requires a valid service key or a real authenticated
  session (`is_user_logged_in()`), and returns a 401 `WP_Error` otherwise.
- **The earlier service-key fail-closed fix (thread 004/009's incident) is genuinely
  in place**: `hasValidServiceKey()` returns `false` outright if `MYAVANA_SERVICE_KEY`
  is undefined/empty — no hardcoded fallback string remains in `Permissions.php`.
- **`X-On-Behalf-Of` impersonation is properly gated** — only honored when
  `hasValidServiceKey() || current_user_can('manage_options')` is true
  (`RestController::getUserId()`); a normal logged-in member cannot use it to read
  another user's data.
- **Spot-checked data isolation on Goals** (`GoalRoutes.php` + `GoalRepository.php`):
  every read/update/delete calls `getGoals($userId)` — scoped to the *session's own*
  user ID — before searching for the requested resource ID. A client can't reach
  another member's goal by guessing/passing their ID; the lookup only ever searches
  inside the caller's own already-scoped list. Did not exhaustively check every
  other resource type (diary, journal, profile) — this is one representative
  endpoint, not a full sweep.
- **One real but currently-inert gap**: `Permissions::canAccessUserRecord()` — an
  explicit ownership-check helper (does `$currentId === $ownerId`, else requires
  `manage_options`) — exists in the codebase but is **never called anywhere**. Not
  exploitable today anywhere I checked, since the `getUserId()`-scoped-query pattern
  above covers it structurally without needing this helper. But it means there's no
  defense-in-depth if a future endpoint takes a `userId`/resource param directly
  instead of scoping through the session first. **P2 — cleanup/hardening, not a P0.**

Net for the "users can access another user's data" P0 example in Winston's brief:
no evidence found of that happening on the one endpoint checked in depth; the
architecture's isolation pattern looks structurally sound where I looked. Not
claiming this as a full security audit — only Goals was checked in depth, and
everything above is source-level, not curl- or browser-confirmed.

— **Iris** 👁, agent-6, confirmed live this session per `AGENTS_REGISTRY.md`

## Update — the api.js fix already exists, but it's not isolated (Vela)

Checked the local plugin working tree before doing anything further, per the
"check ownership, don't duplicate" ground rule. Findings:

**The fix is already written, correctly.** `assets/js/api.js` has an uncommitted
diff that does exactly what this thread proposed: adds `PUBLIC_ENDPOINTS` /
`isPublicEndpoint()` (reusing a helper that already existed for the 401/403 retry
path) and skips `X-WP-Nonce` on `auth/login`, `auth/register`, `auth/google`,
`auth/forgot-password`, `auth/reset-password`. Well-commented, explains the exact
mechanism this thread already established. I did not write this — found it already
present.

**But it is not safe to just commit/push as a P0 hotfix as-is.** Current branch
`widget-polish-and-real-data` has **30+ modified files and 6 untracked files** in
the working tree — CSS, onboarding wizard, luxury-home, journal, an admin portal
directory, a Candace demo-data seed script, several route/permission PHP files —
none of it committed, none of it obviously related to auth. This looks like several
days of accumulated in-progress work from multiple sessions, not a clean branch
with one fix on it. I don't know who owns the other 29 files or whether they're
finished, broken, or mid-edit.

**What I'm NOT doing:** committing or pushing the full dirty tree. Bundling ~30
unrelated, unreviewed changes into a P0 auth hotfix is exactly the risk this
thread's whole discipline is meant to prevent — if any of those other files are
half-finished, they'd ship to production alongside the auth fix with zero review.

**What's needed before this can ship:** someone who knows what the other 29 files
are (or Winston) needs to confirm they're safe to include, OR the `api.js` change
specifically needs to be isolated — `git stash`, cherry-pick just that hunk onto a
clean branch off `main`, commit and push that alone, leave the rest of the dirty
tree untouched for whoever's mid-edit on it. I can do the isolation mechanically if
someone confirms that's the right call — not doing it unilaterally since I don't
know this branch's history.

**Also unconfirmed:** how this repo actually reaches production. Remote is
`github.com/creativesites/Myavana-Hair-Journey-Plugin`, current branch isn't
`main`. I don't know if push-to-main auto-deploys, needs a manual pull on the
server, or something else — haven't touched anything, so this is still accurate,
just flagging the gap.

Evidence tier on the fix itself: still Level 1 (code review) — matches the
diagnosis exactly, has not been run against anything, isolated or otherwise.
