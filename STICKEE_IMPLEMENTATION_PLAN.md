# Stickee â€” Desktop Sticky Notes That Feel Physical

> **Status:** Implementation specification / Codex handoff  
> **Working product name:** Stickee (provisional; existing apps use this name)  
> **Target:** Windows 11 first; macOS later  
> **Approach:** Feasibility spike first, then a small local-first desktop MVP  
> **Last reviewed:** 2026-11-12

## 1. Product thesis

Stickee is not a conventional note manager, dashboard, or web app. It puts *believable pieces of paper on the user's screen*. A note should appear, move, flex, settle, and disappear like a lightweight physical object. The app must coexist with normal desktop work: it should not consume an invisible fullscreen interaction layer or obstruct applications outside each note's actual area.

### Experience principles

1. **Feels like paper, works like software.** Paper silhouettes, restrained texture, softly irregular edges, subtle rotation, convincing contact shadows, and delightfulâ€”but fastâ€”motion.
2. **One shortcut to capture.** A new note comes up from the bottom of the current monitor, settles near the pointer, and is immediately ready for typing.
3. **The desktop stays usable.** Clicking a fully transparent part of a note's window should reach the application underneath. Notes should not capture unrelated desktop input.
4. **The note *is* the interface.** Avoid title bars, dashboards, toolbars, generic cards, intrusive controls, and an ever-visible settings panel.
5. **Local-first and reliable.** Saved notes survive app restart, OS restart, and a crash. No login, backend, analytics SDK, or network permission for MVP.
6. **Respect attention.** Quick, tactile feedback; keyboard support; reduced-motion option; no forced sounds.
7. **Make Windows excellent; keep macOS possible.** Put window-system-specific functionality behind a platform adapter, not throughout the React UI.

## 2. MVP product decisions

| Area | Decision |
|---|---|
| OS | Windows 11 (64-bit) primary; macOS deferred |
| Form | Desktop utility running from system tray, not a browser/PWA |
| Default note behavior | Always on top of ordinary app windows |
| Later option | Per-note pin/unpin for hybrid desktop-only behavior |
| Shortcut | `Ctrl+Alt+N` default, configurable later; graceful handling if already registered |
| Creating a note | Animate from below work-area bottom of pointer's display, then focus text editing |
| Moving | Grab a designated non-text area / paper edge; move entire native window; subtly tilt/settle |
| Editing | Plain text / multiline; autosave; sensible selection and paste behavior |
| Colors | A small curated palette, starting with warm yellow |
| Window model | One transparent frameless native window per visible note, managed by one background app process |
| Storage | Local versioned JSON with atomic writes and backups; can migrate later |
| Packaging | Windows installer + portable/executable as practical, using one chosen toolchain |
| User accounts/sync | Out of scope |
| App naming | Provisional; do not imply name is cleared for distribution |

Do not expand MVP into reminders, Markdown rendering, OCR, AI, voice recording, cloud sync, rich media, team collaboration, an infinite canvas, or complicated note collections.

## 3. Stack and technical boundaries

**Primary stack**

- **Electron** for native windows, tray, global shortcuts, display detection, and file persistence.
- **React + TypeScript + Vite**, preferably through an established Electron/Vite template; avoid hand-rolled dev-server plumbing if a maintained setup exists.
- **Vanilla CSS / CSS variables** for bespoke paper styling, plus lightweight spring utilities or a maintained animation library *only where needed*.
- **Vitest** for unit tests of geometry, models, persistence, and reducers.
- **Electron Builder** or **Electron Forge** for packaging: choose one; document why. Do not install both by default.
- Use stable, currently supported package versions; record actual versions in the lockfile. Node.js LTS and npm/pnpm are acceptableâ€”pick one package manager and commit its lockfile.

**Security defaults**

- `contextIsolation: true`, `nodeIntegration: false`, sandbox enabled where compatible.
- A minimal, typed `contextBridge` preload API. IPC actions are narrowly scoped and input-validated.
- Load local application content only. No remote pages, remote JavaScript, external stylesheets, or CDN fonts.
- Restrictive Content Security Policy; no arbitrary shell commands, eval, or unrestricted filesystem access exposed to renderer.
- Avoid speculative permissions, telemetry, update services, and dependencies.

**Window system boundary**

Create an adapter such as `WindowPlatform` with capabilities for creating a note window, applying a clickable region, updating position, choosing topmost state, and checking native capabilities. Provide a Windows implementation first; leave an explicitly unsupported macOS stub or capability report where necessary.

