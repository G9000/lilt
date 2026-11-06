# Choose an accent color

Add Accent color near the top of Make it yours: named presets, a native color picker,
a labelled hex field, immediate preview and Reset to orange. Save in this browser under
`lilt.accent`, independently of monitor media. Reset room also restores orange. The same
control belongs in Settings → Appearance so it is reachable from Practice.

Keep the chosen hex value and derive readable light/dark colors for text, focus, highlights
and colored controls. Apply tokens before the first render; synchronize other tabs and
show a session-only notice if storage fails. The room paintings and semantic recording,
warning and success colors keep their meanings. Pitch charts follow the chosen accent.

1. Test hex parsing and palette contrast, including white, black and saturated colors.
2. Add pure color helpers and a small browser preference store using the existing external-store pattern.
3. Add a reusable picker and wire shared CSS tokens, dark cards and the pitch canvas.
4. Check picker, keyboard/hex use, persistence, resets, storage failure, cross-tab changes,
   light/dark themes and narrow layouts in an isolated browser fixture.
5. Run web checks and a scratch production build; update guide, design notes, release and validation evidence.
6. Review and commit the finished change on main without pushing.
