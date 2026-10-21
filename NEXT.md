# Next increments

- [x] Persist the last-used lock preference (AsyncStorage) so re-opening the app remembers whether the user had it locked. Done, along with a local rotation history in a toggleable Stats panel (`lib/stats.js`, `hooks/`).
- [x] Add haptics (`expo-haptics`) on rotate/lock/unlock for tactile feedback. Done with a persisted on/off toggle; no-op on web / when module missing.
- [x] Animate the `PhoneIndicator` transition between portrait/landscape instead of an instant dimension swap. Done via `Animated.timing` + shortest-turn cumulative angle math in `lib/rotation.js`, respecting reduced motion.
- Replace the emoji glyphs in `constants/orientation.js` / `PhoneIndicator` with proper SVG icons for crisper rendering across devices.
- [x] Flush dwell time to storage when the app is backgrounded, gate the live dwell total on `seeded` so it can't flash a stale figure, and add an opt-in "export stats as JSON" action.
- Verify the restore-lock path on a real device (saved lock re-applied on launch, logged as `restore`), and add a component test for `StatsPanel` once a RN test runner is set up.
- [x] Fix a dwell-time bug where returning from background never reset `currentSince`, silently adding background time to whatever orientation was active; added `resumeDwell` (`lib/stats.js`, `hooks/useRotationStats.js`) called on the AppState `active` transition.
- [x] Fix orientation-change-before-active-event ordering: `record()` now checks an `appActiveRef` (kept in sync by the AppState listener) and, when backgrounded/inactive, calls `resumeDwell` with a single captured timestamp before recording, so a sensor event reaching App.js before the `active` callback fires can no longer mis-credit background time to the old orientation (`hooks/useRotationStats.js`).
- Add a focused test for the `appActiveRef` guard (simulate a sensor event arriving between the `background` and `active` AppState transitions) once a RN test runner is set up.
- Re-check dwell semantics for the iOS `inactive` state specifically — it's currently treated the same as `background`; confirm that's right on a real device.
