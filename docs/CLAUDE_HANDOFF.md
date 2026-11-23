> **LATEST USER DIRECTION — APPROVED PAPER ANIMATION:** The user considers the current paper animation **ABSOLUTELY AMAZING**. Do not modify, retune, replace, or refactor its animation behavior unless the user explicitly requests specific modifications. Preserve the dynamics, bending, pinch response, swing, curl transitions, settling, and visual motion tuning. Earlier requests to improve paper flow are superseded. Pending verification does not authorize animation changes. If another feature requires changing the animation, report the issue and obtain the user's specific direction first. This applies throughout all remaining phases.

# Paplet — development handoff and remaining roadmap

Prepared 2026-11-14. This document is a detailed backlog and creative brief for the next engineer, including Claude. It records current evidence and recommended work; it does not declare all proposed features part of the immediate implementation scope.

## 1. Where we left off

Paplet is a real Windows-first Electron + React + TypeScript application. Each visible sticky note is its own transparent, frameless native window. The product recreates placing and moving paper on a computer screen while ordinary desktop applications remain usable underneath.

Current branch: `improve/paper-motion`, pushed to `origin/improve/paper-motion`.

Latest commit: `260856c` — Refine drag focus and add experimental paper swoosh.

Earlier branch commits introduced coupled paper springs, randomized curl orientation/resting tilt, speed-driven swing, and suppressed drag outlines. These changes have not been merged into `main`.

Last executed verification: production build including TypeScript check passed; 16 tests across six files passed; working tree was clean after push. These results are historical, not a test run on today's machine state. Automated tests do not certify visual quality, native hit-testing, real audio output, or Windows compositor smoothness.

### What exists

- Independent 360 × 360 DIP native windows enclosing approximately 280 × 280 DIP paper.
- Windows `setShape` regions, normal/tight/whole-window-ignore diagnostic modes, and a cached expanded movement region.
- Native OS dragging; renderer-side flexible silhouette, middle/free-edge springs, rotation, shadows, and release settling.
- One directional corner curl with continuous flatten-then-recurl when switching sides.
- Random left/right curl at creation, independently randomized resting angle up to about ±2.3 degrees, including a 25% chance of perfectly straight paper.
- Faster horizontal movement produces stronger spring-driven swing. Motion responds to where the paper was grabbed.
- Full-width top grab strip, including top corners. Dragging clears editor focus; new notes wait for explicit editor activation instead of automatically showing a caret.
- Multiline plain-text editor, hidden native scrollbar, and subtle overflow cues.
- New/Hide controls that disappear while dragging/settling and return opposite the curl.
- Experimental speed-responsive synthesized swoosh, with a per-note session Sound on / Muted toggle. Audio is lazy, reused, faded and suspended at idle.
- Ctrl+Alt+N, tray Create / Show All / Hide All / Quit, single-instance behavior, hide on close.
- Main-process ownership of notes, versioned JSON persistence, debounced saves, atomic write/backup recovery, and error reporting.
- Initial work-area recovery and platform boundary for Windows-specific behavior.
- Product-focused README and progress/feasibility/development documentation.

### What is not complete

Phase 0 has a conditional baseline. Phase 1 is implemented but still needs native acceptance. Phase 2 is partially implemented. Reliability, the main manager, distribution and macOS work remain. Positive user feedback is evidence of improvement, not a complete test matrix.

## 2. Sources of truth and precedence

Read the entire `PAPLET_IMPLEMENTATION_PLAN.md`, then `docs/PROGRESS.md`, `docs/FEASIBILITY.md`, `docs/PHASE_1.md`, and this handoff before editing. Inspect actual code rather than assuming the proposed architecture already exists.

Latest user preferences refine older specification language:

