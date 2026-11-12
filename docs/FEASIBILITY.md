# Phase 0 feasibility record

Date: 2026-11-12. **Overall CONDITIONAL â€” implementation built; native acceptance remains UNVERIFIED. Do not advance to Phase 1 yet.**

## Implemented

electron-vite manages Electron main, sandboxed preload, React/TypeScript renderer and development reload. npm lockfile records actual resolved versions. Electron Builder is the only packaging tool, chosen for a later Windows distribution path; this phase only configures an optional unpacked build, without signing, installer or release infrastructure.

Each note owns a 360 Ã— 360 DIP native window containing approximately 280 Ã— 280 DIP paper. Windows are frameless, transparent, fixed-size and topmost, with no parent window and no fullscreen overlay. A separate ordinary bounded window counts background pointer presses. Text is intentionally temporary; storage, tray, shortcuts and creation flows belong to later phases.

Per user feedback the silhouette is a clean square with small lower-corner curls, replacing the original irregular edges. Static rotations are âˆ’2Â° and +1.7Â°. SVG and native scanline region share the same polygon and rotation. Subtle gradients, layered shadow and corner highlights use local SVG/CSS and system fonts, with no downloaded assets.

## Native region experiments

Windows `setShape(rects)` is applied before showing each note. One-DIP horizontal scanlines cover the rotated silhouette. The default adds a 10 DIP fringe in both axes for shadow rendering. This is a deliberately forgiving input region: **the fringe can receive input even where shadow alpha is tiny or zero**. Clear transparent corners outside that region should fall through. This is not per-alpha hit testing.

The note's experiment control exposes:

| Mode | Purpose | Compromise |
| --- | --- | --- |
| Shape + 10 DIP shadow | Default | Shadow fringe also accepts input; clipping/AA needs visual inspection |
| Tight shape | Zero padding comparison | Clips outside-paper shadows and may expose hard scanline edges |
| Whole-window ignore polling | Fallback experiment | Removes native shape; samples pointer/polygon at ~16 ms and toggles whole-window ignore with forwarding |

Electron documents that `setShape` restricts both drawing and interaction, and that an empty rectangle list restores the rectangular window. Ignore mode is not pixel hit testing: transitions can race fast clicks, topmost overlap and focus; its shadow is not included in polygon input. It is an experiment, not an accepted replacement for native regions.

Regions are generated only at startup or explicit mode changes. Small decorative release rotation (0.18Â° default) uses the static region, with default padding accommodating displacement. Tight mode can clip decorative motion. Native regions do not follow animation frame by frame.

## Movement decisions

The first prototype used a pointer-captured gesture and a main-process ~16 ms loop sampling Electron cursor coordinates to move the actual native window. It preserves the initial pointer/window offset, coalesces movement and never springs window position. **User feedback reported this strategy as laggy and buggy.** It is retained only as an explicitly selectable comparison.

Default movement now uses Electron's `-webkit-app-region: drag` on the top grab strip: Windows owns the movement loop. Renderer text and controls remain outside that strip. There is no IPC or renderer animation chasing pointer motion during normal dragging. A debounced native `move` event triggers a tiny damped angular release effect only. Reduced-motion suppresses this effect. No animation dependency or disk writes are involved. The default loop does no cursor sampling while idle; an idle interval still wakes and immediately returns.

The release spring has deterministic damping, a half-second maximum duration and cancellation on a subsequent manual grab. Native drag does not emit ordinary pointer events over its drag strip. This mode does not implement lift or live tilt; responsiveness takes precedence. **The revised native path has not yet been judged smooth by a human.** Native move-event timing can vary with the Windows compositor; the debounce is not a definitive OS drag-end signal.

Cursor-display work area determines initial placement. Notes are clamped on manual release and recovered after display metric/removal events. Full rectangular window bounds are clamped, including transparent margins. Continuous native drag can cross work areas without clamping; tiny work areas cannot contain the full window. Mixed-DPI region units and behavior still require hardware verification.

