# Stickee collection — Phase 3B

Direction: a quiet paper collection with a reading margin. Warm neutral shelves,
actual paper colours and text identify notes; a restrained green anchors actions.
The collection is useful at a glance and the selected note gets room to read.
There are no metric tiles, decorative stacks, remote fonts or fake macOS chrome.
The window uses ordinary native Windows sizing, title bar and close behavior.

## Design vocabulary

- Typography: local Segoe UI Variable / Segoe UI / system fonts. Collection heading
  25px with tight tracking, paper text 13px previews / 16px reading pane, supporting
  labels 11–13px. User zoom remains available in the manager.
- Spacing: 4/8px foundation, 20–30px outer margins, 20–24px between papers.
- Materials: warm off-white canvas, slightly deeper reading margin, unrotated
  paper previews, one quiet fold. Actual semantic palette shared with notes.
- Controls: 7px corners, sparse borders, clear primary action, explicit focus ring,
  pressed/hover feedback. Outline SVG icons share one stroke weight.
- Motion: short colour/feedback transitions only; no looping or entrance
  choreography. Manager reduced motion removes transitions. Desktop motion code
  and tuning remain unchanged.
- Modes: system light/dark palette plus forced-colour rules. Paper keeps its ink
  colours in dark mode; high contrast uses system colours and visible borders.

UI/UX search returned a generic landing-page recommendation initially. A narrower
product query identified Productivity Tool / flat interactions / clear hierarchy;
only that applicable guidance and the Apple design principles were used. The
collection layout, local typography and materials follow the existing product
brief. No generated landing-page design system was adopted.

## Interaction and state

All / On screen / Hidden / Trash filter the same main-owned note records. Local
search matches complete saved text; previews truncate it, the reading pane scrolls
the complete content. Clicking selects, double-clicking opens the independent
desktop note. Explicit Show/Open is always available. Editing stays on desktop
notes to avoid a second editable copy. Arrow keys and Home/End move through
previews; Ctrl+F reaches search. Actions provide errors without losing content.

Show, hide, bring to this display, trash and restore share the native note
lifecycle. Deletion has an inline Undo and durable Trash. Permanent deletion is
available only in Trash and requires a native confirmation with Cancel as default.
Retention is indefinite otherwise. Local backup files can still hold prior data;
permanent deletion is not a secure-erasure feature.

Preferences persist sound, default paper colour and a create shortcut. A new
shortcut must register successfully before the old one is removed; failed saves
retain previous preferences. System reduced motion remains the existing policy;
no custom paper-motion override was introduced. Storage location and backup
guidance are visible in Preferences.

The manager has a dedicated preload, sender/main-frame validation and serialized
mutations. It receives coalesced change snapshots, not animation-frame polling.
Closing it does not quit Stickee. Open from tray, tray double-click or a second
launch; repeated opening focuses the same window. A normal start opens it too.

## Acceptance status

Implemented, not visually or natively accepted. Per user direction, comprehensive
GUI/audio/display/accessibility/performance QA is deferred to the combined pass
after Phase 3B. Build/typechecking and focused automated checks do not certify
appearance, screen-reader quality or native window behavior.

## Next design revision — user direction, 2026-11-15

The user likes the foundation but requests substantial refinement: default
scrollbars are unwelcome, Trash needs a distinct composition, multi-selection is
needed, and desktop note location should be more obvious. The new direction is
specified in [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md): integrated thin scroll
affordances, a recovery-list Trash view, contextual batch actions, clear Find on
desktop / Move here commands and named paper folios for additive sets. These are
planned changes. Preserve approved desktop paper motion; locate feedback is a
separate short highlight, not a physics retune.

## Phase 3C implementation

The recovery drawer now uses dated, compact list rows with paper-colour tokens
and a restrained document-reading margin. Permanent deletion stays separate from
the primary Restore action. Collection and reading panes use thin native scroll
rails with stronger hover/focus contrast, while forced colours retain native
affordances. There is no custom scrolling engine.

Select mode, Ctrl-click and Shift ranges reveal checkmarks and a contextual action
pane. Bulk show/hide/trash/restore/delete persist as one transaction before native
effects. Inline group Undo survives state refreshes in the current manager
session; reopening the manager still offers durable Trash and tray Undo.

Find on desktop preserves the note's display/position where reachable. Move here
targets the manager's display. Both show a static 1.8-second outline without
activating text editing, changing native input shapes or tuning paper dynamics.
Disconnected placements are recovered with a clear status message. Native focus,
outline visibility and real scroll ergonomics remain unverified in this milestone.
