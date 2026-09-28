# Next increments

- [x] Persist the last-used lock preference (AsyncStorage) so re-opening the app remembers whether the user had it locked. Done, along with a local rotation history in a toggleable Stats panel (`lib/stats.js`, `hooks/`).
- Add haptics (`expo-haptics`) on rotate/lock/unlock for tactile feedback.
- [x] Animate the `PhoneIndicator` transition between portrait/landscape instead of an instant dimension swap. Done via `Animated.timing` + shortest-turn cumulative angle math in `lib/rotation.js`, respecting reduced motion.
- Replace the emoji glyphs in `constants/orientation.js` / `PhoneIndicator` with proper SVG icons for crisper rendering across devices.
- [x] Flush dwell time to storage when the app is backgrounded, gate the live dwell total on `seeded` so it can't flash a stale figure, and add an opt-in "export stats as JSON" action.
- Verify the restore-lock path on a real device (saved lock re-applied on launch, logged as `restore`), and add a component test for `StatsPanel` once a RN test runner is set up.