Do **not** mistake a transparent rectangular native window for a truly non-rectangular interactive object. On Windows, investigate Electron's experimental `BrowserWindow.setShape(rects)` and test its real behavior. On macOS this API is not supported; plan a distinct future hit-testing solution if necessary. Do not falsely claim pixel-perfect hit-testing without testing it.

Relevant official references:

- Electron custom window styles: https://www.electronjs.org/docs/latest/tutorial/custom-window-styles
- Electron custom window interactions: https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions
- Electron BrowserWindow API (`setShape`, `setIgnoreMouseEvents`, topmost, positioning): https://www.electronjs.org/docs/latest/api/browser-window
- Electron globalShortcut: https://www.electronjs.org/docs/latest/api/global-shortcut

## 4. Critical feasibility gate: Phase 0 â€” Window & interaction spike

> **Non-negotiable:** Build and run this small prototype on **Windows 11** before investing in the full product. If you cannot perform local GUI verification in the current environment, implement testable code but mark visual/native behavior **UNVERIFIED** and give the user precise manual test steps. Do not report it as passed.

### Phase 0 deliverable

A minimal runnable Electron prototype with **two independent sticky notes**; one small transparent paper-like polygon with subtly ragged / curled corners; another overlapping it. A test panel or sample background app underneath to test click-through. No database, toolbar, or app architecture beyond what the test needs.

### Experiments

**P0-A â€” Real transparency**
- Use `frame: false`, `transparent: true` (and other necessary compatible options).
- Render a shape with uneven paper silhouette and a few degrees of rotation.
- Verify no opaque rectangle, white corner, stale frame, or focus artifact appears when hovering, dragging, unfocusing, or switching applications.
- Inspect results in Windows light/dark modes and at 100% / 125% scaling where possible.

**P0-B â€” Hit-testing and click-through**
- Click **inside** the paper: note responds.
- Click clearly **outside** the paper but still inside its rectangular native window bounds: the underlying app receives the click.
- Verify overlapping notes behave sensibly; transparent corners should not intercept another note's input.
- Compare `setShape(rects)` against selectively ignoring mouse events (`setIgnoreMouseEvents` with forwarding) only as a fallback. The latter ignores *the entire window* when active and must not be assumed to solve arbitrary per-pixel hit testing.
- Note that `setShape` clips visual drawing as well as interaction; test shadows and edge antialiasing. It's acceptable for the MVP to use a slightly forgiving silhouette region, but document the exact tradeoff.
- Record any API limitations and corner cases; do not hide them behind visual tricks.

**P0-C â€” Motion / drag smoothness**
- Drag a note with pointer capture and a controlled, coalesced native position update loop, or a proven OS-native drag area if smoother.
- Preserve pointer-to-note offset while moving; no jumping when drag starts.
- Apply a subtle renderer-side angle/scale response while moving, then a damped spring settling effect after release.
- Compare manual drag + throttled IPC with native drag-area behavior and select what actually feels smoother.
- Do not call shape-region generation at unnecessary frame rates or introduce high-frequency disk writes.

**P0-D â€” Always-on-top and focus**
- Notes float over ordinary open applications.
- Typing into a note deliberately focuses its editor; merely moving / releasing it should not unexpectedly steal focus.
- Document limitations for exclusive fullscreen apps, secure desktop/UAC, virtual desktops, and task switchers.

**P0-E â€” Multi-monitor / DPI**
- Position a note on the monitor containing the cursor. Test moving it across monitor edges and mixed DPI when hardware is available.
- Handle work-area vs full-display bounds (especially the Windows taskbar) and off-screen note recovery.

### Phase 0 acceptance criteria

- Two notes appear as separate, genuinely transparent, frameless windows.
- Shapes have no visible native rectangular border.
- On the actual Windows target machine, clicking transparent corners reaches the background app reliably in repeated manual tests.
- Both notes can be dragged independently, without visible snapping or major jitter.
- Their content remains legible and shadows do not visibly clip in the chosen implementation.
- Known compromises are stated clearly in `docs/FEASIBILITY.md`, with a **PASS / CONDITIONAL / FAIL** verdict for each experiment.

**Gate:** Proceed to full MVP only on PASS or on a *clearly documented, user-acceptable* CONDITIONAL. If a blocking item fails, stop and compare Windows-native hit-test integration or another desktop window shell. Do not quietly replace real click-through with a giant transparent fullscreen overlay.

