# Stickee handoff — critical native visibility regression

## Immediate instruction and evidence

The user reported a **massive regression** after the latest pushed work:
"The on top of all app overlay feature is broken, I alt tabbed and when I tried
to drag the note it disappeared."

The user's latest instruction was **investigate and make a handoff; do not attempt
a fix in this turn**. This handoff turn changed documentation only. No runtime
code, tuning, settings, user notes or Git history was changed, and no new commit,
push or merge was performed. This is source investigation, not a reproduced
Windows diagnosis. The root cause is **not established**.

The user also rejected the **Click & drop sound**, especially the drop: it is not
satisfying. That acoustic feedback takes precedence over passing mocked tests.
No SFX change was attempted in this investigation turn.

Do not treat PR #3 as ready to merge based on the existing automated checks.
Prioritize the native disappearance before new features. Keep the original
approved paper bending/pinch/swing/curl/settling unchanged. Specific authorization
for show/hide/placement transitions does not authorize retuning those dynamics.

## Repository and Git workflow

- Workspace: `F:\Projects\Stickee`.
- Active branch: `feat/note-manager`.
- Current committed/pushed head: `903506660c2ede078b3b384e84e184f220670f9c`
  (`Fix settings overflow and note visibility transitions`).
- Previous head: `b19d33a` (`Add saved sets, shortcut recording and click-drop sound`).
- Earlier checkpoints: `4fcb89f` collection craft/batches/locate; `4cc7524` manager;
  `1018475` trash/core reliability; `de3fef8` Phase 2 paper/entrance/palette.
- Local and last verified remote `main` / `dev`: `161893e`. `dev` was created
  directly from main; no feature merges were performed by this agent.
- Other branch heads: `feat/core-reliability` at `1018475`,
  `improve/paper-motion` at `de3fef8`. All feature branches were pushed.
