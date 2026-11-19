> **LATEST USER DIRECTION — APPROVED PAPER ANIMATION:** The user considers the current paper animation **ABSOLUTELY AMAZING**. Do not modify, retune, replace, or refactor its animation behavior unless the user explicitly requests specific modifications. Preserve the dynamics, bending, pinch response, swing, curl transitions, settling, and visual motion tuning. Earlier requests to improve paper flow are superseded. Pending verification does not authorize animation changes. If another feature requires changing the animation, report the issue and obtain the user's specific direction first. This applies throughout all remaining phases.

# Deployment handoff, November 19, 2026

PRs #1, #2 and #3 were integrated into `dev` at `f516b2d`. The three merged branches were pruned. Freehand drawing is on `feat/scribble`, branched from that consolidated commit. The unsigned ZIP recorded in the earlier handoff predates drawing. Build the Store candidate from a revision that includes the scribble change.

Start with [the Windows Store launch plan](WINDOWS_STORE_LAUNCH_PLAN.md). Priorities are publisher enrollment and identity, portable backup/restore including schema 5 ink, and a disposable migration rehearsal before changing app identity. The user owns SFX selection and has closed the Alt+Tab disappearance after manual retesting.

## Drawing verification

- Each note has New, Hide, paper color and a pencil toggle. Draw with graphite, ocean or berry in 2, 4 or 6 logical pixels. Tap a line with the eraser to remove its stroke. Undo, redo and clear are local to the drawing. Escape returns to the pencil button and text editing is available again.
- Local schema 5 reads schemas 1 through 4. Each note holds at most 128 strokes, 1,024 points per stroke and 16,384 points total. Ink shares the text layer's paper transform. Only a completed edit crosses IPC. Undo history holds up to 32 edits in the current note renderer.
- The production build and typecheck passed, as did 66 automated tests. Packaged Windows QA used disposable data with 250 notes and 40 sets. It exercised mouse strokes, simulated pen taps, width/color, erasing, clear, toolbar and keyboard undo/redo, focus on Escape, text over ink, manager previews, hide/show, Trash restoration and restart. A partially drawn stroke stayed out of the main-process record. The resting ink SVG had zero mutations during a 1.5-second observation.
- A native mouse drag moved the window and updated the paper bend with a blank note and with 128 strokes totaling 16,384 points. One three-second run per case on the test PC measured renderer frame intervals of 6.1 ms median and 6.2 ms p95 in both. These are animation callback intervals. Physical stylus and installed Store package testing remain outstanding.

## Historical handoff

# Fresh-session handoff — Phase 2 to Phase 3

> **Current status (2026-11-19).** The user manually retested Alt+Tab and
> dragging and accepted the behavior. Close the disappearance report and reopen
> only on a fresh occurrence. Earlier investigation entries below are historical.
> The next release milestone is a Windows Store candidate. Start with portable
> backup/restore and a disposable prototype-to-package migration test. The
> current unsigned ZIP is the local QA baseline. SFX finalization is user-owned.
> See [the original investigation](SESSION_HANDOFF_2026-11-15.md) for its evidence.

Prepared 2026-11-14 after reviewing Claude's working tree.

## Start here

Repository: `F:\Projects\Stickee`. Branch: `feat/note-manager` (Phase 3B; Phase 2 remains on `improve/paper-motion`). Phase 2 and Phase 3B are implemented; the latest section below supersedes historical snapshots; do not assume main contains it. Inspect `git status` and latest log before editing. Preserve any existing changes.

Read the entire `STICKEE_IMPLEMENTATION_PLAN.md`, `docs/PROGRESS.md`, `docs/FEASIBILITY.md`, `docs/PHASE_1.md`, and `docs/CLAUDE_HANDOFF.md`. The latter is a comprehensive roadmap but its opening snapshot predates Claude's Phase 2 implementation. Use the latest progress entries, actual code and this handoff for current status.

## Current implementation

- Windows-first Electron/React/TypeScript, separate transparent native note windows, native dragging and shaped interaction regions.
- New pinned-sheet flow in `src/shared/flow.ts` and `sheet.ts`: acceleration-driven bending, asymmetric pinch, vertical billow, curl/text affine fits and sleeping animation loop. Old `paper.ts` and speed-tilt tests are removed.
- New-note entrance from the pointer display's lower work-area edge, interruptible by grabbing, with destination-only persistence and reduced-motion bypass.
- Five semantic paper colors, matching ink/curl colors, in-note picker and context menu.
- Persistent global sound preference via tray/context menu; no sound button on the note face.
- Schema v2 with schema-v1 migration and backup preservation.
- Diagnostics hidden unless explicitly enabled; normal notes show New/Hide/color only.
- Local saves, tray/global shortcut, independent note lifecycle and topmost remediation remain.

## Verification and unresolved acceptance