## 5. Design specification

### Paper appearance

- Default note around **280 Ã— 280 px** (tunable), with small random-looking yet deterministic edge irregularities.
- Paper colors (e.g., warm yellow, peach, mint, lavender, light blue), each with carefully tuned text contrast.
- Fine grain / paper fiber treatment kept subtle and performant; prefer small local assets, CSS, or procedural SVG over enormous texture files.
- Slight deterministic per-note rotation, e.g. **âˆ’2.5Â° to +2.5Â°**. Rotation is not a permanent full-window transform: keep window geometry / hit region in sync with paper render.
- Soft layered drop shadow that suggests a lifted sheet, not a neon glass card.
- Minute corner curl or folded-paper illusion; not large 3D page-turn animations.
- Avoid excessive skeuomorphism, oversized rounded rectangles, ubiquitous glassmorphism, gradients, emoji decoration, or generic AI-dashboard styling.

### Motion principles

| Interaction | Proposed feel | Guardrail |
|---|---|---|
| Create note | Note rises from just below screen work area and settles with a soft spring | Fast enough for immediate capture; no long choreography |
| Grab note | Tiny lift and slight angle response | Never make the pointer feel disconnected |
| Drag | Follow pointer closely; slight lag only in decorative transform, not position | No input latency disguised as physics |
| Release | Small damped wobble / tilt recovery | No long, attention-grabbing bounce |
| Color change | Gentle paper-color interpolation | No flash |
| Delete | Optional short peel-away effect; provide undo | Deletion must remain reliable and accessible |
| Reduce motion | Disable large translations and spring wobble | Preserve all functionality |

Physics must be deterministic/reproducible enough to test; tune based on real use, not only video previews. Prefer **60 fps target** on common Windows hardware, while acknowledging that native window movement and compositor behavior can limit frame consistency.

### Interaction details

- A note has a quiet grab area or edge that can initiate dragging **without disrupting text selection**.
- A text area supports multiline input, selection, paste, IME composition, keyboard shortcuts, and natural wrapping.
- Controls appear on hover/focus and via keyboard-accessible context menu: change color, pin/unpin (future or MVP if simple), delete, close/hide.
- Keyboard creation via global shortcut; menu creation via tray.
- Optional small note context menu for color and delete; **do not** put a constantly visible toolbar in every note.
- Deletion requires undo or a reversible trash state; do not make accidental drag-to-delete irreversible.
- Clicking a note raises it relative to other notes without raising a giant parent window.
- New notes start on the cursor's active monitor and stay within usable screen bounds after animation.
- If work-area dimensions shrink / monitors disconnect, recover any inaccessible notes onto an available display.
- Persist notes without requiring the user to press Save.

## 6. Proposed architecture

```text
stickee/
â”œâ”€â”€ README.md
â”œâ”€â”€ AGENTS.md                         # Codex project guardrails and local conventions
â”œâ”€â”€ package.json
â”œâ”€â”€ tsconfig*.json
â”œâ”€â”€ electron.vite.config.ts           # or equivalent maintained template config
â”œâ”€â”€ build/                            # packaging / native resources
â”œâ”€â”€ assets/                           # bundled icons, textures, static SVGs
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ main/
â”‚   â”‚   â”œâ”€â”€ index.ts                   # app bootstrap, single-instance lock, lifecycle
â”‚   â”‚   â”œâ”€â”€ window-manager.ts          # independent per-note BrowserWindows
â”‚   â”‚   â”œâ”€â”€ shortcuts.ts               # global create shortcut
â”‚   â”‚   â”œâ”€â”€ tray.ts                    # tray menu / quit
â”‚   â”‚   â”œâ”€â”€ displays.ts                # work-area and monitor geometry
â”‚   â”‚   â”œâ”€â”€ store.ts                   # local persistence + migrations
â”‚   â”‚   â”œâ”€â”€ ipc.ts                     # validated messages
â”‚   â”‚   â””â”€â”€ platform/
â”‚   â”‚       â”œâ”€â”€ types.ts
â”‚   â”‚       â”œâ”€â”€ windows.ts
â”‚   â”‚       â””â”€â”€ macos.ts               # capability-limited placeholder only
â”‚   â”œâ”€â”€ preload/
â”‚   â”‚   â”œâ”€â”€ index.ts                   # safe exposed API
â”‚   â”‚   â””â”€â”€ types.ts
â”‚   â”œâ”€â”€ renderer/
â”‚   â”‚   â”œâ”€â”€ main.tsx
â”‚   â”‚   â”œâ”€â”€ NoteApp.tsx
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”œâ”€â”€ PaperNote.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ NoteEditor.tsx
â”‚   â”‚   â”‚   â””â”€â”€ NoteControls.tsx
â”‚   â”‚   â”œâ”€â”€ styles/
â”‚   â”‚   â”‚   â”œâ”€â”€ tokens.css
â”‚   â”‚   â”‚   â”œâ”€â”€ paper.css
â”‚   â”‚   â”‚   â””â”€â”€ motion.css
â”‚   â”‚   â””â”€â”€ hooks/
â”‚   â”‚       â””â”€â”€ useNoteDrag.ts
â”‚   â””â”€â”€ shared/
â”‚       â”œâ”€â”€ models.ts                 # Note type, schema version
â”‚       â”œâ”€â”€ geometry.ts               # shape / hit region / display clamps
â”‚       â””â”€â”€ events.ts                 # typed IPC contract
â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ geometry.test.ts
â”‚   â”œâ”€â”€ persistence.test.ts
â”‚   â””â”€â”€ notes.test.ts
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ FEASIBILITY.md               # Phase 0 evidence and verdicts
â”‚   â”œâ”€â”€ MANUAL_TEST_MATRIX.md        # Windows-specific QA
â”‚   â””â”€â”€ ARCHITECTURE.md
â””â”€â”€ .github/workflows/                # optional CI after local app runs
```

