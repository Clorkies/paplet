# Product roadmap — 2026-11-15

This is the latest product scope and sequencing. It extends the original plan;
older exclusions of basic text formatting and note collections are superseded by
the user's requests below. These are planned features, not implemented claims.
The user likes the Phase 3B foundation and requests substantial further manager
craft. Comprehensive native acceptance remains a consolidated later pass;
focused build/type checks and necessary data/security tests continue during work.

The approved desktop paper dynamics are frozen. New locate feedback must be a
separate visual treatment, preserving bending, pinch response, swing, curl,
entrance and settling. Neither verification nor this roadmap authorizes changes
to those behaviors.

## Implementation status

Phases 3C and 3D are implemented: manager craft, multi-selection, Find/Move here,
and additive named sets with folio navigation and schema 4 migration. Manager
copy uses direct labels; Preferences record shortcuts and offer Rustle / Click &
drop sound styles. Native acceptance remains pending. Formatting and drawing are
not implemented. Paper sizes are explicitly optional and the last feature.
The user requested stopping after sets, committing and pushing to feature
branches whose PRs target dev. Do not start formatting in this session.

## Next milestone: Phase 3C — collection craft and actions

Improve the existing manager before introducing another major feature surface.
Keep independent notes, explicit editor activation, local storage and secure
Electron boundaries.

### Scrolling

- Replace conspicuous default manager scrollbars with narrow, low-contrast,
  rounded scroll thumbs integrated into the collection and reading margin.
- Reveal stronger contrast on hover, focus or scrolling. Use subtle edge fades
  as overflow cues, never as a replacement for a usable scroll affordance.
- Preserve native wheel, touchpad, keyboard and thumb dragging. Prefer styling
  native scrollbars to building a custom scrolling engine. No scroll hijacking.
- Respect high contrast and reduced motion; retain sufficient hit area. Do not
  change the already approved desktop note scrolling or paper motion incidentally.

### A distinct Trash

- Give Trash its own composition: a compact recovery list with paper-colour
  markers, text excerpts and deletion dates, rather than reusing the main shelf.
- Show retention guidance and clear Restore actions. Separate permanent deletion
  from recovery, with destructive controls restrained and unmistakable.
- Provide a different empty state and hierarchy while sharing typography and
  materials with the rest of the app. Avoid a dramatic red page or decorative bin.

### Multiple selection

- Add an explicit Select mode with visible checkboxes and a selected count;
  support Ctrl-click, Shift ranges and keyboard selection / Ctrl+A in collection
  context. Ctrl+A in the editor or search must keep its ordinary meaning.
- Reveal one contextual action strip for Show, Hide, Add to set and Move to Trash.
  Trash selection offers Restore and confirmed permanent deletion instead.
- Batch state changes persist together; save failure must not apply half a batch.
  Offer undo for bulk trash, preserving the group of affected IDs across updates.
- Keep ordinary single-note selection and the reading pane simple outside Select
  mode. Selection state is transient, not part of saved note contents.

### Locate and move are separate actions

- **Find on desktop:** keep the note on its existing display, show it if hidden,
  raise it and briefly highlight it (roughly 1.5–2 seconds). A restrained outline
  or halo identifies the exact paper. Do not bounce, resize or retune the paper.
- **Move here:** replace the ambiguous, long "Bring to this display" label. Move
  the note into the work area of the display containing the manager, then show
  the same brief highlight. Explain the destination in supporting text/tooltip.
- If the old display is disconnected, recover to the manager's display and say
  that it was moved. Repeated requests restart the cue without duplicating notes.
- Do not implicitly activate text editing. Prefer showing without taking keyboard
  focus away from the manager. Reduced motion uses a static temporary outline.
- Implement feedback within the note's existing native drawing/input budget; no
  fullscreen overlay or expanded invisible input surface. If the design needs a
  geometry or approved-animation change, stop and obtain specific user direction.

## Phase 3D — saved note sets

Sets are named groups of existing notes that can be brought onto the desktop
together. They are local collections, not accounts, profiles or isolated desktops.

### Semantics

- Create/rename/delete a set; add/remove existing notes and create a note in a set.
  A note may belong to multiple sets. Store membership by stable note ID.
- **Show set** is additive: show its non-trashed notes alongside everything already
  visible. Do not hide existing notes, clone notes or create duplicate windows.
- Loading the same set twice is idempotent. Editing a member edits that original
  note everywhere, not a snapshot. Default placement stays as saved, with normal
  recovery for unavailable displays. Do not create overlap by moving every member
  to one coordinate.
- Deleting a set removes only its membership container, never the notes. Trash
  excludes a member from Show set while preserving membership for restoration;
  permanent note deletion removes dangling references.
- Show the currently visible/member count and allow incremental membership edits.
  Defer workspace replacement, automatic unload and cloned templates; they have
  different data/visibility semantics and are not implied by additive loading.
- Persist sets through a versioned schema migration and backup-safe saves. The
  manager and desktop notes keep one shared main-owned database.

### Creative interface direction