- Normal square paper with a subtle curl; avoid jagged/ragged silhouettes.
- Exactly one understated lower corner curl at a time; avoid two symmetrical decorative curls.
- Curl direction and orientation should respond naturally to drag direction, with a smooth uncurl/recurl transition.
- Paper needs more convincing flow and bending. Current motion is improved but still feels too stiff.
- Dragging must not activate text input or show a caret. Clicking the editor or keyboard navigation activates editing.
- Top corners must remain usable grab points.
- No dotted editor/debug rectangle while dragging.
- Drag controls hide during movement and settle, then return opposite the curl.
- Sound is an experiment the user likes; keep it controllable and assess actual cost.
- A future main app must manage visible/hidden notes and settings with a creative, exceptionally polished interface.
- Apple application quality is the design standard, while Windows remains the actual target platform.

The older plan's automatic text focus after creation is superseded by explicit editor activation. The sound experiment does not settle the final default: make the preference persistent and user-controlled before release.

## 3. Creative direction — the bar for every interaction

The user's standard is: “This looks like an Apple application.” Treat that as a demand for coherent craft throughout the product, not a request to paste macOS window decorations onto Windows.

### Required qualities

- Calm, neat, precise, sleek and immediately understandable.
- Strong typography, intentional spacing, consistent optical alignment and a clear reading order.
- A small set of coherent materials: tactile paper for notes; quiet, carefully layered surfaces for management UI.
- Motion that preserves position and velocity across interruptions. Every movement should explain what changed.
- Immediate press/hover/focus feedback; useful animation never blocks input.
- Sparse controls with clear names, predictable placement and keyboard access.
- Carefully designed light/dark states, contrast, empty states, errors, and disabled/loading states.
- Local system fonts with appropriate fallbacks. Do not bundle Apple fonts without permission to distribute them.
- Custom work where it creates identity; native Windows conventions where they protect usability.

### Avoid

Generic admin dashboards, metric tiles, SaaS sidebars, giant welcome headings, stock UI kits, neon accents, indiscriminate blur/glass, pill-shaped everything, emoji icons, fake traffic-light buttons, noisy textures, excessive wobble, or loading choreography for local operations.

Paper should feel flexible and light but retain enough stiffness to read as paper. The user's silk-curtain reference describes continuous flow, not permission to make a note look like rubber or water. Content must stay legible.

### Practical design artifacts

Before building the manager, record one coherent visual direction with a small token set: typography, spacing, colors, materials, corner radii, shadows, focus states and motion timings. Implement an interactive representative view with real data. Review compact, long-content, empty, keyboard-focused, dark and high-contrast states before spreading the design across features.

## 4. Priority 0 — close the native reliability gate

### Always-on-top and activation

Repeat the reported regression: launch → Alt+Tab to another app → click that app → click a note. Run at least 20 cycles with Notepad and a browser. Confirm the clicked note remains visible, editable and above ordinary applications. Confirm background applications retain focus until deliberately selecting a note. Test overlapping notes, hide/show, restore and task switching. Do not solve stacking through a timer that repeatedly steals focus.

### Shape, visual clipping and hit-testing

Test transparent corners against both background applications and other notes, at rest and throughout maximum swing/curl transitions. Document the actual transparent fringe accepted by the native region. `setShape` affects clipping as well as input: larger visual shadows and bending need an explicit region budget.

Current tradeoff: normal mode includes about 10 DIP shadow padding, and a cached sweep of rotated silhouettes broadens the region while moving and shortly after release. Tight mode is a clipping diagnostic; whole-window ignore polling is not proven arbitrary animated per-pixel hit-testing. Improve measured problems without claiming perfect click-through.

### Text versus drag

Check new-note creation, previously focused editor, selected text, drag pause, release, rapid regrab and both corner grips. Typing after a drag must not modify text until the editor is deliberately focused. Editor selection, scrolling, paste, IME and keyboard focus must remain functional. Check that the expanded grip does not intercept text.

### Persistence and lifecycle

Use disposable test data to verify multiple notes, multiline Unicode text, orientations, positions, hidden state, immediate quit after input, normal restart, forced termination after debounce, malformed primary recovery and denied writes. Confirm failure never silently discards notes. Separate store unit-test coverage from actual Electron lifecycle evidence.

Deliverable: a consolidated `docs/MANUAL_TEST_MATRIX.md` with PASS / CONDITIONAL / FAIL / NOT RUN, environment, scaling, reproduction steps and evidence. Do not replace honest NOT RUN entries with inferred passes.

