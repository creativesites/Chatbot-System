# Thread 016 — Mya Mobile UI/UX Redesign: Team Kickoff

**Status:** PLANNING — Winston's directive, team assembling before any implementation.
**Assigned owner (UI/UX):** the "Opus 5" agent, per Winston's explicit naming.
Identity note: this session is currently reported as **Sonnet 5** (model switched
opus->sonnet immediately before the assignment message). No self-switch capability
exists; flagged to Winston directly, proceeding with the work regardless since
content matters more than which model authors the first draft. Not silently
claiming the "Opus 5" identity without saying so — same discipline as every other
identity claim this week.

(Note: there are now two threads numbered 015 — `015_mobile_app_native_sdk_integration_plan.md`
and `015_mobile_sdk_native_integration.md`. Using 016 to avoid a third collision;
someone should reconcile those two at some point, not blocking on it now.)

## Winston's ask, condensed

Full message is long; the load-bearing points:

1. **Reported bugs from real device testing** (build installs, doesn't crash on launch):
   - "undefined is not a function" alert on the home page
   - No responses from Mya in chat
   - Suggestion chips do nothing when tapped
   - Messages sometimes only appear after sending another message
   - Keyboard interferes with the message area
   - Message bubbles render incorrectly — "tiny white bubbles, possibly white text, invisible"
   - No loading/streaming/skeleton states, no transitions
   - Welcome card is permanently persistent and not useful
   - No discoverable additional screens/native surfaces
2. **Full UI/UX redesign**, Gemini-app as primary reference, ChatGPT/Claude for interaction
   patterns. Composer treated as flagship surface. Insets/keyboard/safe-area handling
   is non-negotiable — explicitly because this is the case for replacing Kommunicate,
   and a worse experience than what we're replacing undermines that case entirely.
3. **Map the full Mya mobile experience** before implementing further — screens, states,
   bottom sheets vs. full screens vs. dialogs — so we don't design into a corner.
4. **Don't wait for final approved visual designs** to start improving the current
   implementation; ship incremental improvement now, redesign happens in parallel.
5. Team structure: Opus/me drives UX map + design spec + composer redesign +
   implementation of the new UI. Everyone else: audit existing implementation,
   verify streaming/data flow, fix interaction bugs, test edge cases, review the
   new UI against intended UX. Lyra coordinates so we don't duplicate effort.
6. Before anything is "done": real interactive testing on device, not just compile checks.

## What I've verified so far (started before the "team planning first" steer — sharing so nobody re-does it)

- `src/containers/MyaChatScreen.js` (552 lines) has **zero** safe-area/inset handling
  (`useSafeAreaInsets`, `SafeAreaView`, `edges=`) — only a bare `KeyboardAvoidingView`.
  Confirms the inset/keyboard complaint directly; not a perception issue.
- Suggestion chips **do** call a real `sendMessage` (`onSelect={(qr) => sendMessage(qr.payload || qr.label)}`),
  and `sendMessage` is destructured correctly from `useMyaChat()` on both the screen and
  hook side — the wiring itself is not broken at that specific line. So "chips do nothing"
  is either a deeper bug in `MyaMobileClient`'s actual network call, or something else
  entirely — **not yet root-caused**, don't take "chips call sendMessage" as "chips work."
- Checked one specific hypothesis for the invisible-bubble bug: `MyaChatBubble.tsx` merges
  themes via `{ ...defaultMyaTheme, ...theme }` (shallow spread) — if a caller ever passes a
  partial `theme.colors` object, this would silently wipe unlisted color keys
  (`assistantBubbleText`, etc.) to `undefined`. **Ruled out for this screen specifically:**
  `MyaChatScreen.js` renders `<MyaChatBubble message={item} />` with no `theme` prop at all,
  so it gets the full default theme (`assistantBubbleBackground: '#FFFFFF'`,
  `assistantBubbleText: '#1E1E1E'` — correct contrast on paper). **The shallow-merge
  fragility is still real and worth fixing defensively**, but it is not the cause of the
  bug on this screen. The actual invisible-bubble cause is still open — could be a
  different render path, a device-specific style, or something in `MyaBlockRenderer`.
- Have not yet located the "undefined is not a function" home-page crash — that's a
  **different** screen/file than the chat crash Atlas already closed out (bundle-less
  debug APK, confirmed-by-artifact in the other 015 thread). Don't conflate the two;
  they're separate bugs with separate root causes needed.

## Proposed split (mirroring Winston's structure, open to pushback)

- **Me (Opus/Sonnet, flagged above):** UX map of the full Mya mobile experience (screens/
  states/sheets/dialogs), visual direction brief for Claude Design, composer spec,
  states catalogue (thinking/streaming/error/etc.), then implementation of the redesigned
  chat screen + composer against real inset/keyboard behavior.
- **Whoever picks up functional audit:** root-cause the actual four live bugs above
  (no-response, chips-do-nothing-in-practice, message-appears-late, invisible bubbles) —
  these need real device/logcat evidence, not just static code reading, per the standing
  "attested vs. verified" discipline.
- **Whoever picks up the home-page crash:** separate from the above, needs its own
  root-cause, not assumed to share a cause with the chat bugs.
- **Lyra:** coordinating so audit/design/implementation don't collide on the same files —
  same file-ownership discipline as the widget-source collisions earlier this week.

Not claiming any of the audit items myself. Posting this now and messaging the live
team directly rather than producing the design doc solo, per Winston's explicit
"team planning first."

## Update — Meridian (CreativeSites-Ai-Team session), taking the home-page crash

Claiming the **home-page "undefined is not a function"** item specifically, not the
four chat bugs (leaving those to whoever has device/logcat access, per the "not
yet root-caused, needs real device evidence" note above — I don't have device
access from this session either, see caveat below).

Static-analysis pass on `MyAvana_FrontEnd_RN` (git diff against the uncommitted
working tree, not just the committed history) — **ruled out**, with evidence, not
guessed:

- `MyAvanaMobileHostBridge.init()` (called unconditionally in `App.js`'s first
  `useEffect`, i.e. on every app boot regardless of screen) — read the full
  implementation, it's a single `console.log`. Cannot throw.
- `setNavigationRef`/`onReady`/`onStateChange` wiring added to `App.js` for the
  new host bridge — all guarded with optional chaining (`navRef?.getCurrentRoute?.()`)
  and try/catch. Cannot throw "undefined is not a function" as written.
- `newConsultBottom/index.js` had `createConversation`/`openChatBot` (old Kommunicate
  methods) deleted — checked for dangling references (e.g. an onPress still bound to
  the now-missing method): none found, `grep` across `src/` for both names returns
  only the definition site, already removed.
- Remaining `Kommunicate` string references (`src/constants/url.js`,
  `src/containers/webviewchat.js`, `src/containers/MyaChatScreen.js`) are inert/lazy —
  not on the home screen's render or mount path, so can't fire at boot.
- `MyaFloatingTrigger.js` exists but is dead code — not imported or rendered
  anywhere in the app currently, so it's not in the crashing render path either.

**Where I'm stuck without device access**: "undefined is not a function" without a
stack trace is not reliably localizable by grep alone in an app this size — I've
eliminated the obvious candidates in the new Mya integration surface, but the actual
call site could be in a native-module gap (same class of bug as the earlier crash-at-launch
fix: a method assumed present on a native module that isn't linked for this build
variant), a reducer/selector touched by the Redux Provider wrapping the whole app,
or something entirely unrelated to this week's changes. Whoever has the physical
device or emulator: if a JS redbox/error overlay appeared, the stack trace in it
would resolve this in one look; if it was silent (Hermes release bundle, no overlay),
`adb logcat` filtered for `ReactNativeJS` at the moment of the alert is the next best
source. Post either here and I'll take it from there rather than continuing to guess.

Also worth flagging since it's adjacent: `package.json` still declares
`"@myavana/react-native-sdk": "file:../Myavana-Chatbot/packages/react-native-sdk"` —
a `file:` dependency into a sibling repo. This is what caused the earlier crash-at-launch
(a stray `node_modules/react` inside that SDK package pointed at a different app's
React copy, done, fixed). It's still fragile for anything beyond this one dev machine
(won't survive a build on CI or another machine) — not blocking today's bugs, but
worth a follow-up task before this ships anywhere else.
