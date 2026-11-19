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
| Topmost | Repeat launch → Alt+Tab → click Notepad/browser → click/drag note 20 times. Note stays above ordinary apps; background retains focus until selected. | Accepted in the user's manual retest on 2026-11-19. Closed unless it recurs. Earlier root cause unconfirmed. |
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

## Resource profiling protocol

Use a production build with disposable data. Record total Electron process-tree
CPU and working set, renderer frame timing and machine/display details. Measure
1, 5 and 10 visible notes, then hidden notes and deleted notes. For each, record
30 seconds at rest, 30 seconds of repeated native drags and 30 seconds after
settling. Repeat with sound enabled and muted; include editor input with long
content. Report median/peak values and idle recovery, not only a screenshot of
one instant. Compare identical workloads and avoid accepting performance based
on build time or unit-test duration. Deleted windows are destroyed after durable
trash save; confirm their renderer processes/resources are released in practice.

### Measured 2026-11-19 on Windows

Local production builds based on 58183c9 with the working manager and audio changes.
The baseline preceded the idle timer, drag capture and hidden-startup optimizations.
Tests ran sequentially with isolated profiles, the manager closed, short note text
and overlapping native windows. Intel i5-11400F, 12 logical processors, 16 GB RAM,
Windows build 26200, Electron 45.3.1, primary display 1920 x 1080 at 165 Hz and 100% scaling.

Electron process metrics were sampled once per second. Values are medians / peaks.
CPU uses cumulative process CPU seconds divided by elapsed wall time, so 100% is
one logical processor. Working set is summed across processes and can double-count
shared pages. Private bytes are shown separately. Each launch-idle sample lasted
30 seconds. The drag sample lasted 30 seconds with approximately 28 seconds
of injected native mouse movement on one note. Post-release sampling lasted
30 seconds, then 10 seconds after Hide All and 5 seconds after moving all notes
to Trash. Sound was muted except for the 20-note run, which used Rustle.

| Build, notes | Scenario | Processes | CPU %, one core | Working set MiB | Private MiB |
| --- | --- | ---: | ---: | ---: | ---: |
| before, 10 | hidden at launch | 13 | 1.01 / 3.61 | 1131 / 1146 | 471 / 488 |
| after, 10 | hidden at launch | 3 | 0.13 / 2.11 | 253 / 253 | 177 / 177 |
| after, 1 | settled at launch | 4 | 0.14 / 1.38 | 333 / 335 | 210 / 212 |
| after, 5 | settled at launch | 8 | 0.16 / 2.37 | 700 / 708 | 340 / 353 |
| before, 10 | settled at launch | 13 | 0.93 / 16.31 | 1149 / 1162 | 473 / 508 |
| before, 10 | native drag | 13 | 93.11 / 135.96 | 1233 / 1254 | 523 / 541 |
| before, 10 | after release | 13 | 0.59 / 2.24 | 1167 / 1236 | 459 / 529 |
| before, 10 | just hidden | 13 | 0.61 / 1.03 | 1189 / 1191 | 501 / 504 |
| before, 10 | just trashed | 3 | 0.47 / 0.82 | 284 / 286 | 200 / 203 |
| after, 10 | settled at launch | 13 | 0.21 / 2.45 | 1161 / 1176 | 488 / 522 |
| after, 10 | native drag | 13 | 92.11 / 115.63 | 1240 / 1257 | 536 / 547 |
| after, 10 | after release | 13 | 0.23 / 2.05 | 1173 / 1241 | 471 / 540 |
| after, 10 | just hidden | 13 | 1.35 / 2.81 | 1197 / 1199 | 504 / 508 |
| after, 10 | just trashed | 3 | 0.14 / 0.52 | 286 / 288 | 201 / 204 |
| after, 20 | settled at launch | 23 | 0.60 / 51.52 | 2079 / 2097 | 771 / 852 |
| after, 20 | native drag | 24 | 95.45 / 117.58 | 2247 / 2265 | 859 / 870 |
| after, 20 | after release | 24 | 0.32 / 2.80 | 2178 / 2245 | 792 / 860 |
| after, 20 | just hidden | 24 | 1.56 / 8.40 | 2235 / 2237 | 826 / 831 |
| after, 20 | just trashed | 4 | 0.18 / 0.34 | 378 / 378 | 225 / 225 |