I independently ran `npm run build` (including TypeScript) and `npm test` on 2026-11-14: PASS, 32 tests across eight files. These do not prove native GUI quality.

Claude reports disposable-data Electron startup/migration smoke checks and scripted Chrome renderer checks; see `docs/PROGRESS.md` for its evidence. This reviewing session did not repeat those smoke checks and did not perform GUI/audio/performance tests.

Phase 2 is IMPLEMENTED, NATIVE ACCEPTANCE PENDING. Check actual Windows drag feel, pinch anchoring, extreme-bend clipping, transparent fringe, overlap, topmost Alt+Tab reproduction, editor/IME after drag, entrance smoothness and interruption, taskbar/mixed-DPI placement, picker/context/tray actions and audible sound preference.

Known tradeoffs: larger native interaction envelope during movement and for 1.4 seconds after release; affine text approximation at extreme bends; entrance can overlap the bottom taskbar briefly; entrance uses an 8 ms main-process timer; no paper grain by deliberate design choice. Do not certify these as acceptable without actual evidence.

Review targets before building further:

- Entrance interruption/hide/close/quit/display-change paths: preserve destination or deliberately caught position and clean up timers safely.
- Main-process movement/save events during entrance: ensure skipped intermediate capture does not still cause unnecessary repeated disk writes.
- Renderer entrance motion shares the audio/motion channel: verify intended sound and control visibility during creation.
- Picker keyboard behavior, focus restoration and radio-group arrow navigation need accessibility review.
- Verify reduced motion when preferences change mid-animation as well as at startup.

These are review targets, not confirmed failures.

## Next implementation scope

1. Inspect and validate the current baseline; fix reproduced regressions before extending features. Consolidate a manual Windows matrix with honest NOT RUN entries where hardware/human verification is unavailable.
2. Begin Phase 3: reversible deletion/trash/undo backed by main-owned state and schema migration; display lifecycle/work-area recovery; keyboard/IME/accessibility; resource profiling with multiple notes. Prioritize correctness and no lost content.
3. Once core reliability is established, implement Phase 3B: a creative main app for visible/hidden notes, local search, show/focus/hide/recovery, shared trash and general settings. Reuse the same main-process state. Closing the manager leaves notes/tray usable.
4. Packaging/beta follows, then separate macOS feasibility. Profiles remain future exploration; no accounts/cloud/sync implied.

The comprehensive handoff describes a paper-collection/desk-drawer manager concept. Treat it as a design direction to prototype, not a generic dashboard template. The user's standard is Apple-quality craft: clean typography and spacing, restrained materials and controls, immediate feedback, and continuous interruptible motion. Keep real Windows window conventions and secure Electron defaults. Square paper, one subtle curl, explicit editor activation, usable top corners and controllable sound are accepted preferences.

## Git workflow — updated user preference

The user explicitly wants fewer commits. Group related work into meaningful, tested milestones; do not commit each tiny edit or routine adjustment. A focused session will commonly need one coherent commit. Use extra commits only when separation materially helps review or recovery. Do not rewrite previously published history merely to reduce contribution counts.

Use author AND committer `Clorkies <clarkisnoob434@gmail.com>`, concise messages, no AI/co-author/sign-off trailers, and no signing unless requested. Verify metadata/message. This checkpoint is authorized for commit/push to the existing feature branch; it does not authorize future merging, releases or arbitrary pushes in a new task.

## Prompt for the new session

Continue Stickee from `improve/paper-motion`. Read `docs/NEXT_SESSION.md` and all referenced specifications, inspect the actual repo, and preserve existing work. Phase 2 code is implemented and its build/typecheck plus 32 tests pass, but native Windows acceptance remains pending. The paper animation is approved as ABSOLUTELY AMAZING: do not change it unless the user explicitly requests specific modifications. First review the current milestone and resolve reproduced core regressions without altering the approved animation, then implement Phase 3 reliability in coherent increments: reversible delete/undo, display lifecycle, accessibility and profiling. Keep Apple-quality craft, native responsiveness, click-through, explicit editing and local-first persistence. The creative main manager is Phase 3B after core reliability. Update progress and distinguish actual GUI/audio/performance evidence from unit tests. Use infrequent milestone commits, not a commit per small edit. Do not merge, push or publish without authorization for the new work.


## Latest continuation - Phase 3 trash milestone (2026-11-14)

This section supersedes the earlier next-step snapshot. Phase 2 remains unchanged
and native acceptance pending. Phase 3 now includes schema 3 persistent trash,
tray Undo/individual restore, save rollback, destroyed deleted windows, failed
load cleanup, and colour-picker keyboard navigation/focus restoration. Schema
1/2 migration preserves content/settings and prior-file backups. Trash never
expires; no permanent deletion UI yet. Build/typecheck and 38 tests pass.