## 5. Priority 1 — improve paper flow substantially

### Diagnose the current stiffness

Inspect `src/renderer/src/main.tsx`, `src/shared/motion.ts`, `src/shared/paper.ts`, native motion sampling in `src/main/index.ts`, and region geometry. The current model has coupled middle/free-edge springs, limited silhouette displacement and largely planar content transforms. The curl is a separate transformed SVG group. These are plausible sources of the remaining flat/stiff impression; they need visual investigation rather than assumed replacement.

### Desired physical behavior

1. The point pinched by the pointer feels anchored, with immediate native translation and no jump.
2. Nearby paper follows strongly; more distant paper trails slightly and bends continuously.
3. A top-center grab produces balanced hanging/swinging; a corner grab produces asymmetric twist.
4. Acceleration creates lag/bending. Sustained constant-speed travel should relax rather than remain permanently distorted.
5. Fast reversals carry momentum into a soft counter-bend without a snap or a reset.
6. Horizontal, vertical and diagonal movement all have coherent responses.
7. Fast motion has more swing than slow motion, with smooth saturation and no abrupt hard-stop appearance.
8. Releasing keeps current displacement and velocity, then settles promptly. Regrabbing a settling note remains continuous.
9. The lower curl follows the same sheet, lighting and inertia; it must not look like a sticker pasted onto the paper.
10. The resting shape remains a mostly square, readable note with one subtle curl.

### Recommended experimental sequence

- Capture repeatable baseline sequences: slow sweep, fast sweep, abrupt reversal, vertical lift, diagonal travel, corner pinch, release and regrab.
- Normalize native samples using real elapsed time. Investigate smoothing, sample gaps and refresh-rate behavior without adding input lag.
- Separate velocity-driven swing from acceleration-driven deformation; filter noisy derivatives and clamp smoothly.
- Improve grab-relative constraints and distribute bend/twist across a small number of coherent degrees of freedom.
- Prototype a lightweight segmented surface or low-resolution mesh only if a better SVG model cannot produce convincing bending. Compare visual benefit, editor alignment, clipping and resource cost before adopting it.
- Keep readable text and its hit targets aligned with the visible sheet. Do not render editable text into a texture or split it into individually animated letters.
- Drive curl transition with direction hysteresis and dwell/commit logic so small jitter cannot repeatedly flip it. Keep current flatten/recurl continuity.
- Tie shadow lift/contact and subtle shading to the deformation. Avoid animated heavy blur/filter work unless profiling justifies it.
- Make all motion interruptible and honor reduced motion. Stop frame loops when settled.

Do not add a physics engine, GSAP or WebGL merely to use a library. Choose the smallest implementation that meets the visual bar. Native window movement remains authoritative; decorative flexibility never delays the window behind the cursor. Do not introduce uncontrolled window fling after release.

### Acceptance

Compare the same scripted hand movements before/after on Windows, at normal speed and frame-by-frame. Require visibly improved distributed bending, stable pinching, readable text, continuous curl and settling, no shape clipping, and no regression in input routing. Record CPU/frame evidence and user visual acceptance separately. A mathematical spring unit test cannot prove the result feels natural.

## 6. Finish Phase 2 — creation and material polish

### Creation entrance

Create on the pointer's monitor using the work area, with a quick rise from its lower edge toward the destination and a restrained settle. Preserve deliberate editor activation. Respect taskbars on any edge, negative display coordinates and reduced motion. Let the user interrupt the entrance; do not queue input behind it. Avoid a giant overlay and avoid persisting intermediate animation positions as the resting destination.

### Palette and appearance

Add warm yellow, peach, mint, lavender and light blue as a small curated palette. Tune paper/underside/shadow/text colors together. Use stable semantic color IDs with migration from the current numeric paper variant; preserve old saves. Provide quiet hover/focus/context controls and a gentle color transition. Inspect contrast and curl lighting for every color.

Refine paper grain, edges, local contact shadows and curl shading without returning to jagged edges. Test busy/light/dark desktop backgrounds, different note overlaps and all supported scaling factors. Keep the existing randomized straight-angle possibility.

