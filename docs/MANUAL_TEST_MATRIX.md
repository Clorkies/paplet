# Windows acceptance matrix

Updated 2026-11-15. Per user direction, execute one consolidated acceptance pass
after Phase 3B; pending QA does not block manager implementation. Only automated
checks have run for the manager milestone. No GUI, listening,
screen-reader, compositor, hardware lifecycle or resource measurements were run.
The approved paper animation is frozen; verification is not permission to tune it.
Use disposable user data and record Windows version, display topology, scaling,
refresh rate, revision and evidence when executing these checks.

| Area | Procedure / expected result | Current evidence |
| --- | --- | --- |
| Topmost | Repeat launch → Alt+Tab → click Notepad/browser → click/drag note 20 times. Note stays above ordinary apps; background retains focus until selected. | FAIL by user report at 9035066: note disappears when dragging after Alt+Tab. Agent reproduction/root cause NOT ESTABLISHED. |
| Input region | Click four transparent corners 20 times over another app and overlapping notes; repeat during swing and 1.4 s after release. Record forgiving fringe and clipping. | NOT RUN |
| Approved motion | Observe slow/fast/vertical/diagonal sweeps, corner pinch, reversal, release and regrab. Record regressions without changing animation. | User approved existing motion; current native matrix NOT RUN |
| Entrance | Create near taskbar and each monitor edge; grab/hide/close/quit during entrance, restart. Keep caught position or destination, never stale intermediate positions. | NOT RUN |
| Trash | Type distinct Unicode/multiline notes. Context menu → Move to Trash. Note vanishes; Show All and second launch do not resurrect it. Tray Undo restores latest deletion, then the preceding deletion. | Model/filesystem tests PASS; GUI NOT RUN |
| Restart / trash | Delete, quit/restart, choose individual note in tray Trash. Check text, colour, curl, angle and reachable placement. With only trash, tray remains usable and no trashed window opens. | Filesystem tests PASS; Electron flow NOT RUN |
| Failed save | With disposable denied-write storage, delete/restore. Error appears; failed delete leaves note intact; failed restore remains recoverable. Restore access and retry. | Transaction rollback tests PASS; denied-write GUI NOT RUN |
| Keyboard picker | Tab to colour control, open, use all four arrows with wrap; selection follows focus. Escape or choose returns focus to colour control; Tab exits without trapping focus. | Implementation/typecheck only; GUI NOT RUN |
| Editor / IME | Create, Tab/click editor, compose Japanese text, paste Unicode/emoji/multiline, select/undo/redo; drag and verify typing waits for explicit activation again. | NOT RUN |
| Accessibility | Narrator: editor/control names, selected radio, focus order and keyboard context menu. Check high contrast and large system text. | NOT RUN |
| Reduced motion | Check at startup and toggle system preference during entrance, drag and settling. Report failures; do not modify approved animation without specific user direction. | NOT RUN |
| Audio | Toggle sound from tray/context; listen during slow/fast drag, held pause, reversal, hide/delete and quit. Muting stops output; no clicks/seams. | Mock lifecycle tests only; listening NOT RUN |
| Displays | 100/125/150/200%, mixed DPI, negative coordinates, taskbar/resolution changes, disconnect/reconnect, lock/unlock and sleep/wake. Verify reachable placement, text and input alignment. | NOT RUN |
| Packaged app | Repeat tray/shortcut/restart checks using unpacked executable independently of dev mode. | NOT RUN |
| Manager lifecycle | Normal start, tray Open, tray double-click and second launch open/focus one ordinary manager. Close it: notes/tray/shortcut still work. Reopen without duplicates. | Mocked lifecycle checks PASS; GUI NOT RUN |
| Collection / state | Create/edit/hide/show/trash from desktop and manager; search complete text including hidden notes, filter states, select previews and read long content. Verify immediate shared updates and no divergent edits. | Implementation/build only; GUI NOT RUN |
| Manager recovery | Bring a hidden/off-screen note to the pointer display, including negative coordinates. Recovery during entrance reports a retry rather than interrupting approved motion. | NOT RUN |
| Preferences | Save sound/default colour/shortcut, restart. Reserve the requested shortcut elsewhere: old shortcut stays usable and error appears. Simulate failed disk writes: old settings remain. | Validation/persistence tests PASS; OS registration/GUI NOT RUN |
| Permanent deletion | Trash a disposable note, cancel permanent deletion, then confirm. Restart: removed from collection; unrelated notes remain. Disk failure must roll back removal. | Implementation/build only; native confirmation NOT RUN |
| Manager accessibility / design | Keyboard-only search/filter/select/show/hide/trash/restore/preferences, system zoom, Narrator, light/dark/high contrast, empty/dense/long-content states. | NOT RUN |
| Multi-select / batches | Select mode, Ctrl-click, Shift ranges, arrows and scoped Ctrl+A; bulk show/hide/trash, Undo group, restore and cancel/confirm permanent deletion. Retry with failed disk writes: whole batch rolls back before native effects. Verify selection after external note changes. | Transaction tests PASS; GUI/keyboard/fault injection NOT RUN |
| Find / Move here | Locate visible/hidden/recreated notes without editor activation; repeated requests renew the static outline. Find preserves reachable position; Move here targets manager's display. Disconnect old display and retry. No changed paper physics or click-through region. | Source/build review only; native GUI NOT RUN |
| Scroll / Trash craft | Thumb drag/wheel/trackpad/Page Up/Down/Tab at light/dark/high contrast and zoom levels. Trash has dated rows and recovery emphasis; preview scroll and long titles remain usable. | NOT RUN |
| Sets | Create overlapping sets, Show repeatedly over existing visible notes, rename, add/remove members, create-in-set, restart, trash/restore members and delete a set. No lost notes, clones or unintended hides; permanent deletion cleans membership. Check long names, empty/many sets and save failure. | Model/migration/rollback tests PASS; GUI NOT RUN |
| Shortcut recording | Record current and new combinations, Escape, Tab, blur, close, renderer exit and OS shortcut conflict. Field never accepts typed text. Existing shortcut is restored until a successful Save, with tray fallback on conflict. | Capture/lifecycle tests PASS; real OS input NOT RUN |
| Click & drop sound | Preview and listen to actual native grab/release, click without movement, repeated drag, held pauses, blur/cancel, muting and style changes. No cue on entrance, editing or locate. Inspect idle/context cleanup with multiple notes. | FAIL acoustic acceptance: user dislikes it, especially drop. Mocked checks PASS; agent listening/timing/performance NOT RUN. |
| Preferences overflow regression | Open Preferences at 760/900/1300px and 100/125/150% zoom. Labels stay fully visible, colours wrap horizontally, no horizontal scrolling. Repeat light/dark. | User screenshot failure; CSS remediation implemented; actual GUI NOT RUN |
| Show/hide lifecycle | Double-click hidden note: one bottom entrance to saved position, no blank flash. Repeat on already-visible note: focus without replay. Hide slides down without changing saved coordinates; reopen mid-hide, hide mid-entrance, grab during hide, quit/restart and change displays mid-transition. Reduced motion skips travel. | Readiness/trajectory/concurrency tests PASS; native GUI/compositor NOT RUN |
| Manager New note placement | Create from manager on each display: entrance lands at work-area center. Tray/shortcut still create near pointer. Repeat negative coordinates and small work areas. | Centering tests PASS; hardware/GUI NOT RUN |

## Resource profiling protocol (not yet measured)

Use a production build with disposable data. Record total Electron process-tree
CPU and working set, renderer frame timing and machine/display details. Measure
1, 5 and 10 visible notes, then hidden notes and deleted notes. For each, record
30 seconds at rest, 30 seconds of repeated native drags and 30 seconds after
settling. Repeat with sound enabled and muted; include editor input with long
content. Report median/peak values and idle recovery, not only a screenshot of
one instant. Compare identical workloads and avoid accepting performance based
on build time or unit-test duration. Deleted windows are destroyed after durable
trash save; confirm their renderer processes/resources are released in practice.

## Trash policy

Schema 3 retains deleted notes indefinitely with `deletedAt`; no automatic expiry.
Phase 3B adds permanent deletion from the manager's Trash with native confirmation
and Cancel as default. This is not secure erasure; backups can contain older data.
Tray Undo restores the latest
remaining trash entry, including across restart; Trash restores an individual
entry. Restore explicitly shows the note, preserving its content and appearance;
placement is recovered to a current work area when its new window opens. A
failed save rolls back deletion state before native visibility changes. Older
schema 1/2 files migrate with backups preserved; older app versions cannot read
schema 3. Manager trash uses the same state and restore semantics.