Use a small row of named paper folios above the collection. Each has a restrained
tab, a slim hint of its member colours and a legible name; selection reveals the
members in the existing shelf. The ordinary All / On screen / Hidden controls
still apply within the chosen collection. Keep text readable rather than burying
notes in ornamental piles. "Show set" is the primary action on a selected folio;
"Add to set" in the multi-select strip opens a small named-set chooser.

Prototype empty, one-set, many-set and long-name states with real data before
expanding the metaphor. This is a proposed direction, not a user-approved mockup.
Sets and the manager action strip should feel like one design, not a new dashboard.

## Phase 3E — basic note formatting

Requested scope: bold, italic, underline, strikethrough, bullets and checklists.
This authorizes a small structured editor, not Markdown, arbitrary HTML, rich
media, links, tables or a general document suite.

- Use a compact formatting affordance available after explicit editor activation;
  keep the resting paper clean and the top/corner grab areas usable.
- Support conventional keyboard commands where applicable, selection-preserving
  toolbar actions, checked states and natural Enter/Backspace list behavior.
- Store a validated, versioned document structure with a plain-text projection for
  search, previews and export. Migrate existing plain text losslessly, including
  Unicode, blank lines and empty notes. Preserve trash/restore and set membership.
- Use a maintained editor foundation if it materially reduces selection, IME,
  checklist and undo complexity. Evaluate a minimal dependency before choosing;
  do not implement formatting as unsafe persisted HTML or deprecated execCommand.
- The manager remains a read-only preview of the same note. No divergent manager
  editor. Clipboard input must be sanitized to supported structures.
- Preserve text selection, caret, composition and undo/redo; formatting commands
  must not accidentally initiate native drag or edit after a drag.
- Keep the existing paper/content transform and animation intact. If editor
  integration requires altering that behavior, obtain specific direction first.

## Later feature phase — drawing / scribbles (high user interest)

Drawing is a desired feature, deliberately scheduled late rather than discarded.
It has higher priority than alternate paper sizes. Begin with a bounded pen tool,
a few ink colours/widths, eraser, stroke undo/redo and clear drawing; no shape
recognition, image import or painting suite is implied.

Feasibility assessment: a basic pointer-driven ink layer is straightforward;
reliable integration is medium complexity. The harder work is coordinating text
selection, native grabbing, pointer capture, persistence and the already deforming
paper. A quick canvas demo would not establish finished feature readiness.

- Enter an explicit Draw mode so pen input does not compete with editing/grabbing.
  Keep the grab strip and a discoverable way back to Text mode.
- Store vector strokes in paper-relative coordinates with bounded point counts;
  render locally, clip to paper and keep layers aligned with text. Preserve ink
  across restart, trash/restore, set loading and backup/export.
- Avoid saving large bitmap images per pointer event. Save completed strokes with
  recoverable updates, and bound memory/data growth for long sessions.
- Support mouse first; pen pressure is optional progressive enhancement. Provide
  keyboard-accessible mode controls and erase/clear actions with undo.
- Evaluate how ink follows the current curved sheet before implementation. Never
  replace or retune approved physics to make the ink implementation easier.

## Final optional feature phase — paper shapes / sizes

Square remains the default. Add Wide and Tall only after drawing and the core
experience are dependable; this has lower user urgency.

This is more than changing CSS dimensions: native bounds, hit regions, movement
envelopes, content layout, display clamping, saved placement, ink coordinates and
curl geometry all depend on the paper size. Plan schema migration and preserve
existing square notes exactly. Prototype the new shapes independently. Any
required changes to approved square-paper animation need explicit user direction
before implementation. Do not reinterpret the size request as permission to
refactor the approved physics now.

## Other remaining work beyond acceptance testing

- Finish actual display/suspend recovery handling where incomplete; executing
  tests and implementing lifecycle behavior are separate tasks.
- Add explicit local backup/export/import before broader beta use, with validated
  formats and safe restore/import semantics. This is resilience work, not sync.
- Prepare Windows installer/portable distribution, intentional app identity/icons,
  versioning/license decisions and user-data migration before changing identifiers.
- Add user-facing help, shortcut/recovery documentation and beta limitations.
- Review dependencies/security and set up appropriate CI checks without automatic
  publication. Release/signing/merge/push still require authorization.
- macOS remains a separate, later native feasibility effort. Accounts, cloud sync,
  reminders and other unrelated feature expansions remain outside this roadmap.

## Recommended implementation order

1. Phase 3C: manager craft, distinct Trash, Find/Move here and multiple selection.
2. Phase 3D: additive sets, using the selection model and shared actions.
3. Phase 3E: structured basic formatting with safe plain-text migration.
4. One consolidated daily-use acceptance pass, followed by reproduced fixes and
   release resilience/packaging work; do not repeat the full matrix each milestone.
5. Later drawing phase, with its own feature acceptance once implemented.
6. Optional square/wide/tall sizes last, preserving existing square behavior.

Phases 3C and 3D are now implemented. The user requested stopping after sets.
Formatting and drawing require a subsequent implementation session; paper sizes
are optional and last. Do not change the editor and paper geometry simultaneously.
