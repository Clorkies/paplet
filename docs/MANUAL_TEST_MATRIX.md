# Windows acceptance matrix

Updated 2026-11-14. This session ran automated checks only. No GUI, listening,
screen-reader, compositor, hardware lifecycle or resource measurements were run.
The approved paper animation is frozen; verification is not permission to tune it.
Use disposable user data and record Windows version, display topology, scaling,
refresh rate, revision and evidence when executing these checks.

| Area | Procedure / expected result | Current evidence |
| --- | --- | --- |
| Topmost | Repeat launch → Alt+Tab → click Notepad/browser → click note 20 times. Note stays above ordinary apps; background retains focus until selected. | NOT RUN |
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

Schema 3 retains deleted notes indefinitely with `deletedAt`; no automatic expiry
or permanent-delete UI exists in this milestone. Tray Undo restores the latest
remaining trash entry, including across restart; Trash restores an individual
entry. Restore explicitly shows the note, preserving its content and appearance;
placement is recovered to a current work area when its new window opens. A
failed save rolls back deletion state before native visibility changes. Older
schema 1/2 files migrate with backups preserved; older app versions cannot read
schema 3. Permanent deletion and manager trash controls remain later work.