### Controls and editor

Move prototype controls/experiment labels out of the ordinary note UI into a developer-only route or explicit diagnostic mode. Keep normal controls discreet and discoverable by keyboard. Avoid crowding New/Hide/Sound into a permanent toolbar. Check long text, overflow cues, selection, caret visibility, placeholder, wrapping and click targets at supported text sizes. Hide motion-only decoration without removing keyboard focus indicators at rest.

## 7. Audio experiment follow-through

Current sound uses one looping filtered-noise voice per used note, with speed-driven volume/frequency and idle suspension. The sample buffer is approximately 96 KB at 48 kHz; this excludes AudioContext and Electron overhead. Existing tests mock the audio engine, so listening/latency/CPU remain unverified.

- Listen to slow/fast movement, pauses while holding, reversals, release and Alt+Tab. Remove clicks, obvious loop seams, harsh hiss and abrupt starts.
- Shape the sound toward soft paper/air movement; avoid a repetitive game effect or exaggerated cinematic whoosh.
- Decide whether acceleration/bend energy gives better causality than speed alone.
- Add a persistent global sound preference; consider per-note override only if it earns its complexity. Do not add automatic sound on unrelated actions.
- Verify muting immediately fades output and hidden/disposed notes do not keep audio active.
- Profile multiple used notes, actual CPU, memory, audio-context lifecycle and idle recovery. Consider a shared audio service only if measurements justify it.
- Keep all audio generated/bundled locally with no asset downloads.

## 8. Phase 3 — daily-use reliability and accessibility

### Displays and Windows lifecycle

Test 100/125/150/200% scaling, mixed-DPI crossings, negative coordinates, resolution/taskbar changes, monitor disconnect/reconnect, lock/unlock, sleep/wake and display topology changes. Recover inaccessible notes to reachable work areas. Test small screens and oversized restored bounds. Preserve logical coordinate consistency and prevent scaling jumps.

Document actual boundaries for exclusive fullscreen, UAC/secure desktop, virtual desktops and task switching. Ordinary topmost support is not a promise to appear over every system surface.

### Editing and accessibility

Test IME composition, Unicode/emoji, multiline paste, selection shortcuts, undo/redo, context menus, word wrapping and large note content. Verify Tab order, accessible names/states, keyboard access to all controls, screen reader behavior, contrast, reduced motion and increased text size. Verify reduced motion across creation, drag, curl and deletion, not only one CSS transition.

### Reversible deletion

Introduce main-owned trash/undo semantics before adding Delete to notes or manager. Define retention, restore, permanent deletion and restart behavior. Preserve ID, text, appearance and placement on restore. Test delete/undo across visible and hidden windows, restart, save failure and multiple rapid actions. A brief peel-away can follow successful state changes; animation must not determine whether data was saved.

### Persistence evolution and maintainability

Add schema migrations when introducing semantic colors, settings, timestamps or trash. Preserve existing data and reject unsupported future formats safely. Test backup handling and stale/temp-file scenarios where relevant. Keep saves serialized and avoid high-frequency disk writes during motion.

Refactor the compact renderer and main entry files incrementally into meaningful editor, paper, motion, audio, window-lifecycle and IPC units as features justify it. Avoid a large rewrite while changing behavior. Validate IPC inputs/senders, narrow bridge access, retain secure Electron defaults and local-only content.

### Optional ergonomics

Pin/unpin may be added if straightforward after stacking is reliable; its desired semantics must be defined first. Configurable shortcut belongs with settings and needs conflict handling plus tray fallback. Launch-at-login is a later explicit setting, not an automatic installation side effect.

## 9. Phase 3B — the main app, creatively designed

### Purpose and scope

Build a quiet home for all notes: visible on the desktop, hidden, and eventually recoverable trash. The user wants a real main application but does not want a conventional dashboard UI. Desktop notes remain first-class independent objects; the manager supports them rather than replacing the experience.

### Proposed direction: a paper collection / desk drawer