Read docs/MANUAL_TEST_MATRIX.md as well as the original referenced specs. It
consolidates acceptance and a 1/5/10-note profiling protocol. This session ran no
GUI/audio/performance checks. Display lifecycle, full accessibility/IME and actual
profiling remain next. Phase 3B manager remains unimplemented. Preserve the
approved animation exactly; newer native verification is not permission to
change it. No new push/merge/publication authorization exists.


## Latest continuation - Phase 3B implemented (2026-11-15)

Current branch: `feat/note-manager`, created from `feat/core-reliability`. The user
explicitly deferred comprehensive QA until after Phase 3B; the previous native
acceptance gate is superseded for development sequencing. The manager is now
implemented. Read docs/MANAGER_DESIGN.md and the latest docs/PROGRESS.md entry.

Startup/tray Open/tray double-click/second launch open one native manager. It has
search, visibility filters, actual paper previews, complete read-only text,
show/focus/hide/recovery, shared trash/restore/undo and confirmed permanent delete.
Preferences persist sound/default paper/create shortcut, with conflict handling
and save rollback. Closing the manager leaves desktop notes/tray running.

Build/typecheck and 42 tests pass. Actual GUI/audio/display/accessibility/resource
checks remain NOT RUN. Next: perform the consolidated matrix when requested,
resolve demonstrated reliability/design issues while keeping the approved paper
animation frozen. Display/suspend lifecycle hardening is not certified complete.
Do not push, merge or publish without authorization.

## Latest product planning update — 2026-11-15

The user likes the manager foundation and requests substantial UI improvements.
Read PRODUCT_ROADMAP.md before coding. Recommended next milestone is Phase 3C:
clean native scrollbar styling, distinct Trash composition, multiple selection,
and separate Find on desktop / Move here actions with a brief independent visual
highlight. Then Phase 3D introduces additive named sets; Phase 3E adds six basic
text/list formats. Drawing is a desired later feature; optional paper sizes come
last with lower urgency. Approved paper dynamics remain frozen.

This planning turn changes documentation only. Do not infer that these features
are already implemented. The consolidated acceptance plan remains in effect;
focused implementation checks continue without repeating the full native matrix.

## Latest continuation — Phase 3C implemented (2026-11-15)

Current branch remains `feat/note-manager`. Manager craft is implemented: slimmer
native scrollbars, distinct dated Trash list, multi-select/batch actions/group
undo, and separate Find on desktop / Move here with a static 1.8-second outline.
Batch state commits before native effects; failures roll back complete selections.
Locate uses existing native bounds/input regions and preserves approved dynamics.
Find/recovery do not explicitly focus the editor. GUI/focus/visual acceptance is
NOT RUN; production build/typecheck plus 46 automated tests PASS.

Next implementation milestone: Phase 3D additive named sets with the paper-folio
direction in PRODUCT_ROADMAP.md. Then structured formatting, later drawing, and
OPTIONAL paper sizes as the final feature. Existing local planning updates were
preserved. No new authorization to push, merge, publish or modify paper animation.

## Latest continuation — sets and preferences (2026-11-15)

Phase 3D is implemented on `feat/note-manager`. Direct manager labels replace
decorative descriptions; named paper folios provide additive saved sets. Create,
rename, delete, add/remove membership and create-in-set are available. Show set
reuses existing notes/windows and leaves other visible notes alone. Trash preserves
membership; permanent deletion cleans references. Schema 4 migrates schemas 1–3
and preserves prior raw backups. Older versions reject schema 4 safely.

Preferences now record shortcut keypresses rather than accept typed accelerators.
The existing shortcut is temporarily released while recording and restored on
completion/cancel/inactivity. Sound style can be Rustle or Click & drop, with an
explicit Preview. The new sound is synthesized locally; actual listening and
native timing are NOT RUN. Approved paper animation and original rustle engine
are unchanged. Production build/typecheck and 56 automated tests pass.

User requested stopping after these features and committing/pushing this session.
`dev` was created from `main` at `161893e`; feature PRs target dev, never main.
Do not infer future push/merge authorization from this session. Formatting,
drawing and optional paper sizes are not started. Next work requires new scope;
the combined native acceptance matrix remains pending.

## Latest continuation — settings and note presentation fixes (2026-11-15)

User supplied a Preferences screenshot with clipped labels, horizontal overflow
and a vertical paper-colour column. Removed floated fieldset legends, constrained
the form to its scrollport and restored wrapping colour controls.

The user explicitly authorized presentation changes: opening hidden notes from
the manager reuses the creation entrance, Hide slides down, and manager New note
targets the center of the manager display. Tray/shortcut creation stays near the
pointer. Existing visible notes are focused without re-showing/replaying. A first
paint plus React-ready handshake protects against showing empty content. Quick
reopen during Hide resumes from the current position/opacity. Hide persists state
before animation and retains destination coordinates. Reduced motion bypasses
travel; quit, destruction and display changes stop transition timers safely.

