> **LATEST USER DIRECTION — APPROVED PAPER ANIMATION:** The user considers the current paper animation **ABSOLUTELY AMAZING**. Do not modify, retune, replace, or refactor its animation behavior unless the user explicitly requests specific modifications. Preserve the dynamics, bending, pinch response, swing, curl transitions, settling, and visual motion tuning. Earlier requests to improve paper flow are superseded. Pending verification does not authorize animation changes. If another feature requires changing the animation, report the issue and obtain the user's specific direction first. This applies throughout all remaining phases.

# Paplet progress tracker

Last updated: 2026-11-15. Phase 3D sets and revised manager/preferences are implemented on `feat/note-manager`. User requested stopping here, committing and pushing. Feature PRs target dev.

**Current position:** Additive named sets, direct manager labels, shortcut recording and selectable Rustle / Click & drop audio are implemented. Formatting and drawing remain future work; optional paper sizes are last. Native acceptance is pending.

The [implementation plan](../PAPLET_IMPLEMENTATION_PLAN.md) defines scope. This tracker records completion and remaining work. Update it alongside implementation changes and keep automated checks separate from manual Windows results.

## Phase overview

**Critical latest report:** At pushed head `9035066`, user reports Alt+Tab followed
by dragging makes the note disappear. Native overlay reliability is FAIL by user
report, not fixed or reproduced by the agent. The user also rejects the Click &
drop sound, especially drop. See [current handoff](SESSION_HANDOFF_2026-11-15.md).
This documentation-only investigation makes no runtime changes; prior 61-test
results do not certify the native window lifecycle or acoustic quality.

| Phase | Status | Delivered / remaining |
| --- | --- | --- |
| 0 — Native window and interaction feasibility | **Accepted conditional baseline** | Independent transparent windows, shaped hit regions, overlap prototype and dragging implemented. Appearance/motion accepted by user. DPI, click-through and focus matrix remains partly unverified. |
| 1 — Desktop foundation | **Implemented; acceptance pending** | Create shortcut, tray, independent notes, hide/show, single instance, versioned local saves and restart restoration implemented. Windows end-to-end restart and latest topmost regression need verification. |
| 2 — Tactile paper and motion | **Implemented; native acceptance pending** | Pinned-sheet flow, directional curl, creation entrance, five-colour palette with picker, persistent sound preference and diagnostics moved out of ordinary notes. Native visual acceptance of the entrance, performance profiling and live geometry validation remain. |
| 3 - Reliability, ergonomics and accessibility | **In progress; acceptance deferred** | Durable trash/undo and picker keyboard access implemented. Display/suspend hardening, full input/accessibility and resource profiling remain. |
| 3B - Main application / note manager | **Implemented; combined acceptance pending** | Search/filter/read notes, desktop visibility/recovery, shared trash/undo/permanent deletion, sound/default colour/shortcut preferences. |
| 3C - Collection craft and actions | **Implemented; native acceptance pending** | Cleaner scroll rails, recovery-list Trash, multi-select and atomic batches, Find/Move here with static highlight. |
| 3D - Additive saved sets | **Implemented; native acceptance pending** | Named folios, membership editing, additive Show set, schema 4 migration; shortcut recorder and sound styles also delivered. |
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
- [x] Main-owned persistent trash/undo (native acceptance pending).
- [ ] Complete accessibility, IME, reduced-motion and ten-note performance checks.

Checked items mean code is implemented; they do not imply that unrun native tests passed.

## Open issues and verification

| Item | Current evidence | Next action |
| --- | --- | --- |
| Notes become buried after switching apps and clicking a note | User supplied reproduction. Topmost reassertion on show/restore/focus/shape changes and taskbar/frame changes implemented. User reports progress is good; exact repeated regression is not recorded as passed. | Repeat launch → Alt+Tab → click background app → click note at least 20 times in Notepad/browser; confirm editing and z-order. |
| Native input region versus animated paper | Resting shape plus padding and temporary dual-shape union implemented; transparent fringe can accept clicks. | Inspect overlap, shadows and corner routing throughout flip/settle. |
| Persistence and recovery | Four real-filesystem tests pass. Native multi-note restart/forced-kill checks not run by agent. | Follow [Phase 1 checklist](PHASE_1.md) with disposable recovery data. |
| Development packaging dependencies | Last audit reported six moderate advisories, no high/critical. | Review packaging dependency chain before distribution; do not assume an old audit is current. |

Latest executed checks (2026-11-15): production build/typecheck PASS; 61 tests across 15 files PASS. GUI, listening, hardware, compositor and performance acceptance remain NOT RUN.

## Phase 3B — main application direction

The future main app should be a quiet control center for the existing notes:

- List/search notes, including visible and hidden notes, with a clear visibility state.
- Create a note, show/focus an existing note, hide it, and recover off-screen notes.
- Use the same main-process note IDs, persistence and window lifecycle as desktop notes.
- Offer general settings such as the create shortcut, reduced motion and default note appearance. Add startup behavior only when explicitly scoped.
- Keep independent desktop notes usable when the manager window is closed; opening a manager must not create a fullscreen overlay or replace individual note windows.
- Include deletion only with the shared undo/trash behavior established in Phase 3.

The manager UI and settings are now implemented; see the latest Phase 3B entry and `MANAGER_DESIGN.md`. Profile support is a separate future decision; do not add login, cloud dependencies or sync speculatively.

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
- **Ordinary note face.** Only New, Hide and the colour dot. Hit-testing experiments appear only when launched with `PAPLET_DIAGNOSTICS=1` or `--diagnostics`, and the experiment IPC is refused otherwise. The drag tooltip is removed. All incidental tints derive from the ink colour.

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


## Phase 3 - durable trash and keyboard access (2026-11-14)

Preserved the pre-existing local documentation updates and the approved animation.
No motion dynamics, pinch, swing, curl, settling, entrance tuning, native drag
sampling, hit regions or audio behavior changed. Baseline tests were rerun: 32
passed. No native regression was reproduced or claimed fixed in this session.

Implemented schema 3 with validated optional deletion timestamps and migration
from schemas 1/2. Main-owned deletion saves synchronously before hiding/destroying
the note window; a failed save rolls back the deletion state. Tray Undo and
individual Trash entries restore saved notes across restarts. Show All and second
launch exclude trash. Trash has indefinite retention and no permanent deletion
UI yet. A failed restore load returns the note to trash; failed renderer loads
clean up their native window. Text messages from trashed notes are rejected.

The colour picker now has roving Tab focus, arrow-key selection with wrap, Escape
and selection focus restoration, and closes on focus leaving the group. Its
appearance and paper motion remain unchanged. This was an implementation review
fix, not a GUI-verified accessibility result.

Automated evidence: production build including strict TypeScript PASS; 38 tests
across 9 files PASS. Added real-filesystem trash/restore and v2 migration/backup
checks, rollback/repeated-delete/reverse-undo tests, and invalid trash validation.
GUI, audio listening, Narrator, denied-write native flow, display hardware and
performance profiling: NOT RUN. See [MANUAL_TEST_MATRIX.md](MANUAL_TEST_MATRIX.md)
for procedures and the resource measurement protocol.

Phase 3 remains incomplete: execute native acceptance, complete display lifecycle
recovery (including entrance/topology interaction), IME/accessibility verification
and actual resource profiling. Do not alter approved animation to resolve a
verification concern without the user's specific direction. Phase 3B manager is
not started; permanent deletion remains deferred. No merge, push or publication.

## Phase 3B - paper collection and preferences (2026-11-15)

The user explicitly moved comprehensive QA after Phase 3B. Do not treat pending
GUI/audio/display/accessibility/performance tests as a gate to manager work.
Core display lifecycle hardening remains outstanding where not already handled;
its acceptance is part of the combined pass, not a completed claim.

Created `feat/note-manager` from `feat/core-reliability` for this milestone. The
manager is an ordinary resizable native window with a separate sandboxed preload.
Normal startup, tray Open, tray double-click and second launch open/focus one
instance. Closing it leaves desktop notes, global shortcut and tray usable.

Implemented:

- Paper-coloured text previews, All / On screen / Hidden / Trash, complete-text
  local search, keyboard navigation and a scrollable full-text reading pane.
- Create, show/focus, hide, show/hide all and bring a note to the current display.
  Editing explicitly opens the independent desktop note; no second editable copy.
- Shared durable trash/restore, inline Undo and permanent deletion from Trash with
  native Cancel-default confirmation. No automatic expiration. Backups can retain
  older data; permanent deletion does not imply secure erasure.
- Persisted sound, default paper and configurable create shortcut. Register a new
  shortcut before releasing the old one; reject conflicts and roll back settings
  on failed save. Notes created from another note still inherit its paper colour.
- Storage path and backup explanation, light/dark styling, forced-colour rules,
  focus indicators and manager zoom support. No new dependencies or remote assets.
- Manager-only IPC sender/main-frame validation, serialized actions and coalesced
  main-owned snapshots. No per-frame polling and no second database.

Approved motion preserved: native movement/entrance block compared byte-for-byte
with the prior milestone and matched. Desktop renderer, dynamics, sheet geometry,
resting/movement regions, paper CSS and audio engine unchanged in this milestone.
No custom motion override was introduced. Recovery requested mid-entrance reports
a retry rather than changing its behavior.