This is a *suggested structure*, not a mandate to create empty files. Build only folders needed for the current phase; do not scaffold speculative features.

### Electron main process responsibilities

- Only one app instance; second launch shows/focuses notes or creates a note intentionally.
- Manage a map `noteId -> BrowserWindow`.
- Register/unregister global shortcut and tray lifecycle.
- Track topmost state, display geometry, window positions, z-order, and shutdown.
- Validate note IPC and persist updates safely.
- Never keep a transparent fullscreen input-grabbing overlay.

### Renderer responsibilities

- Display one note per note window (simplest initial model).
- Handle text editing and paper appearance.
- Compute **visual** drag/tilt/settling effects; request native position updates through minimal IPC.
- Keep editing and dragging exclusive when appropriate so text remains selectable.

### Shared data shape (illustrative)

```ts
type Note = {
  id: string;
  text: string;
  color: 'yellow' | 'peach' | 'mint' | 'lavender' | 'blue';
  bounds: { x: number; y: number; width: number; height: number };
  rotationDeg: number;
  pinned: boolean;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

type AppData = {
  schemaVersion: number;
  notes: Note[];
  settings: {
    createShortcut: string;
    reduceMotion: boolean;
    launchAtLogin: boolean;
  };
};
```

Add fields when justified; don't store pixels of rendered textures or animation state. For display mapping, persist sane logical coordinates and **re-clamp** on startup; monitor identifiers can change.

### Persistence requirements

- Data under Electron `app.getPath('userData')`; no hard-coded user profile paths.
- Autosave text after a brief debounce, on blur, and on clean shutdown; native movement committed after drag ends.
- Atomic file write (write temp, flush as practical, rename), backups / recovery from malformed JSON, and schema versioning.
- Do not accidentally drop content when multiple note windows save concurrently; main process is the authoritative write queue.
- Confirm deletion behavior is consistent with undo/trash semantics.

## 7. Milestones and deliverables

### Phase 0 â€” Feasibility spike (must come first)

Implement Â§4 experiments. Produce runnable prototype, clear pass/fail report, and concise commands to test on Windows. **No installer or production styling required yet.**

**Exit condition:** Transparent, irregular note shape with acceptable real click-through; smooth movement; documented limits. Otherwise pause before committing architecture.

### Phase 1 â€” Working desktop foundation

- Establish maintainable Electron + React + TypeScript app and lockfile.
- Tray icon with Create Note, Show All, Hide All, Quit.
- Single-instance behavior and shutdown cleanup.
- Multiple frameless notes; always-on-top by default.
- Global create shortcut with registration failure message / fallback menu.
- Local persistence including restart restoration.
- Correct startup and graceful shutdown; no warnings in standard test run.

**Exit condition:** Create, type, move, and restore several notes after restart.

### Phase 2 â€” Tactile paper and motion