An observer in the dragged note recorded requestAnimationFrame callback intervals.
These measure renderer scheduling. Actual compositor presentation, GPU usage,
power draw and pointer-to-pixel latency need a separate trace.

| Build, notes | Median ms | 95th percentile ms | Longest interval ms |
| --- | ---: | ---: | ---: |
| before, 10 | 6.1 | 6.2 | 66.8 |
| after, 10 | 6.1 | 6.2 | 48.5 |
| after, 20 | 6.1 | 6.2 | 72.9 |

The ten-note hidden-startup test restored all ten via tray Show All. Within a
running session, Hide retains the window and its editor state. Trash releases the
note windows. The 20-note run varies both count and sound, so comparison with ten
notes cannot isolate the effect of sound. Longer sessions, long-text editing,
matched sound on/off loads and mixed-refresh displays remain open.

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

### Capturing an intermittent note disappearance

Start a fresh Stickee process with the production build and the
`--trace-visibility` argument. From the repository in PowerShell:

```powershell
.\node_modules\electron\dist\electron.exe . --trace-visibility
```

If a note disappears, choose **Save visibility trace** in the tray before
reopening it. This writes `visibility-trace.jsonl` in the app's user-data
directory (one directory above the `data` folder shown in Preferences).
Normal Quit also writes the trace. The file holds up to 2,048 local events
covering focus, native drag entry/first move/exit, hide/show, minimization,
reported topmost status, opacity, window bounds, work area and renderer health.
It contains no note text. Actual compositor visibility and another application's
z-order still need desktop observation. Ordinary launches skip trace collection.

### Packaged Windows optimization pass, 2026-11-19

A matched workload used 20 visible 120,000-character notes at 165 Hz, the manager
closed, an editor insertion followed by a ten-second native drag, and Chromium
renderer, raster and presentation tracing. The audio-enabled runs used Rustle.
Numbers below are single runs on the i5-11400F system above. CPU is median
process-tree CPU with one logical core equal to 100%.

| Workload | Drag CPU before / after | 95th-percentile callback gap before / after | Longest callback gap before / after |
| --- | ---: | ---: | ---: |
| Muted | 113.7% / 109.8% | 6.2 / 6.2 ms | 78.7 / 60.6 ms |
| Rustle | 111.9% / 109.2% | 6.2 / 6.2 ms | 66.7 / 48.5 ms |

Perfetto showed raster and swap-chain presentation stalls near drag entry.
The final 95th-percentile compositor submission-to-presentation time was 11.8 ms
in both runs. Worst individual submissions were 92.8 ms muted and 54.1 ms with
Rustle (baseline 87.5 and 62.5 ms). Renderer animation callbacks themselves
took at most 0.56 ms in the final traces. This is a bounded hardware sample,
not a guarantee of hitch-free first grabs. The benchmark includes trace overhead.

Equal adjacent native hit-test spans are coalesced. The moving silhouette used
38 rectangles instead of 359. The full 360-by-360 masks matched the baseline
for the moving envelope and 366 resting angle, side and padding combinations.
The active text layer can reuse rasterized glyphs. Physics and SFX tuning were
preserved. Editing avoids redundant unchanged-state saves and overflow renders.
Manager filtering and folder membership calculations reuse results across UI updates.

Windows x64 packaging now uses the bundled renderer dependencies once and
includes their license texts. Renderer output fell from 700,962 to 299,866 bytes.
The app archive fell from 9,115,494 to 366,607 bytes. Total unpacked size fell
from 383,507,705 to 374,762,082 bytes including Electron, GPU fallbacks, locales
and licenses. The 157,440,846-byte ZIP was checked file-by-file against all
77 packaged files. The actual executable passed a 250-note, 40-set test of
folder browsing, editing, hide/show, trash/restore and persisted restart.

An additional 24 native drag-and-settle cycles alternated between the 1920x1080
165 Hz and 1366x768 60 Hz displays at 100% scale with 20 long notes open.
All 24 passed native hit-testing, window movement and visible paper-pixel checks.
Private memory at the post-settle checkpoints ranged from 936 to 1,004 MiB and
ended at 974 MiB. This run covers repeated use across refresh rates; mixed
DPI, suspend/resume and multi-hour retention remain unverified.
