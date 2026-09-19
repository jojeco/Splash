# Next increments

- [x] Persist the last-used lock preference (AsyncStorage) so re-opening the app remembers whether the user had it locked. Done, along with a local rotation history in a toggleable Stats panel (`lib/stats.js`, `hooks/`).
- Add haptics (`expo-haptics`) on rotate/lock/unlock for tactile feedback.
- Animate the `PhoneIndicator` transition between portrait/landscape instead of an instant dimension swap.
- Replace the emoji glyphs in `constants/orientation.js` / `PhoneIndicator` with proper SVG icons for crisper rendering across devices.
- Flush dwell time to storage when the app is backgrounded (currently time since the last rotation is lost if the app is killed) and add an opt-in "export stats as JSON" action. Related: for the few frames between stats hydrating and `seed()` running, `summarize()` still uses the previous session's `currentSince`, so the live dwell figure can flash a stale value — gate the panel's live total on "seeded".
- Verify the restore-lock path on a real device (saved lock re-applied on launch, logged as `restore`), and add a component test for `StatsPanel` once a RN test runner is set up.
