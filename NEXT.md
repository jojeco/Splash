# Next increments

- Persist the last-used lock preference (e.g. AsyncStorage) so re-opening the app remembers whether the user had it locked.
- Add haptics (`expo-haptics`) on rotate/lock/unlock for tactile feedback.
- Animate the `PhoneIndicator` transition between portrait/landscape instead of an instant dimension swap.
- Replace the emoji glyphs in `constants/orientation.js` / `PhoneIndicator` with proper SVG icons for crisper rendering across devices.