## Platform and security boundary

`src/main/platform.ts` owns native shape and movement calls behind `WindowPlatform`. Non-Windows reports unsupported; macOS has no production hit-test implementation and must have its own feasibility spike. Renderer has no Node or filesystem access. Preload exposes only configuration, bounded experiment choices, drag start/end, release notification and quit. Main validates experiment enums, booleans, sender note membership and main frame for mutating note commands. Browser windows use sandbox, context isolation, no Node integration, deny permissions, deny navigation/popups and local-only resources. CSP allows inline styles for transforms and localhost WebSocket for Vite HMR; no remote scripts/fonts. Page zoom shortcuts are suppressed so rendered and native geometry stay aligned.

Always-on-top is intended for ordinary applications; no guarantee for exclusive fullscreen, UAC/secure desktop, virtual desktops or task switcher policy. `showInactive` avoids initial focus stealing. Drag/activation/editor focus behavior remains subject to manual testing.

## Executed verification

| Check | Result |
| --- | --- |
| `npm run build` (includes `tsc --noEmit`) | PASS after final code changes |
| `npm test` | PASS: 4 tests, 2 files; region coverage/corners/bounds, recovery and spring settling |
| `npm start` restricted launch | FAILED: Crashpad process sandbox error, no windows |
| `npm start` outside process sandbox | Startup smoke only: Electron stayed running; desktop window inventory returned 3 Electron windows |
| Desktop screenshot/input inspection | NOT RUN: computer-use app approval timed out; no visual or hit-testing conclusion |
| Latest shape/native-drag revision runtime | NOT RUN; build/tests passed; restart old instance to inspect |
| `npm run dev` interactive/HMR | NOT RUN |
| `npm run pack:win` / unpacked executable | NOT RUN |
| `npm audit --json` with network access | 6 moderate advisories in development packaging dependency chain, rooted in minimatch; no high/critical reported |

Initial npm install did not yield an installed Electron binary; running `node node_modules/electron/install.js` downloaded it successfully. Network/process sandbox permissions were needed in this agent environment. The audit recommendation would downgrade electron-builder; no automatic major-version downgrade or unverified dependency override was applied. Packaging dependencies need review before distribution.

Unit tests validate mathematical behavior only. They do not prove Windows input routing, DPI conversion, smoothness, focus or compositor rendering.

## Experiment verdicts and required manual tests

All native experiments are **CONDITIONAL / UNVERIFIED**, not PASS. Initial manual-loop motion has negative user feedback; revised native mode must be retested. Use the exact PowerShell launch commands in the development guide (`docs/DEVELOPMENT.md`), close the earlier instance, then launch the latest build.

| Experiment | Required Windows 11 verification | Current verdict |
| --- | --- | --- |
| P0-A Transparency | Inspect both notes over light/dark Notepad backgrounds. Hover, focus, unfocus, Alt+Tab and drag; check no opaque rectangle, border or stale paint. Repeat at 100% and 125%. | CONDITIONAL, NOT RUN |
| P0-B Click-through | For each note click all 4 clear corners inside its native rectangle at least 20 times; background counter must increment. Click paper center: background must not increment. Repeat with top note corners above lower note editor. Compare all 3 modes; inspect fringe/shadow clipping at close range. | CONDITIONAL, NOT RUN |
| P0-C Movement | Drag top strip slowly and quickly, release, reverse, regrab and cancel with Alt+Tab. Compare default native mode with unchecked comparison toggle. Check offset, jumps, jitter, settling, text selection, typing/paste and IME. Repeat with reduced motion enabled. | CONDITIONAL; original manual mode reported laggy/buggy; revised default NOT RUN |
| P0-D Topmost/focus | Put Notepad in foreground; notes remain visible. Edit each note independently. Drag while another app has focus and release; record activation/focus changes and overlapping-note ordering. | CONDITIONAL, NOT RUN |
| P0-E Display/DPI | Launch with pointer on each display; move across mixed-DPI boundaries. Change 100%/125%, taskbar location/resolution and disconnect a display; notes remain recoverable and regions align. | CONDITIONAL, NOT RUN |