Production build/typecheck PASS; 42 automated tests across 10 files PASS, including
manager IPC authorization, action serialization, single-window reuse/coalesced
events, and preference persistence/validation. No actual GUI, listening, Narrator,
mixed-DPI/lifecycle hardware or CPU/memory/frame measurements were run. These
remain NOT RUN in `MANUAL_TEST_MATRIX.md`. Design rationale in `MANAGER_DESIGN.md`.
No merge, push, publish or packaging/release performed.

## Product scope update — 2026-11-15 (planning only)

User likes the Phase 3B foundation and requests further manager craft. The latest
scope/order is in [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md):

- Phase 3C: cleaner scrolling, a distinct Trash view, multiple selection and
  separate Find on desktop / Move here actions with temporary highlighting.
- Phase 3D: named sets that show their existing notes additively, without replacing
  visible notes or duplicating content/windows; a paper-folio UI direction.
- Phase 3E: bold, italic, underline, strikethrough, bullets and checklists through
  a validated structured editor and lossless plain-text migration.
- Later: drawing/scribbles (high interest), then optional wide/tall paper sizes
  (lower urgency). Preserve the approved square-paper motion throughout.

No runtime code changed in this planning update; these items are not delivered.
Beyond QA, remaining work includes display/suspend implementation gaps, explicit
backup/export/import, release packaging/identity/help and later macOS feasibility.

## Phase 3C — collection craft and batch actions (2026-11-15)

Implemented the first authorized roadmap milestone, preserving the existing local
planning edits. Paper sizes are explicitly optional and last; sets are next.

- Thin integrated native scrollbars with hover/focus contrast and high-contrast
  fallback. Wheel, keyboard, touchpad and native thumb interaction are retained.
- Distinct Trash recovery list with removal dates, paper-colour markers, retention
  guidance and a document-style reading pane. Dates outside supported display
  ranges fall back safely rather than crashing the collection.
- Select mode, visible checkmarks, Ctrl-click, Shift-click/ranges, arrow/Home/End
  navigation and scoped Ctrl+A. Contextual actions support bulk Show, Hide, Trash,
  Restore and confirmed permanent deletion; one main-owned save with full rollback
  precedes native effects. Inline Undo restores the trashed group in the current
  manager session. Selection clears when its collection/search changes.
- Separate Find on desktop / Move here. Find retains reachable placement; Move
  here uses the manager's display. Both reveal/raise without an explicit editor
  focus request and add a static 1.8-second outline following the existing surface.
  A renderer-ready handshake protects the initial highlight on recreated notes.
  Unavailable displays recover with a status message. No extra input window/region.
- Native window failures after a successful batch save remain visible as warnings;
  note contents/state stay saved and the window can be retried individually.

Approved motion preserved: native motion/entrance block, renderer dynamics effect,
flow/sheet/motion modules, native geometry and audio engine are unchanged. The only
new desktop feedback is the explicitly requested temporary outline.

Production build/typecheck and all 46 tests across 11 files PASS. New batch tests
cover full-selection validation, single-save mutation, rollback preserving live
record identities, restart parsing/restore, unrelated-note preservation and order.
Actual GUI, audio, screen reader, hardware and performance checks: NOT RUN, still
deferred to the consolidated acceptance pass. No push/merge/publication.

## Phase 3D — sets, direct labels and input/audio preferences (2026-11-15)

Implemented the user's requested order and stop point:

- Removed decorative manager headings, empty-state descriptions and repeated
  locate/retention prose. Collection headings, counts and actions are direct.
- Read-only shortcut recorder with Record/Cancel, Escape, canonical key capture
  and explicit Save. Paplet's current global shortcut is released during capture
  and restored afterwards, including manager blur/close/renderer termination.
- Existing Rustle plus a separate Click & drop style. Two short generated buffers
  provide a grab click and damped release cue; cached per used context, non-looping,
  stopped on mute/cancel and suspended at idle. Preview is available in Preferences.
- Named paper-folio sets: create/rename/delete, add/remove existing members,
  create a note in a set and additive Show set. Notes can belong to multiple sets;
  loading twice does not duplicate their records or windows. Set deletion keeps
  notes, trash keeps membership, permanent deletion removes references atomically.
- Schema 4 migration for schemas 1–3, validated stable IDs/membership/settings,
  rollback on set-write failures and preservation of prior raw backups. Sets are
  local groupings of live notes, not templates, profiles or separate databases.