- Bespoke edge silhouette, color palette, grain, fold treatment, and shadows.
- Creation-from-bottom animation on cursor monitor.
- Natural grab/drag/release animation without pointer jitter.
- Clear distinction between drag regions and editable text.
- Reduced-motion behavior and accessible focused controls.
- Refine rotated hit region as needed based on real Windows tests.

**Exit condition:** Feels recognizably like paper rather than floating web cards, with desktop click-through intact.

### Phase 3 â€” Reliability, ergonomics, and accessibility

- Hover/context controls; change colors, hide, delete with undo.
- Optional pin/unpin (hybrid) *only if straightforward*; otherwise defer.
- Mixed-DPI, monitor disconnect/reconnect, taskbar work-area, suspend/resume.
- Keyboard / IME behavior, clipboard paste, high contrast, focus order.
- Unit tests for geometry, persistence, undo/delete, and migrations.
- Simple in-app troubleshooting / diagnostics view if actually needed.

**Exit condition:** Daily-use quality on Windows 11 without lost notes or input obstruction.

### Phase 3B ? Main application / note manager (later milestone)

After core note reliability is established, add a main application window for managing visible and hidden notes and general settings. It must reuse the main-process note state and independent window lifecycle, show visibility clearly, and allow create/show/focus/hide and off-screen recovery. Closing the manager must leave the notes and tray usable. Deletion must share reversible trash/undo behavior. The manager must not become a fullscreen input overlay.

Potential user profiles are a separate future exploration (Phase 6); this milestone does not authorize accounts, authentication, cloud services or sync. Track detailed progress in `docs/PROGRESS.md`.

### Phase 4 â€” Packaging and beta-ready release

- Installer, uninstall behavior, application icons, app name configuration.
- A small user guide including hotkeys, recovery, and where data is stored.
- Smoke-test the *packaged executable* on Windows, not only dev mode.
- Clear release notes and known limitations.
- No code signing promise; document SmartScreen behavior for unsigned binaries. Signing can be added before public distribution.
- Only add CI checks that add value (typecheck, lint, unit tests, packaging sanity).

**Exit condition:** Fresh Windows installation can create and recover notes successfully.

### Phase 5 â€” macOS investigation (not MVP)

- Validate transparent frameless note windows, floating window levels, focus, desktop Spaces, Mission Control, and screen scaling on a real Mac.
- Electron `setShape` is not available on macOS. Investigate macOS-specific native input regions / hit testing or a non-rectangular interactive-content workaround using a platform adapter.
- Revalidate window movement and app activation behavior; macOS can require different window/window-level choices.
- Keep platform-specific code isolated and do not claim Mac support until tested and packaged there.

### Phase 6 ? Optional user profiles exploration (deferred)

Determine whether profiles are needed and whether local profiles suffice. Define a separate scope and storage/privacy model before implementation. Login, authentication, remote accounts and sync remain out of the current MVP.

## 8. Test matrix

| Scenario | Expected result | How verified |
|---|---|---|
| Click center of note | Note receives interaction | Manual Windows GUI |
| Click transparent corner inside native bounds | Underlying app receives click | Manual Windows GUI, repeated |
| Overlap notes; click transparent corner of top note | Lower note or underlying app receives event | Manual Windows GUI |
| Drag note quickly | No jump; acceptable responsiveness | Manual Windows GUI |
| Drag across monitor boundary | Correct physical position / DPI | Manual if multi-monitor available |
| Change scaling from 100% to 125% | Note rendered and positioned correctly | Manual Windows GUI |
| Start new note with another app focused | Appears on cursor display; editable | Manual Windows GUI |
| Create 10 notes | Reasonably responsive; no runaway CPU | Perf observation + manual |
| Close/reopen app | Text, position, color restored | Automated persistence + manual |
| Force kill while editing | Last debounced text recoverable | Manual controlled fault test |
| Delete then undo | Content restored | Unit + manual |
| Shortcut collision | Tray still creates note; helpful warning | Manual |
| Unplug display / change resolution | Notes recover into visible work area | Manual where possible |
| Reduced motion enabled | Animations curtailed | Manual + unit where applicable |
| Packaged installer launched | Same behavior as dev build | Windows smoke test |

Any test not physically run must be marked **NOT RUN**, not PASS.

## 9. Definition of done: MVP

