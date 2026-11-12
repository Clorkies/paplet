# Stickee progress tracker

Last updated: 2026-11-13. Work resumed on `improve/paper-motion` for a focused motion experiment.

**Current position:** Phase 1 is implemented with native Windows acceptance pending. Parts of Phase 2 were developed early to establish the paper interaction. The user accepted the current look and motion; this does not certify every native-window test.

The [implementation plan](../STICKEE_IMPLEMENTATION_PLAN.md) defines scope. This tracker records completion and remaining work. Update it alongside implementation changes and keep automated checks separate from manual Windows results.

## Phase overview

| Phase | Status | Delivered / remaining |
| --- | --- | --- |
| 0 — Native window and interaction feasibility | **Accepted conditional baseline** | Independent transparent windows, shaped hit regions, overlap prototype and dragging implemented. Appearance/motion accepted by user. DPI, click-through and focus matrix remains partly unverified. |
| 1 — Desktop foundation | **Implemented; acceptance pending** | Create shortcut, tray, independent notes, hide/show, single instance, versioned local saves and restart restoration implemented. Windows end-to-end restart and latest topmost regression need verification. |
| 2 — Tactile paper and motion | **Partially implemented** | Flexible surface, grab-dependent bowing, directional orientation, smooth uncurl/recurl, shadows, reduced-motion path, overflow cues and drag-aware controls implemented. Entrance-from-bottom, palette, visual/performance tuning and live geometry validation remain. |
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
- [ ] Implement note creation entrance from the display work-area bottom.
- [ ] Add curated palette controls and reversible deletion/undo.
- [ ] Complete accessibility, IME, reduced-motion and ten-note performance checks.

Checked items mean code is implemented; they do not imply that unrun native tests passed.

## Open issues and verification

| Item | Current evidence | Next action |
| --- | --- | --- |
| Notes become buried after switching apps and clicking a note | User supplied reproduction. Topmost reassertion on show/restore/focus/shape changes and taskbar/frame changes implemented. User reports progress is good; exact repeated regression is not recorded as passed. | Repeat launch → Alt+Tab → click background app → click note at least 20 times in Notepad/browser; confirm editing and z-order. |
| Native input region versus animated paper | Resting shape plus padding and temporary dual-shape union implemented; transparent fringe can accept clicks. | Inspect overlap, shadows and corner routing throughout flip/settle. |
| Persistence and recovery | Four real-filesystem tests pass. Native multi-note restart/forced-kill checks not run by agent. | Follow [Phase 1 checklist](PHASE_1.md) with disposable recovery data. |
| Development packaging dependencies | Last audit reported six moderate advisories, no high/critical. | Review packaging dependency chain before distribution; do not assume an old audit is current. |

Latest executed checks: `npm run build` (includes strict typecheck) and `npm test`, **14 tests across 5 files passed**. Packaging, live shortcut collisions, mixed-DPI hardware and the latest native regression are **NOT RUN by the agent**. Detailed historical evidence is in [FEASIBILITY.md](FEASIBILITY.md).

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
