# Changelog

## 1.3.0 (unreleased, TASK-008 M1 + M2)
### M2: the SDK owns the UI
- New entry `@myavana/react-native-sdk/ui`: `MyaChat` (screen body) and its building blocks, promoted unchanged-in-behaviour from the app's Mya UI (composer, message row, markdown, welcome, thinking dots, sheet, history sheet, keyboard hook, rich-block registry and cards).
- Host specifics (navigation, context, camera and picker, extra menu items, extra modals) come in as props; the app keeps only glue.
- `MyaThemeProvider` / `useMyaTheme` with MYAVANA as the default (a seam, not a multi-brand system).
- One block registry. `product`, `product_list` and `product_card` are suppressed on purpose (MYAVANA sells services). Unknown types render a generic card, never a blank. A contract test fails if a type the server emits is neither rendered nor suppressed; it found `divider` unregistered, now fixed.
- Profile metrics with no value read "Not yet analysed" instead of rendering 0.
- Ported from the web widget: per-day checklist persistence, day separators, long-press copy, "Reply stopped" and per-kind error copy on messages, scroll anchoring with a "Latest" pill.
- The attach sheet no longer offers "Analyse a hair strand" (the app does no hair analysis; HairAI is the service).
- **Removed:** the old SDK UI (`MyaChatView`, `MyaChatBubble`, `MyaBlockRenderer`, `MyaStrandCard`, `MyaRoutineChecklist`, `MyaGoalCard`, `MyaJournalCard`, `MyaConsultationCard`, `MyaMediaCard`, `MyaProductCard`, `MyaQuickReplies`, `MyaFloatingTrigger`, `defaultMyaTheme`). `MyaStrandCard` invented values (`?? 88`); `MyaProductCard` showed products.
- Package hygiene: `files`, `types`, `ui.d.ts`, declared peer dependencies, README, devDependencies, `npm test` runs headless and UI suites.

### M4 (part 1, no new native dependencies): motion
- One motion token file (`ui/motion/tokens.js`): three springs (gentle 20/170, snappy 18/260, settle 26/140), three durations (120/220/360), and the named recipes. No ad-hoc spring numbers anywhere else (tested). Reduce-motion turns every animation into a crossfade of at most 120 ms with no movement.
- All Mya animation moved to Reanimated 3: sheets and history sheet (UI-thread spring, `onClose` fires only when the close finishes), keyboard (`useAnimatedKeyboard`), welcome, thinking dots, loading card, composer wrapper. No `Animated.timing/spring/loop` remains in `src/ui` (tested).
- Mya's presence: the avatar breathes while thinking (1 to 1.04, 1.6 s) and a coral arc traces while streaming.
- Streamed text is released at a steady word cadence (`useInkPacing`) with a soft breathing caret, block-level ink arrival (fade and 4 px rise over 120 ms), and cards that wait for the text before them. History rows are never paced.
- Cards unfold staggered 60 ms (opacity, scale .98, 8 px rise); the member's own message lifts from the composer; send and stop morph with a pop; press states settle to .97; checklist ticks spring in; the greeting's letter-spacing settles; starters cascade; header hairline fades in on scroll; "Latest" pill pops in; one sheen crosses an offer card the first time; coral petals settle on a confirmed purchase.
- Host-injected capabilities (`MyaCapabilitiesProvider`): haptics, gradient and blur are optional and never imported by the SDK. Without them everything degrades to a plain fallback.
- Honesty: the "Scanning Strand DNA" scanner is now "Looking at your photo..."; invented loading phases ("Cross-referencing...", "lab-backed...") are gone; the loading card shows only the status it is given; unsourced percentages removed from tips.

### M5: production hardening (SDK side)
- **Nothing swallowed:** `onReportError(err, {where, conversationId, userId})` receives every surfaced failure and each one that used to be silent (message cache, saving the thread, draft, auth token, entitlements, funnel events, remote config). Errors carry `conversationId`. A throwing reporter can never break the chat.
- **Remote kill switch:** `GET {apiBase}/mobile/config?platform&appVersion&sdkVersion` returns `{flags:{serviceOffers, motion}}`. Offers off hides every offer card and sends no event; motion off behaves as reduce-motion. Cached for 6 h; a failed or malformed answer never blocks the chat (cache, else defaults: all on). Proposed contract, server side not built.
- **Performance marks:** first-token latency per reply and chat-interactive time are mirrored as `mya_perf_*` events; `BUDGETS`, `percentile`, `withinBudget` for reading them. Frame rate and memory still need a profiler.
- **Accessibility:** a screen reader hears "Mya is thinking" and, once, "Mya replied..." (never every chunk); offer card has a header, named buttons and route hints; every control is named (test-enforced); muted text raised to a 4.5:1 token (`inkText`); coral is never used for text (links are blueberry); contrast is test-enforced.

### M4 (part 2): host capabilities wired
- With a gradient: the avatar sits in the berry-to-coral ring; the offer card gets a blush-to-coral hairline. Without: plain mark and plain coral hairline.
- With a blur: the header floats over the thread on a BlurView and the thread scrolls under it. Without: the plain in-flow header.
- With SVG: checklist ticks draw their stroke over 220 ms. Without: they spring in.
- One soft coral glow on the routine card the moment the day's list is finished (never on first render).
- `npm test` now installs and runs from the package itself (devDependencies, `node_modules/` gitignored); `npm run check` lints for undeclared identifiers.

### M3: service offers
- `service_offer` card (`ServiceOfferCard`) built to the proposed contract against fixtures: store name, server price or none, up to 3 inclusions, a reason from the member's HairID, one primary action, a quiet "Not now". Renders nothing when malformed, owned, dismissed, or the host cannot fulfil its route.
- Routing is the host's: `onOpenPaywall` (native purchase; outcome read back from the server) and `onOpenLink` (in-app browser, links tagged `utm_source=mya&utm_medium=chat&utm_campaign=app&utm_content=<service>`). Links must be https on myavana.com or calendly.com.
- Funnel events through the existing `POST /events` (`offer_shown`, `offer_tapped`, `offer_dismissed`, `paywall_opened`, `purchase_completed`, `purchase_cancelled`, `link_opened`, `consult_booking_opened`), each with `surface:'app'`, `service`, `offer_id`, `price_shown`, `framing_variant`; mirrored through the `analytics` prop.
- `experienceContext.entitlements` is sent on every turn (`client.setEntitlements`); owned services are never offered.
- "Not now" is remembered per offer and never re-shown from the cached thread.
- Post-purchase moment: a confirmed purchase opens Mya's next turn with a short, fixed celebration and an offer to walk through it.

### M1
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