The first MVP is acceptable when a user can launch Stickee, create a note from the tray or global shortcut, watch it enter naturally from the bottom, write multiline text, drag the independent paper-like note over ordinary applications, click through surrounding transparent areas, create multiple independent notes, and reopen the app with their notes intactâ€”all without interacting with a traditional main dashboard.

Visual polish cannot excuse broken click-through, input focus, persistence, keyboard editing, or window placement.

## 10. Risks and decision triggers

| Risk | Impact | Mitigation / decision trigger |
|---|---|---|
| Transparent areas absorb clicks | Severe UX break | Phase 0 `setShape` test; native Windows fallback if necessary |
| Irregular window region clips shadow / antialiasing | Visual defects | Test region padding/visual technique; document tradeoff |
| Native-window dragging stutters | Breaks physical illusion | Benchmark movement strategies; keep visual motion separate from native movement |
| React text editing competes with dragging | Lost selection / poor UX | Explicit grab zone; pointer capture; test selection and IME |
| Multiple windows consume too much RAM | Bad background utility | Lightweight renderers, shared asset strategy, profile 10-note case |
| Monitor changes strand notes offscreen | Lost usability | Clamp against current work areas on startup and display changes |
| macOS shape support differs | Cross-platform blocker | Windows-first adapter and separate future macOS spike |
| App name collision | Distribution/branding confusion | Keep Stickee provisional until proper name/trademark/domain checks |

## 11. Codex execution protocol

1. **Read this plan completely.** Use it as the project's product specification, not a prompt to overbuild.
2. Inspect the actual current directory first; don't overwrite existing work.
3. Implement **Phase 0 first**, with a minimal reproducible setup. If it passes or is conditionally acceptable, proceed to Phase 1 in a subsequent scoped task.
4. Prefer **working code** and concrete verification over high-level descriptions. Create files and run the commands possible in the current environment.
5. For Windows-specific visual / native tests, distinguish **verified locally** from **manual verification required**.
6. Use a minimal, testable, documented implementation. Commit logical changes if the repository is under git; do not publish, deploy, or create a remote repository unless instructed.
7. Before finishing each phase, run available typechecks/tests/build, update `docs/FEASIBILITY.md` or appropriate test docs, and report commands/results.
8. If any Phase 0 blocker remains, **stop and report the blocker**; don't proceed into the full application or silently weaken desktop click-through.
9. In final report include files changed, how to run, what was tested, what remains unverified, and next recommended Codex task.

## 12. First Codex session â€” exact scope

**Goal:** Create the smallest real Windows Electron proof of concept that convincingly demonstrates *physical, always-on-top, click-through* paper-shaped notes.

**Implement now:**

- Minimal Electron + React/TypeScript project setup in the current directory.
- Two independent frameless transparent note windows; one irregular paper silhouette and another overlapping note.
- Always-on-top, real dragging, and a modest renderer-only tilt/release treatment.
- Experiment with Windows `setShape` for accurate click-through around the note; include a visible status/log or debug marker for what hit-testing strategy is active.
- Minimal instructions and a `docs/FEASIBILITY.md` test checklist with unverified items marked honestly.
- `npm run dev` (or equivalent), `npm run typecheck`, and a realistic build command.

**Do not implement yet:** user accounts, sync, reminders, settings screens, update system, macOS-specific production support, elaborate data storage, a full note library, website, marketing page, or release pipeline.

**Success criterion:** A human on Windows 11 can move two believable sticky notes over other applications and still click the exposed transparent corners to interact with what is underneath.

---

## Source references (verified 2026-11-12)

1. Electron: [Custom Window Styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles) â€” frameless/transparent windows and limitations.
2. Electron: [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window) â€” `setShape(rects)` on Windows/Linux (experimental), `setIgnoreMouseEvents`, topmost, coordinates, native window behavior.
3. Electron: [Custom Window Interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions) â€” click-through behavior and mouse forwarding.
4. OpenAI: [Managing usage with GPT-6 Astra in Work and Codex](https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex) â€” model and usage guidance.
5. OpenAI: [ChatGPT Work and Codex](https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex) â€” current model access may depend on plan/rollout.


## Later product direction ? user clarification

A future main Stickee window may manage both visible and hidden notes and provide general settings. Potential user-profile support is a future exploration, not authorization for accounts, authentication, sync, or cloud services in the current MVP. Keep note state owned by the main process so a later manager can operate on the same notes without coupling independent paper windows to a dashboard. Current priority remains reliable sticky-note interaction and persistence. Do not implement the manager or profiles as part of the current core fixes.