This is specific user authorization for visibility/placement changes, not a lift
of the freeze on approved drag physics. Bending, pinch, swing, curl and settling
remain unchanged. Build/typecheck and 61 automated tests pass; actual native
flicker, compositor smoothness and visual Preferences acceptance are NOT RUN by
the agent. Review in the morning. Commit/push to feat/note-manager is authorized;
existing PR #3 targets dev, alongside PR #1 (paper) and #2 (core). Do not merge.

## Windows investigation and manager changes, 2026-11-19

Compared disposable Windows builds of b19d33a, 9035066 and 58183c9 and the
working build. Tested settled notes and notes reopened after Hide. Also tried
reopening during the downward transition on 9035066 and 58183c9. The reported
disappearance did not reproduce. In the repeatable settled drag, the OS moved
the note and hit-testing returned its HWND through release. Samples of the
desktop pixels showed yellow paper. Electron reported visible, topmost, opacity
1, on-screen bounds and a live renderer. One earlier reopened-note trial did
not move on 9035066 but remained visible. The user's failure remains open.
Keep PR #3 on hold pending a matching reproduction. Paper dynamics are untouched.

Manager changes include the divided glass sidebar, pinned Preferences, square
inspector, section-local Select, a responsive single row of folders, an All sets
directory and additive note drops on folders. **Reversible experiment:** use
top/bottom scroll fades on manager scrollports. High contrast keeps native bars.
At two native window widths the row showed three and two folders. With 25 sets
the directory showed all 25 and scrolling the sidebar left Preferences fixed.

Removed the bell partials from the tactile sounds. After auditioning the first
replacement, the user requested a softer, shorter release. The revised drop
has a 15 ms decay and a 105 ms buffer. Hide/show have quieter cues and respect
mute. Final listening acceptance is pending. Build/typecheck and 62 tests passed.
The user subsequently rejected the percussive cue family. The current audition uses short pitched grab/release tones and airy hide/show transitions, with separate Preferences previews. Listening acceptance is pending.

## Background performance

See the 2026-11-19 measurements in MANUAL_TEST_MATRIX.md. Production Windows
runs covered 1, 5, 10 and 20 visible notes, cold hidden notes, active dragging,
settling, Hide and Trash. The main process skips the diagnostic polling timer
during normal use and captures only the moving window during drag. Saved hidden
notes allocate a renderer on demand. Cold Show, Locate, Show set, Trash/Restore,
text retention, restored position persistence and tray Show All were exercised
with disposable data. Build/typecheck and 62 tests passed.

Priorities are still the intermittent Alt+Tab disappearance, same-session hidden
memory, rare long frame intervals, then the remaining native acceptance matrix.
SFX is paused for user feedback. Basic formatting and drawing are later work.

## Hidden note memory and visibility tracing

A note hidden for 30 seconds now releases its window if its editor was untouched.
Focusing, selecting, scrolling or editing the text keeps that renderer resident
for the session, preserving Chromium's selection, scroll position and undo stack.
A quick reopen cancels the pending release. Actual memory savings depend on how
many editors have been used. The previous 10-second post-hide measurements
precede this grace period.

In a disposable ten-note Windows check, eight unused editors were released,
one hidden editor retained selection and undo, and a quickly reopened note kept
its original window. A discarded window reopened with its saved text.
For intermittent disappearance reports, the manual matrix now describes the
opt-in local visibility trace. The user is handling SFX.

In the final Windows run, all 20 Alt+Tab cycles had a foreground process outside
the disposable Electron instance immediately before the grab. Every cycle moved
the note, returned its HWND from hit-testing, and showed paper-colored pixels
after release. All 20 had drag-entry, first-move and exit trace events. The
intended test background was not confirmed as foreground; this does not identify
the user's original foreground application. The reported disappearance remains
open. Aggregate Electron private bytes fell from 579 MiB with ten freshly hidden
notes to 310 MiB with one visible and one retained hidden editor after the grace
period (two snapshots, manager open). Production build, typecheck and 62 tests pass.

## Local Windows x64 package

The packaged optimization pass and matched long-text drag measurements are in
MANUAL_TEST_MATRIX.md. Local outputs are dist/win-unpacked/Stickee Prototype.exe
and dist/Stickee-Windows-x64.zip. The ZIP contains the verified, unsigned Windows
build. Both 165 Hz and 60 Hz displays passed the repeated-drag check. A rare
first-grab presentation delay remains measurable. The user's intermittent Alt+Tab
report remains open. No release, push or merge was performed.

The dated publisher checklist, implementation calendar and submission gates are in [Windows Store launch plan](WINDOWS_STORE_LAUNCH_PLAN.md).