Also inspect keyboard Tab focus on text, experiment button/select/checkbox and quit. Observe CPU during idle and repeated dragging; no frame-rate or resource-use target has been measured. Two-note independent windows were observed in the native inventory but their interaction has not been certified.

## Gate / next step

Stop at Phase 0. Run the above Windows acceptance session, record actual results, select region padding and confirm OS-native drag quality. If precise click-through and unclipped shadows cannot coexist acceptably, investigate Windows-native hit testing before any MVP foundation work. Phase 1 requires a PASS or an explicitly user-accepted conditional outcome.

Official references consulted:

- [Electron BrowserWindow: setShape, ignore mouse events and native windows](https://www.electronjs.org/docs/latest/api/browser-window)
- [electron-vite maintained build-tool setup](https://electron-vite.org/guide/)
- [Electron custom window interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions)


## Interaction revision: live paper response

Updated after user feedback that native dragging looked stiff and paired corner curls looked artificial. Paper now has a square native region and a single small illustrated curl. Initial corner differs between the two notes; subsequent horizontal native movement chooses the trailing corner. There is no runtime randomness and no region rebuilding during a drag.

Native `will-move` notifications are sampled at approximately 30 ms for decorative velocity feedback. Windows still exclusively moves the real window; React does not interpolate native position. Renderer requestAnimationFrame integrates a damped angular spring (maximum target tilt 1.3 degrees), plus a maximum 0.8% lift scale. Animation sleeps after settling. No renderer translation offsets the pointer. Movement quiet time triggers release; this remains a heuristic rather than an OS drag-ended guarantee. Reduced-motion disables live response. The old manual movement option remains an experiment.

The native square covers the small curl illustration and its transparent cut details; hit testing is deliberately forgiving there. Static native geometry plus live tilt/scale can differ by several DIP. The existing 10 DIP padding accommodates most of this displacement, but tight mode can visibly clip and the default shadow/lift must be inspected during rapid movement. Native move-event delivery and renderer scheduling during Windows modal dragging must be verified on the user's machine; successful compilation does not prove visible live animation.

Latest revision: `npm run build` (including strict typecheck) PASS, `npm test` PASS (4 existing geometry/motion tests). These do not exercise the new native-event animation loop. Manual GUI verification of the revised look and movement remains NOT RUN by the agent. Restart the application completely to load main/preload changes; renderer refresh alone is insufficient.


## Flexible sheet and rolled corner revision

Replaced rigid live tilt with a deforming SVG surface: native movement velocity drives two damped spring axes; grab location weights the trailing edge bow. Text receives a restrained matching shear. Native movement remains OS-controlled. A single approximately 65 DIP curved corner exposes a shaded rolled underside and soft cast shadow, replacing the tiny corner illustration. Side is now stable per note during a gesture to avoid flipping a large curl abruptly. Native scanline geometry follows the resting curved cut-out; default padding accommodates up to roughly 10 DIP deformation. Tight mode remains a clipping comparison. Live geometry differs from resting input geometry within this fringe; edge input and shadow clipping still need Windows testing.

Build/typecheck and existing four tests passed. These checks do not verify perceived fluidity or native-event delivery. The new surface response and curl have NOT been visually verified by the agent; Phase 0 remains conditional. Full restart required for updated main/preload motion messages.


## Directional curl, softer response, and text overflow

Angular and surface springs now settle more softly. After 55 DIP of sustained horizontal native movement, the curl selects the trailing corner and resting orientation springs toward -2 degrees (right curl) or +1.7 degrees (left curl). Small reversals reset the direction accumulator to prevent chatter. The newly revealed curl fades in over 240 ms; its side change is discrete rather than a full geometric curl morph. Native movement remains direct. A temporary union of both native silhouettes with 14 DIP padding lasts 750 ms during orientation changes, then restores the chosen region. This temporarily accepts input in some transparent corner space, an explicit feasibility compromise requiring manual overlap/click-through verification. Rapid repeated flips renew that interval. No per-frame region generation was introduced.

The editor hides its platform scrollbar while preserving wheel, trackpad, selection and keyboard scrolling. Faint top/bottom chevrons indicate available overflow and disappear at the respective limits; a screen-reader description explains scrolling. Overflow is measured on input, scroll, key navigation and element resize. Reduced motion suppresses curl fade and spring feedback.

Verification: build/typecheck and four existing tests pass. Directional flipping, curl appearance, overflow cues with long text, and native hit testing during/after transitions remain manual Windows checks. No Phase 1 work begun.


## Continuous curl reversal

Replaced the discrete side change/fade with signed curl progress. The existing curl shrinks geometrically to a flat square corner, then the opposite curl grows, using smoothstep easing for the surface cut-out and underside/shadow transform together. Full reversal takes approximately 667 ms; mid-transition reversals continue from the current progress. Reduced motion applies the destination immediately. Native silhouette union now remains for 900 ms to cover the transition. This retains the previously documented temporary extra clickable area; manual Windows clipping and overlap checks remain necessary. Fixed overflow chevrons to use CSS strokes instead of encoding-dependent text glyphs.

Build/typecheck and four existing tests pass; the new visual transition is not covered by those tests and remains unverified by the agent on the Windows GUI.


## Phase 1 authorization

The user accepted current appearance/motion and explicitly requested Phase 1. The documented CONDITIONAL baseline is accepted for continued development. Outstanding click-through, focus and mixed-DPI checks remain unverified, not PASS. See PHASE_1.md for the desktop foundation and its own acceptance checklist.


## Coupled spring experiment (2026-11-13)

The motion branch replaces single-stage Euler bending with exact damped spring stepping. A faster middle section drives a softer free edge; SVG edge control points follow the middle while the curl follows the trailing section. Native window position remains Windows-controlled. Smooth velocity saturation replaces abrupt target clamps. Native drag start resets timing and position samples. Random creation independently selects curl side and resting tilt, with a 25% straight outcome. Saved curl side defaults compatibly for older notes, and native geometry uses the explicit side.

Build/typecheck and 11 tests pass. Tests include consistency across 30/60/144 Hz integration, randomized orientation boundaries and persistence of independent curl side. Visual fluidity, native click-through during motion and actual refresh-rate behavior remain NOT RUN by the agent. Compare slow dragging, abrupt reversal, off-center grabs, release, reduced motion and curl transitions on Windows before accepting the branch.


## Velocity-driven swing follow-up (2026-11-13)

Editor focus outlines and experiment bounds are suppressed only while dragging/settling; keyboard focus indicators return at rest. Native horizontal velocity (DIP per 16 ms, converted to DIP/second) drives an independent damped angular spring. Slow movement remains subtle; fast movement smoothly saturates at 6.5 degrees additional target tilt, with a 7-degree visual safety bound. Release returns the target to zero without resetting spring velocity, so reversal and recovery remain continuous. Reduced motion bypasses swing.

Default shape mode temporarily uses a cached, nonrectangular union of rotated silhouettes during native drag and for 1.4 seconds after release. This accommodates larger visual tilt without per-frame region regeneration. It also broadens the interactive transparent fringe during that interval. Tight mode remains a clipping diagnostic; ignore mode retains its existing static-polygon limitations. Manual checks needed: focused editor drag (no dashed rectangle), slow/fast sweeps, rapid reversal, release, corners/shadows at maximum tilt, regrab during settling, and restored keyboard focus outlines. Actual Windows GUI verification remains NOT RUN by agent.