Production build/typecheck PASS; 56 tests across 14 files PASS. Added tests cover
set union/idempotence, reference preservation, deletion cleanup/rollback, migration
and backups, shortcut capture and recorder lifecycle, and mocked tactile audio
allocation/cues/suspension/cancellation. Native GUI, actual listening, keyboard/OS
timing, hardware lifecycle and performance acceptance remain NOT RUN. The agent
does not claim the synthesized sound has been audibly approved.

Source comparisons confirm native paper motion/entrance, renderer dynamics,
flow/sheet/geometry modules and original rustle engine are unchanged. The user
authorized committing/pushing at this stop point. dev originates at main
`161893e`; all feature PRs target dev. No merge or release is authorized/performed.

## Settings overflow and visibility transitions (2026-11-15)

User reported screenshot evidence of Preferences overflow and native flicker on
manager double-click. Source review identified floated full-width legends pushing
controls beyond the scrollport; those floats are removed and the form/colour and
sound grids constrained. No claim of native visual reproduction by the agent.

User explicitly requested manager-open entrance reuse, slide-down Hide and centered
manager creation. Implemented readiness-gated opening, idempotent show/focus,
reused entrance spring/velocity samples, interruptible downward exit and central
work-area positioning. Exit/entrance positions are transient; saved destinations
survive hide, quick reopen and quit. Save failures leave visibility unchanged.
Display changes settle/cancel transitions before recovering bounds. Reduced
motion skips travel. Normal dragging can interrupt a hide; other approved native
drag/deformation behavior is preserved.

Production build/typecheck PASS; 61 tests across 15 files PASS. New tests cover
paint/readiness gating, concurrent opens, interrupted exits, destroyed windows,
bounded/faded exit samples and work-area centering. Source comparisons preserve
renderer dynamics and flow/sheet/motion/geometry/audio modules. Actual Preferences
layout, reported native flicker remediation, input routing and transition quality
remain NOT RUN/acceptance pending. Commit/push authorized; no merge performed.

## Next phase request — main app UI refresh (2026-11-16)

User asked to fold a further UI update of the main app (manager, preferences, trash) into the next phase, using an Apple "liquid glass" material language. This is explicit user direction and overrides the default no-glassmorphism rule for the app chrome only. Constraints: the approved paper motion stays untouched; glass is for manager/settings surfaces, not the notes themselves; use real translucency (Electron `backgroundMaterial`/acrylic where available, with an opaque fallback), keep contrast >= 4.5:1, honour high contrast and reduced transparency. Priority order: fix the Alt+Tab drag-disappear regression first, then rework click-drop sound, then the UI refresh. Needs a design pass (see MANAGER_DESIGN.md) before implementation.

## Main app liquid glass (2026-11-16)

Manager, Preferences and Trash now use a liquid-glass material layer (`src/renderer/src/glass.css`); desktop notes are untouched and never load it. The manager window uses Windows 11 acrylic (`backgroundMaterial`, build >= 22621, not in high contrast) and the renderer is told via `?glass=1`; otherwise surfaces are opaque. Glass: capsule controls with a specular rim, sticky search row that papers scroll beneath, floating reading pane and footer, glass preference cards, dialogs that materialise. Honours reduced transparency, increased contrast, forced colours and reduced motion.
Verified: build and 61 tests pass; layout checked in Chrome with a mock backend in light and dark. NOT verified: actual acrylic on the native window, real Windows rendering, mixed DPI. The acrylic backdrop in Chrome checks was emulated with a gradient.
Also this session: Click & drop cues reworked (paper lift + soft slap). Alt+Tab drag-disappear was NOT reproduced with a real-input probe (window stayed visible, topmost, opaque, painted) and no fix was made; it remains open until the user can reproduce it.

## Main app layout redesign (2026-11-16, supersedes the first glass pass)

User rejected the first liquid glass pass (rounded-rectangle containers everywhere, folio look lost, search overlaying notes, sound still unsatisfying) but kept the glass window background. New layout: an inset glass source-list sidebar (Library: All notes / On screen / Hidden / Trash; Sets as folders; Preferences at the foot); a flat content area with a large page title that collapses into the toolbar on scroll; search is a toolbar icon that expands in place and collapses again when scrolling with an empty query, so it never overlays notes; sets shown as drawn folders with member papers tucked behind a frosted front panel; a flat inspector with actions as a plain list; one floating capsule for selection actions and undo. Preferences are hairline-separated rows. `glass.css` removed; `manager.css` rewritten.
Click & drop cues re-synthesised as clean tonal system-style sounds: a glassy tick on grab, a pitch-falling pop with a soft bell glint on drop. No noise layers.
Verified: build and 61 tests pass; layout checked in Chrome with a mock backend (light, dark, scrolled, selection, search open, Preferences). NOT verified: native acrylic window, real listening of the new cues, mixed DPI.
