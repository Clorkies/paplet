# Stickee progress tracker

Last updated: 2026-11-14. Pinned-sheet paper flow (accepted by the user) and the remaining Phase 2 work are implemented on `improve/paper-motion`, uncommitted at time of writing; see the final two sections.

**Current position:** Phase 1 is implemented with native Windows acceptance pending. Parts of Phase 2 were developed early to establish the paper interaction. The user accepted the current look and motion; this does not certify every native-window test.

The [implementation plan](../STICKEE_IMPLEMENTATION_PLAN.md) defines scope. This tracker records completion and remaining work. Update it alongside implementation changes and keep automated checks separate from manual Windows results.

## Phase overview

| Phase | Status | Delivered / remaining |
| --- | --- | --- |
| 0 — Native window and interaction feasibility | **Accepted conditional baseline** | Independent transparent windows, shaped hit regions, overlap prototype and dragging implemented. Appearance/motion accepted by user. DPI, click-through and focus matrix remains partly unverified. |
| 1 — Desktop foundation | **Implemented; acceptance pending** | Create shortcut, tray, independent notes, hide/show, single instance, versioned local saves and restart restoration implemented. Windows end-to-end restart and latest topmost regression need verification. |
| 2 — Tactile paper and motion | **Implemented; native acceptance pending** | Pinned-sheet flow, directional curl, creation entrance, five-colour palette with picker, persistent sound preference and diagnostics moved out of ordinary notes. Native visual acceptance of the entrance, performance profiling and live geometry validation remain. |
| 3 — Reliability, ergonomics and accessibility | **Planned; some groundwork done** | Persistence tests, work-area recovery and basic keyboard editing exist. Complete DPI/display/suspend tests, focus/IME/accessibility checks, reversible deletion/undo, and resource profiling. |
| 3B — Main application / note manager | **Planned after core notes are reliable** | Manage visible and hidden notes through the same main-process state; provide general settings. Detailed scope below. |
| 4 — Packaging and beta readiness | **Planned** | Unpacked build command configured only. Installer, packaged smoke tests, icons/branding, guide and release readiness remain. |
| 5 — macOS feasibility | **Deferred** | Separate native hit-testing/window activation investigation required. Current app does not claim macOS support. |
| 6 — Optional profiles exploration | **Future consideration only** | Decide whether profiles are useful and whether they are local-only. Accounts, authentication and sync are not implemented or authorized by this milestone. |

## Current core functionality

- [x] Electron + React + TypeScript, npm lockfile and production build.
- [x] One transparent, frameless, topmost native window per note.
- [x] Windows `setShape` with documented shadow/input fringe compromises.
- [x] Native dragging with flexible renderer-side paper response.
- [x] Directional curl and orientation; continuous flatten-then-curl transition.
- [x] Ctrl+Alt+N, tray Create / Show All / Hide All / Quit.
- [x] New / Hide note controls and native editing context menu.
- [x] Actions hide through dragging/settling and return opposite the curl.
- [x] Scrollbar-free editor with subtle overflow indicators.
- [x] Main-owned note state, autosave, backup recovery and schema validation.
- [x] Save failure reporting and cancellation of normal quit on save failure.
- [x] Persistent text, positions, paper variant, orientation and hidden state.
- [x] Single-instance handling, shortcut cleanup and initial work-area recovery.
- [ ] Certify Phase 1 restart / shortcut / tray behavior through Windows GUI tests.
- [ ] Certify latest topmost fix against the user's Alt+Tab reproduction.
- [ ] Validate click-through/overlap during curl flips and settling.
- [ ] Validate mixed DPI, monitor disconnect and taskbar changes.
- [x] Note creation entrance from the display work-area bottom.
- [x] Curated palette with on-note picker and context menu.
- [ ] Reversible deletion/undo.
- [ ] Complete accessibility, IME, reduced-motion and ten-note performance checks.

Checked items mean code is implemented; they do not imply that unrun native tests passed.

## Open issues and verification

| Item | Current evidence | Next action |
| --- | --- | --- |
| Notes become buried after switching apps and clicking a note | User supplied reproduction. Topmost reassertion on show/restore/focus/shape changes and taskbar/frame changes implemented. User reports progress is good; exact repeated regression is not recorded as passed. | Repeat launch → Alt+Tab → click background app → click note at least 20 times in Notepad/browser; confirm editing and z-order. |
| Native input region versus animated paper | Resting shape plus padding and temporary dual-shape union implemented; transparent fringe can accept clicks. | Inspect overlap, shadows and corner routing throughout flip/settle. |
| Persistence and recovery | Four real-filesystem tests pass. Native multi-note restart/forced-kill checks not run by agent. | Follow [Phase 1 checklist](PHASE_1.md) with disposable recovery data. |
| Development packaging dependencies | Last audit reported six moderate advisories, no high/critical. | Review packaging dependency chain before distribution; do not assume an old audit is current. |

