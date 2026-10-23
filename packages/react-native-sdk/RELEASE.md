# Releasing @myavana/react-native-sdk

Nothing in this file has been done. It is the checklist for when Winston gives the go-ahead (tagging, publishing and rollout are his call).

## Before tagging
- [ ] Device run on one iPhone simulator and one real Android phone: M0 baselines recorded, then M1 to M5 verified (see `community/artifacts/TASK_008/`).
- [ ] `npm test` and `npm run check` pass.
- [ ] Budgets met and recorded against the M0 baseline: chat interactive < 1 s from tap; first token < 2.5 s on 4G (p75); no dropped frames while streaming on the reference Android; memory flat across a 200-message thread.
- [ ] TalkBack and VoiceOver pass: every control named, the offer card operable, "Mya replied" announced once.
- [ ] Server side in place or consciously deferred: `/mobile/config` (kill switch), `service_offer` contract, `/events` accepts the funnel events with `surface:'app'`, token verification.
- [ ] App Store purchase routing signed off by whoever owns compliance.
- [ ] CHANGELOG entry moved from "unreleased" to a dated version; `package.json` and `SDK_VERSION` agree.

## Tag and pin
1. Tag the SDK: `git tag rn-sdk-v<version>` (strategy to be confirmed: git tag vs npm publish).
2. In the app, replace `"@myavana/react-native-sdk": "file:../Myavana-Chatbot/packages/react-native-sdk"` with the tagged version, and delete the relative-path fallback in `src/services/mya/sdk.js` / `sdkUi.js`.
3. Install, `cd ios && pod install`, rebuild both platforms.

## Staged rollout: 10% -> 50% -> 100%
Hold each step until the previous one is clean:
- crash-free sessions not worse than the previous release;
- `mya_error` events by `where` and `kind` (no new spike);
- funnel: `offer_shown` -> `offer_tapped` -> `purchase_completed` rates sane, `price_shown` present when a price was sent;
- `mya_perf_first_token` p75 under budget.

## Rollback without a release
Set the flag off server-side in `/mobile/config` for the affected app version: `serviceOffers:false` hides every offer, `motion:false` turns the newer motion off.
Full rollback: re-pin the previous tag and ship a build.