- Feature PRs target **dev**, not main. Open PRs were checked read-only during this
  investigation. They were created as drafts; inspect current status before action:
  [#1 paper](https://github.com/Clorkies/stickee/pull/1),
  [#2 core](https://github.com/Clorkies/stickee/pull/2),
  [#3 manager](https://github.com/Clorkies/stickee/pull/3).
- The branches share ancestor commits. Intended integration order is #1 → #2 → #3;
  no merges are authorized by this handoff. PR #3's body predates this new report
  and does not yet describe the critical failure. It was not edited this turn.
- This handoff and its documentation pointers are local, uncommitted edits.
  Preserve them. Recheck `git status` before any work.
- Use author AND committer `Clorkies <clarkisnoob434@gmail.com>`, concise milestone
  messages, no signing or attribution trailers. Verify metadata/message. New
  push/merge/release actions require authorization in the active task.

## What exists

Windows-first Electron/React/TypeScript with separate transparent frameless native
note windows, native OS dragging, shaped input regions, explicit editor activation
and local main-owned persistence. There is no fullscreen input overlay.

Implemented functionality:

- Approved pinned-sheet bend/pinch/swing, one directional curl and settling.
- Five semantic paper colours, palette picker, global sound preference, tray and
  create shortcut; no cloud, accounts or telemetry.
- Schema 4 with migrations from 1–3, validated JSON, atomic saves/backups and
  main-owned trash/undo/restore/permanent deletion. Save failures are surfaced.
- Native manager: search, All/On screen/Hidden, distinct dated Trash list, full
  read-only preview, multi-selection, atomic batch actions and group undo.
- Find on desktop / Move here with a separate temporary static outline.
- Named paper-folio sets: create/rename/delete, add/remove existing note IDs,
  create-in-set and additive Show set. Notes may belong to multiple sets. Loading
  does not replace visible notes or clone content. Trash retains membership;
  permanent note deletion removes references. Deleting a set keeps its notes.
- Preferences use direct labels, a read-only shortcut recorder with Record/Cancel
  and explicit Save, default paper, sound styles and a Preview button.
- Sound styles: original Rustle and synthesized Click & drop. The latter is now
  **rejected by the user on sound quality**, despite implemented functionality.
- Normal start/tray Open/tray double-click/second launch open one manager. Closing
  it leaves notes/tray/shortcut running. All content/resources remain local.

## What changed in 9035066

The user reported a Preferences screenshot with clipped labels, horizontal
overflow and vertically displaced colour buttons, plus flicker when double-clicking
a note in the manager. Requested changes were: opening a note should reuse the
creation slide-up, Hide should slide down, and manager New note should land in the
screen center. Those requests specifically authorized visibility transitions.

Implemented in that commit:

1. Removed full-width floated fieldset legends; constrained Preferences form,
   sound grid and wrapping colour controls to the scrollport. Actual visual
   acceptance of this CSS fix remains unconfirmed.
2. Added first-paint + React-ready gating (`note-ready` preload/IPC) before showing
   newly loaded windows. `presentNote()` avoids repeated show/entrance for already
   visible notes and focuses them in place.
3. Routed show/restore/batch show through `item.appear`; hidden notes reuse the
   entrance spring. Changed focus/show ordering and removed some explicit
   `keepOnTop(..., true)` calls from the old show paths, relying on existing native
   show/focus event handlers. This is an investigation target, not a proven cause.
4. Added `item.exiting`, `dismiss`, `stopExit` and a 280 ms downward/fading exit.
   Reopen can cancel the exit and resume entrance from current position/opacity.
5. Added `interruptHide()` at `WM_ENTERSIZEMOVE` before existing drag initialization.
   Native grabbing is supposed to cancel an exit, restore opacity/visibility state
   and let normal OS dragging proceed. This boundary was not natively verified.
6. Extended entrance cancellation, transient-position capture guards, hide/close
   handlers, display recovery and timer cleanup. Only destination positions are
   intended to persist; actual lifecycle/focus correctness remains unproven.
7. Centered manager-created notes in the manager display's work area. Tray/global
   shortcut creation still targets the pointer location.

Source comparison confirms unchanged `flow.ts`, `sheet.ts`, shared spring math,
geometry, `platform.ts`, original rustle engine and renderer dynamics effect
between b19d33a and 9035066. **That does not prove native overlay reliability.**
The show/hide/opacity/native-event lifecycle changed materially around them.

## Investigation findings and next diagnostic steps

Read these first:

- `src/main/index.ts`: `createWindow`, show/focus/blur/always-on-top handlers,
  `interruptHide`, `WM_ENTERSIZEMOVE` / `WM_EXITSIZEMOVE`, entrance finish,
  `dismiss`/`stopExit`, hide/close handlers, `recover`, `capture` and `showNote`.
- `src/main/visibility.ts`: `presentNote` and `exitSample`.
- `src/main/platform.ts`: `apply` and `keepOnTop`.
- `src/renderer/src/main.tsx`: renderer blur/drag handling and note-ready handshake.
- `docs/PHASE_1.md`: an earlier similar Alt+Tab/buried-note report and unverified
  topmost remediation. Do not assume this is either definitely new or definitely
  the old bug; compare revisions under the same reproduction.

Facts found in source:

- BrowserWindow still starts always-on-top. Existing show/restore/focus and
  always-on-top-changed handlers still request the floating band.
- Main-process blur handlers reassert topmost asynchronously and capture/flush;
  blur does **not directly call Hide**. Renderer blur stops audio/manual drag.
- Repair handlers skip some work when `record.hidden` is true. `keepOnTop` returns
  for a destroyed, invisible or minimized window. Native/logical visibility can
  therefore matter even if the original intent was only a z-order repair.
- Drag entry still changes the native shape, followed by topmost remediation;
  that code already existed, but the new exit interruption runs immediately before
  it. `platform.ts` itself is unchanged by the latest commit.
- New transition timers can change position/opacity or eventually call `hide()`.
  Whether one is active during the reported disappearance is unknown.
- No native event trace, window opacity/bounds record, screen recording, renderer
  crash record or HWND z-order evidence was collected in this handoff turn.

Before changing behavior, reproduce the user's **Alt+Tab → attempt to drag → note
disappears** sequence. Record whether it also needs a background-app click, whether
the note was newly created or reopened/hidden first, whether animations had fully
settled, and whether the disappearance happens at press, movement or release.
Use Notepad/browser and settled notes first, then transition-interruption cases.

If diagnostics are authorized next session, trace ordering (without note text):
note ID/time, native show/hide/focus/blur/close/destroy, topmost flag changes, native
drag entry/exit, will-move/move, logical hidden/entering/exiting flags, actual
visibility/minimized state, opacity, bounds/work area, region mode and active
transition/shape timers. Determine which failure is present:

1. still visible but buried behind another app;
2. visible flag true but opacity zero or stale/clipped shape;
3. moved off-screen by a transition/recovery path;
4. actually hidden/minimized/closed or renderer gone.

Compare **b19d33a versus 9035066** with isolated disposable data/builds. Do not reset
the feature branch, rewrite history or roll back user data. Both checkpoints use
schema 4; older Phase 2/core versions use earlier schemas and must never be aimed
at the real current data directory. Preserve notes/backups before any lifecycle
experiments. Do not add a focus-stealing timer, fullscreen overlay or blanket
physics rewrite as a substitute for identifying the event/state failure.

## Click & drop quality issue

User feedback: dislikes the sound, **especially the drop**, and wants a satisfying
grab/drop effect. Source files:

- `src/renderer/src/click-drop-sound.ts`: deterministic synthesized PCM buffers;
  grab ~75 ms, drop ~170 ms; drop uses a low decaying body, overtone and noise tick.
- `src/renderer/src/note-audio.ts`: style selection, native drag-edge routing,
  muting/cancellation, resource ownership.
- `src/renderer/src/manager.tsx`: Preferences style choices and Preview.
- `tests/click-drop-sound.test.ts`: mocks and sample/lifecycle bounds only.

Do not simply make it louder or declare success from those tests. After the core
native bug, audition revised cues/variants through Preview and real grabbing and
release; seek actual user listening feedback, particularly on the drop. Preserve
independent Rustle, mute, no cues on ordinary text clicks/creation/locate, no double
drop on cancellation, lazy/cached local resources and idle cleanup. No audio
redesign is implemented in this handoff turn.

## Verification status — do not overstate

- Last implementation run at 9035066: production build/typecheck PASS; 61 tests in
  15 files PASS. These were **not rerun in this documentation-only turn**.
- Those tests check model/persistence, math, mocks, readiness gating/concurrency,
  exit samples and centering. They do not exercise real Windows topmost/native
  drag event ordering, compositor visibility or the application's complete Electron
  event graph.
- Current native overlay/Alt+Tab/drag reliability: **FAIL — user report; agent has
  not reproduced or fixed it**. This supersedes earlier implied success.
- Click & drop acoustic acceptance: **FAIL — user feedback**, especially drop.
- Preferences layout fix, manager double-click flicker, new slide-up/down,
  interruption, mixed DPI, native focus/IME, actual sound latency and performance:
  still unverified by the agent.

## Remaining roadmap and priority

1. Investigate the critical native visibility regression first. Reproduce and
   identify a targeted repair before implementation; do not merge PR #3 as-is.
2. Improve/audition the rejected grab/drop cues, especially release.
3. Verify the reported Preferences and double-click fixes and specifically
   requested presentation changes with native evidence.
4. Resume consolidated input/accessibility/display/suspend/click-through/overlap,
   persistence-fault and multi-note CPU/memory/frame/audio acceptance. Targeted
   investigation of an active regression is necessary even though broad QA was
   previously deferred to avoid repeated full-matrix runs.
5. Later Phase 3E: bold/italic/underline/strikethrough/bullets/checklists, using safe
   structured text and lossless migration. Not started.
6. Later drawing/scribbles (high user interest). Not started.
7. Paper sizes square/wide/tall are **optional and the final feature**, lower
   priority than drawing. Not started; native geometry would need separate care.
8. Other deferred work: remaining lifecycle implementation gaps, local backup/
   export/import, packaging, app identity/icons, help, beta/security/CI and separate
   macOS feasibility. No accounts/cloud/sync implied or authorized.

Read `AGENTS.md`, this handoff, `docs/NEXT_SESSION.md`, `docs/PRODUCT_ROADMAP.md`,
`docs/MANUAL_TEST_MATRIX.md`, `docs/MANAGER_DESIGN.md` and the implementation plan.
Treat the newest user reports and this handoff as higher priority than historical
"implemented" labels or earlier source-only assurances.