Latest executed checks (2026-11-14): `npm run build` (includes strict typecheck) and `npm test`, **32 tests across 8 files passed**. Packaging, live shortcut collisions, mixed-DPI hardware and the latest native regression are **NOT RUN by the agent**. Detailed historical evidence is in [FEASIBILITY.md](FEASIBILITY.md).

## Phase 3B — main application direction

The future main app should be a quiet control center for the existing notes:

- List/search notes, including visible and hidden notes, with a clear visibility state.
- Create a note, show/focus an existing note, hide it, and recover off-screen notes.
- Use the same main-process note IDs, persistence and window lifecycle as desktop notes.
- Offer general settings such as the create shortcut, reduced motion and default note appearance. Add startup behavior only when explicitly scoped.
- Keep independent desktop notes usable when the manager window is closed; opening a manager must not create a fullscreen overlay or replace individual note windows.
- Include deletion only with the shared undo/trash behavior established in Phase 3.

No manager UI or settings screen has been built yet. Profile support is a separate future decision; do not add login, cloud dependencies or sync speculatively.

## Resume here

1. Read this tracker, the implementation plan and `docs/PHASE_1.md`.
2. Verify the latest native stacking fix and Phase 1 save/restart flow; record actual results.
3. Address confirmed core bugs, then complete the remaining Phase 2 work while preserving the accepted paper feel.
4. Advance through reliability work before starting the main manager milestone.

This checkpoint is development progress, not a packaged beta or a declaration that the full MVP is complete.


## Paper-motion branch ? 2026-11-13

Branch `improve/paper-motion` refines the paper with coupled middle/free-edge springs, exact damped spring integration, soft velocity saturation and native motion sampling at up to roughly 60 Hz. Creation now independently randomizes curl side and resting tilt (up to 2.3 degrees either way, with a 25% chance of zero tilt). Curl side is persisted separately from angle; old saves remain compatible. Native hit regions now accept explicit curl side so straight notes and independently randomized curls align with their rendering.

Automated build/typecheck and tests recorded for the branch; visual acceptance is pending. Compare slow movement, fast reversals, off-center grabbing and release on the actual Windows compositor before judging this as a final improvement. Existing shape padding/click-through tradeoffs remain. No main-branch merge or remote publication requested for this experiment.


## Velocity-driven swing follow-up (2026-11-13)

Editor focus outlines and experiment bounds are suppressed only while dragging/settling; keyboard focus indicators return at rest. Native horizontal velocity (DIP per 16 ms, converted to DIP/second) drives an independent damped angular spring. Slow movement remains subtle; fast movement smoothly saturates at 6.5 degrees additional target tilt, with a 7-degree visual safety bound. Release returns the target to zero without resetting spring velocity, so reversal and recovery remain continuous. Reduced motion bypasses swing.

Default shape mode temporarily uses a cached, nonrectangular union of rotated silhouettes during native drag and for 1.4 seconds after release. This accommodates larger visual tilt without per-frame region regeneration. It also broadens the interactive transparent fringe during that interval. Tight mode remains a clipping diagnostic; ignore mode retains its existing static-polygon limitations. Manual checks needed: focused editor drag (no dashed rectangle), slow/fast sweeps, rapid reversal, release, corners/shadows at maximum tilt, regrab during settling, and restored keyboard focus outlines. Actual Windows GUI verification remains NOT RUN by agent.

## Drag focus and audio experiment (2026-11-13)

Implemented explicit editor activation, a full-width top grab strip including both corners, and a speed-responsive synthesized swoosh with a per-note session mute toggle. Audio resources are created lazily, reused and suspended at idle. Automated audio lifecycle checks pass; listening, caret behavior and real CPU/memory measurements remain pending. See the latest [feasibility entry](FEASIBILITY.md) and [manual checks](PHASE_1.md). This remains on the motion experiment branch.


## Pinned-sheet paper flow (2026-11-14)

Replaces the previous motion model. Diagnosis of the old stiffness: the whole sheet rotated rigidly about its centre (so the pinched point slid under the cursor), the top edge was a fixed straight line, edge bow was capped at 9 px, and deformation followed velocity, so the paper stayed bent at constant speed.

What changed:

- `src/shared/flow.ts` — dynamics in the window's frame. Two lagging stages (near the fingers, and the free end) plus a vertical stage are forced by window **acceleration**, with a small air-drag term. Constant-speed travel relaxes to under half of the start-up bend; stops and reversals carry momentum into a counter-swing. Fixed 4 ms substeps make it refresh-rate independent; outputs saturate smoothly (30 px at the free end).
- `src/shared/sheet.ts` — the sheet is warped around the pinch: each point rotates about the grab by an angle linear in its distance, so the grab stays planted, the far end trails, and every edge (including the top edge on a corner pinch) curves. Downward pushes foreshorten the sheet (billow); upward pulls barely stretch it. The text block and curl follow via local affine fits; the curl is fitted to the ends of its cut so it stays joined. At rest the outline equals the native hit polygon exactly.
- Off-centre pinches hang slightly toward the sheet's weight while held. The pivot glides to a new pinch point, so regrabbing during settle is continuous.
- Bend-dependent shading band and shadow lift; the frame loop sleeps when settled (also while held still) and lands exactly on the rest shape with an untransformed text block.
- Native samples now carry velocity in DIP/s from real elapsed time (pause-safe). The drag envelope region is rebuilt from the extreme warped silhouettes and precomputed at startup.
- Removed `src/shared/paper.ts`, `speedTilt` and its tests; added `tests/flow.test.ts` and `tests/sheet.test.ts`.