Use a calm, beautifully typeset window with a compact top area containing search, create and a small settings entry. Below, actual note previews occupy a thoughtfully spaced collection with subtle material depth and consistent resting alignment. A small All / On screen / Hidden selector provides filtering. Use paper color and text excerpts as the identity of each note rather than generic icons or stat cards.

A selected preview can reveal a focused reading/action area or expand in place while preserving spatial continuity. A quiet visibility marker and an explicit Show on desktop action make state understandable. Any stack/fan metaphor must remain easy to scan: avoid covering text, hiding controls or requiring clever gestures to access ordinary actions.

This is a recommended concept to prototype, not a fixed approved layout. Consider alternative compositions if they better deliver clarity and craft. Creativity must improve navigation and recognition, not just add decorative paper piles.

### Essential operations

- Search note text locally; filter visible/hidden notes; provide clear empty/no-results states.
- Create a note and show/focus an existing one without duplicates.
- Hide/show individual notes and all notes using shared main-process actions.
- Recover notes on disconnected/off-screen displays.
- Preview real saved content, appearance and visibility; show clear truncation for long text.
- Restore/delete through the same reversible trash model as desktop notes.
- Open settings and explain where notes are stored/recovered when relevant.
- Support keyboard navigation, selection, search focus and contextual actions.

Decide whether editing happens in the manager or opens the desktop note. If inline editing is introduced, share state/versioning and prevent divergent copies or lost concurrent edits. Do not create an independent second note database.

### Settings

Start with create shortcut, motion preference (system/default plus user override), sound, default paper color and relevant window behavior. Persist changes with validation and safe defaults. Consider launch-at-login only as explicitly scoped later work. Avoid a huge settings taxonomy or speculative controls.

### Window and state architecture

Use one dedicated manager window, a narrow typed manager API, and main-owned note IDs/state. Manager changes update active note windows; desktop changes update the manager without polling every frame. Closing the manager leaves tray and notes running. Reopening focuses the existing manager instance. Choose explicit tray/open/second-launch behavior and document it.

Persist only justified manager preferences such as bounds/filter when useful. Keep transient selection and animations out of the note data model. Use ordinary accessible window controls and proper Windows resizing/keyboard behavior; do not sacrifice usability for fake macOS chrome.

### Manager acceptance

Every note is discoverable even when hidden/off-screen. Show/focus targets the correct window once. Search and filters reflect current text/state. Closing/reopening loses nothing. Keyboard-only operation is complete. The UI looks intentionally designed in light/dark/empty/dense states. No login, remote services, telemetry or network is required.

## 10. Phase 4 — packaging and publication readiness

- Keep the existing Electron Builder choice; configure actual installer and optionally portable targets when scoped. `pack:win` currently produces an unpacked directory, not a finished installer.
- Replace prototype app ID/product metadata intentionally; assess user-data migration before changing identifiers or paths.
- Create cohesive local app/tray/installer icons and check small-size contrast.
- Decide real product versioning and license; current package metadata is prototype-level and should not imply a stable 1.0 release.
- Run a current dependency/security review and fix relevant findings deliberately. Historical audit counts are not current results.
- Add useful CI typecheck/test/build/package sanity checks without release credentials or automatic publication.
- Smoke-test the packaged executable/installer on Windows independently from development mode. Check tray, shortcut, audio, persistence, restart, uninstall and upgrade behavior.
- Document unsigned-binary/SmartScreen behavior honestly; assess signing before broad distribution without promising it is implemented.
- Write user-facing help, hotkeys, recovery guidance, release notes and known limitations. Keep local setup commands in development documentation rather than the product README.
- Review Paplet name availability before public branding decisions. Name clearance has not been established.
- Publishing releases, signing, deployment or merging to main requires the applicable user authorization; do not infer it from this backlog.

## 11. Later exploration and explicit exclusions

macOS requires a separate native feasibility spike for hit-testing, activation, transparent windows, drag and display coordinates. Windows `setShape` is not a macOS implementation. Keep platform abstractions ready without claiming support.

Profiles are future consideration. Clarify whether they mean local workspaces or actual user accounts before implementing anything. Accounts, authentication, cloud sync, databases and backend infrastructure are not authorized by the manager concept.