Evidence, kept separate:

| Check | Result |
| --- | --- |
| `npm run build`, `npm test` (28 tests) | PASS |
| Built app launches against disposable user data, writes `notes.json`, no logged errors (12 s smoke run) | PASS |
| Built renderer driven by scripted motion events in Chrome (stubbed bridge): corner pinch, fast sweep, reversal, curl flip, release, regrab, held droop | PASS — no errors; max vertex change 6 px/frame through 2400 DIP/s reversals; zero animation frames after settle and while held still; exact rest outline restored |
| Real native drag on the Windows compositor: feel, pinch anchoring under the cursor, clipping at the window edge, click-through fringe during the 1.4 s post-release envelope | **NOT RUN** — needs a human hand |
| Text editing/IME/selection after drags, audio, CPU profile in Electron | **NOT RUN** |

Manual checks to run: slow sweep, fast sweep, abrupt reversal, vertical lift and push, diagonal travel, each top corner pinch, release and immediate regrab; watch the far corners and shadow for clipping at maximum swing, confirm text stays legible, and confirm a click on the editor after a drag still focuses it. Tuning constants live at the top of `flow.ts` (stiffness, damping, inertia, drag, limits) if the feel is too loose or too stiff.

Known tradeoffs: the text block is an affine approximation of a curved sheet, so at extreme bends its corners can sit about a pixel off the true surface. The drag envelope is larger than before, so the transparent fringe that accepts clicks during a drag and for 1.4 s afterwards is larger too. The non-native pointer-drag comparison mode still uses the old simple tilt.


## Phase 2 completion (2026-11-14)

The user accepted the pinned-sheet flow by feel ("I like it"); that is visual acceptance of the motion, not a full native test matrix.

Implemented:

- **Creation entrance.** A new note fades in at the lower edge of the pointer's work area and rises to its destination on a damped spring (about 1% overshoot, roughly 0.45 s). Main moves the window and sends the renderer the same motion samples as a drag, so the paper flexes on the way up. Grabbing the note mid-flight cancels the rise and keeps it where it is; hiding or closing snaps it to the destination. The destination, never an intermediate position, is what gets saved. System reduced motion skips the entrance. Restored notes do not animate.
- **Palette.** Yellow, peach, mint, lavender and blue, each with its own paper, rolled underside and ink (`src/shared/palette.ts`); ink contrast is above 7:1 on every paper. Colours cross-fade over 260 ms. A small dot beside New/Hide opens five swatches in place (radio group, Escape closes, closes on drag or blur). The context menu has the same choice. A note created from another note starts on the same paper; the shortcut and tray create yellow.
- **Save format v2.** Notes store a semantic `color`; data gains `settings.sound`. Schema 1 files migrate on load (variant 0 to yellow, 1 to peach) and the old file is kept as the backup on first save. Unknown colours, missing settings and schema 3+ are rejected without overwriting.
- **Sound preference.** Now one persistent, global setting, toggled from the note context menu or the tray, applied to every note immediately. The per-note session toggle is gone from the note face.
- **Ordinary note face.** Only New, Hide and the colour dot. Hit-testing experiments appear only when launched with `STICKEE_DIAGNOSTICS=1` or `--diagnostics`, and the experiment IPC is refused otherwise. The drag tooltip is removed. All incidental tints derive from the ink colour.

Evidence:

| Check | Result |
| --- | --- |
| `npm run build`, `npm test` (32 tests, including migration, validation and contrast) | PASS |
| Built app, empty disposable data: first note created through the entrance path, destination saved, no logged errors | PASS (the rise itself was not watched) |
| Built app, schema 1 disposable data: migrated to v2, colours mapped, `.bak` holds the v1 file | PASS |
| Built renderer in Chrome with a stubbed bridge: five colours, picker open/choose/Escape, cross-fade, state pushed from main, no diagnostics control | PASS |
| Entrance on the real compositor: smoothness, fade, taskbar on other edges, negative-coordinate monitors, grabbing mid-flight | **NOT RUN** |
| Context-menu and tray colour/sound items, sound toggle audibly applying | **NOT RUN** |
| Mixed DPI, ten-note performance, high-contrast mode | **NOT RUN** |

Known tradeoffs: for the first fraction of a second the rising note can overlap a bottom taskbar while it fades in. The entrance runs on a main-process timer (8 ms), so its smoothness depends on main-thread load. Paper grain and finer edge texture were left out deliberately; the sheet stays clean.

Remaining before Phase 2 can be called accepted: watch the entrance and try the picker, context menu and tray on Windows. Next roadmap item is Phase 3 (reversible deletion, display lifecycle, accessibility, profiling).