Reminders, Markdown/rich text, AI, OCR, media, collaboration, infinite canvas, automatic updates and elaborate collections are outside the current core scope. Do not spend the remaining session scaffolding them.

## 12. Suggested order for the next engineering sessions

1. Inspect repo and verify the latest branch baseline. Consolidate pending native acceptance and fix reproduced core failures first.
2. Spend the first focused implementation session on a visibly better paper-flow prototype, with before/after evidence and regression checks. Keep a safe baseline for comparison.
3. Finish creation entrance, palette and ordinary-note control polish. Complete reduced-motion behavior.
4. Address deletion/undo, display lifecycle, input/accessibility and resource profiling to establish daily-use reliability.
5. Prototype and implement the creative main manager using the same note state and lifecycle.
6. Package and verify a Windows beta; then consider release and later platforms.

If time is limited, finish a coherent improvement and document remaining work. Do not create half-built implementations of every phase just to consume usage. Maintain `docs/PROGRESS.md` and record actual test results after each milestone.

## 13. Working agreements and completion report

- Work directly in the repository; inspect existing changes before editing.
- Maintain Electron + React + TypeScript, minimal dependencies and secure defaults.
- No fullscreen input overlay. Keep native movement separate from decorative physics.
- Run checks appropriate to changed behavior: `npm run build`, `npm test`, and relevant manual Windows scenarios. `npm run dev` supports development; build then `npm start` previews production output.
- Report exactly which GUI, audio and performance checks were run. Never label unrun tests PASS.
- Make logical commits when authorized by project instructions. Use author AND committer `Clorkies <clarkisnoob434@gmail.com>`, no AI/co-author/sign-off trailers, and no signing unless requested. Verify metadata and full message.
- Current work is on a pushed feature branch. Do not merge/push further changes without authorization in the active task.
- Completion report: concrete changes, test results, unresolved tradeoffs, manual verification steps, branch/commit and next recommended task.

## 14. Brief prompt to give Claude

```text
Continue development of Paplet in this repository. First read AGENTS.md, the entire PAPLET_IMPLEMENTATION_PLAN.md, docs/PROGRESS.md, docs/FEASIBILITY.md, docs/PHASE_1.md, and docs/CLAUDE_HANDOFF.md. Inspect the current branch and working tree before editing. The latest pushed baseline is improve/paper-motion at 260856c; do not assume main contains it.

Our creative standard is “this looks like an Apple application”: exceptionally clean typography, spacing, materials, restrained controls and continuous, interruptible physical motion, while remaining a real Windows Electron app. First focus on making the existing paper significantly more flowy and convincingly bent around the grab point, with speed/acceleration-aware swing, asymmetric corner pinching, natural reversals and a subtle single curl. Preserve responsive native window movement, explicit editor activation, corner grab areas, click-through, persistence and controllable swoosh audio. Diagnose and fix any reproduced core regression before extending features.

Use the handoff roadmap for subsequent work: finish Phase 2, establish Phase 3 reliability, then build a creative paper-collection/desk-drawer main manager for visible/hidden notes and settings—not a generic dashboard. Keep shared main-process state, secure defaults and minimal dependencies. No cloud/accounts or fullscreen overlay. Implement functioning files, run appropriate checks, update the tracker, and distinguish real Windows GUI/audio/performance verification from automated tests. Work in coherent milestones; do not rush through every phase or claim unrun checks passed. Do not merge, push or publish without my authorization. Start implementing the focused paper-motion improvement now.
```


## Latest user sequencing update - 2026-11-15

The user moved comprehensive QA after Phase 3B to avoid repeated acceptance
sessions. This supersedes earlier instructions to block manager work on the
native matrix. Phase 3B is implemented on `feat/note-manager`; use the latest
PROGRESS.md and NEXT_SESSION.md entries plus MANAGER_DESIGN.md. Desktop animation
remains frozen and unchanged. Combined GUI/audio/accessibility/display/performance
acceptance is still NOT RUN; focused build/typecheck and 42 automated tests pass.
