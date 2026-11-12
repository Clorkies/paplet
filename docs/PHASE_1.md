# Phase 1 desktop foundation

Implemented; Windows GUI acceptance pending. The user accepted Phase 0 appearance/motion and explicitly authorized Phase 1 using the documented conditional baseline. Outstanding native tests have not been upgraded to PASS.

## Implemented

Independent note windows preserve the accepted paper/curl interaction. Ctrl+Alt+N creates and focuses a blank yellow note near the cursor on its monitor. Shortcut registration failure displays a warning; tray creation remains available. The tray provides Create Note, Show All, Hide All and Quit, plus double-click creation. A local bitmap glyph avoids an asset/dependency requirement.

First launch creates one blank note. Subsequent launches restore text, position, paper variant, orientation and hidden state. New and Hide controls appear on hover/focus; the native context menu provides editing and note actions. Closing/Alt+F4 hides instead of deleting. The app stays in the tray when notes are hidden. Second launch shows existing notes. Quit cleans up shortcut/tray resources. The Phase 0 background panel no longer opens normally.

`src/main/store.ts` validates versioned JSON, writes a temporary file, fsyncs it and renames it over the primary. The last valid primary is backed up. Malformed primaries are preserved under timestamped names, with backup recovery and a warning. Future schemas stop startup without saving. Main owns note state and serializes synchronous writes; renderer input sends text immediately, with 250 ms disk debounce and immediate blur/hide/quit flush. Save errors are visible and cancel normal quit. Startup/display changes recover positions into work areas. Directory metadata durability and exhaustive power-loss recovery have not been certified.

Deletion/undo, full palette controls, and bottom-of-screen entrance remain later-phase work. No accounts, cloud services, database or new runtime dependencies were added.

## Executed checks

- `npm run build`: PASS, including strict TypeScript checking and all three production bundles.
- `npm test`: PASS, 8 tests across 3 files.
- Persistence tests use actual temporary files: Unicode and independent-note round trips, malformed-primary backup recovery, future-schema preservation, and invalid-state rejection without damaging the saved primary.
- Existing geometry/motion tests pass. They do not prove native Windows behavior.
- GUI launch/shortcut/tray/restart verification of this revision: NOT RUN by agent.
- Packaged executable: NOT RUN.

## Manual Windows acceptance

1. Quit the old prototype, run `npm start`, and verify a blank note plus tray icon appear without the background lab window or startup warnings.
2. With Notepad focused, use Ctrl+Alt+N. Check cursor-monitor placement and immediate typing. Repeat via tray and New control.
3. Enter distinct multiline/Unicode text into three notes, drag to distinct positions and change curl orientations. Wait 300 ms, quit via tray, restart and check text/position/orientation restoration.
4. Hide one note and then all notes; use Show All to restore. Restart with a hidden note and confirm hidden state persists. Alt+F4 hides without deletion.
5. Launch a second instance; check existing notes appear with no duplicate tray icon/windows.
6. Reserve Ctrl+Alt+N in another app before launching. Check warning and tray fallback.
7. Alternate edits rapidly between notes and quit immediately after typing. Verify restoration. Separately force-kill a disposable test session after debounce and check last completed save.
8. Back up disposable test data, corrupt the primary and restart. Verify warning, backup recovery and preserved corrupt file. With a denied-write test directory verify save error and canceled normal quit.
9. Recheck click-through, overlapping input, mixed DPI, monitor removal, reduced motion, selection/paste/IME and focus. Observe CPU/memory with ten notes.

All manual checks above are NOT RUN by the agent. Phase 1's restart acceptance and full MVP readiness must not be called verified yet. Recommended next step is this acceptance session, then scoped Phase 2 entrance/polish work while preserving accepted motion.


## Focus/stacking and drag-control follow-up

User reported: launch, Alt+Tab to a background app, click that app, then click a note; the note sometimes becomes buried. The revised implementation explicitly reapplies the floating topmost band on show/restore/focus and after native shape changes. Focus raises the selected note immediately and after the activation event completes. Blur reasserts the topmost band without calling show/focus or moveTop. Unexpected loss of the topmost flag is repaired on the next event turn. Notes use skipTaskbar and disable the native thick frame to avoid taskbar grouping and frame activation effects. This is a targeted remediation; root cause and successful repair are NOT confirmed by an automated unit test or native GUI reproduction.

Native WM_ENTERSIZEMOVE / WM_EXITSIZEMOVE notifications now hide action/experiment controls through a full drag, including pauses while holding the mouse. Renderer settling completion reveals them with a fade. Action placement follows the flat corner opposite the currently drawn curl; controls stay hidden while it flips. Reduced motion reveals controls immediately on drag end. Manual movement comparison also hides New/Hide during pointer capture.

Build/typecheck and 8 existing tests passed. Required manual regression: repeat the user's Alt+Tab sequence at least 20 times with Notepad and a browser; notes must stay visible, editable, and topmost without taking focus from the other app until deliberately clicked. Check tray Show All, restored notes, independent overlap ordering, and that deliberate Hide remains hidden. During dragging, pause with the mouse held: actions must remain hidden. Release after reversing curl direction: actions fade into the opposite corner and remain keyboard-accessible. This native regression is NOT RUN by the agent.

## Explicit editing, corner grab and sound checks

The latest user preference supersedes earlier immediate-typing behavior: new notes wait for an editor click or keyboard focus.

- Create a note, drag from the center top and both top corners, and release. No caret should appear; typing before deliberately focusing the editor must not change text.
- Click the editor, type/select text, then drag by the top strip. Confirm the caret disappears and typing after release does not edit until the editor is focused again. Check Tab navigation and autosave on blur.
- Confirm text selection still works inside the editor and the enlarged grab strip does not intercept it. Repeat with both curl sides and rotated notes.
- With Sound on, compare slow/fast drags and direction reversals. Sound should swell smoothly, fade during a pause while holding the mouse, resume on movement and stop on release or Alt+Tab. Listen for clicks, excessive loudness or unwanted looping artifacts.
- Mute, drag again, then re-enable. Confirm silence when muted. The toggle is per note and resets when its renderer is recreated.
- Compare Electron CPU/memory at idle and during repeated drags with audio enabled and muted, including ten used notes. Confirm idle usage returns to baseline; record measured values before making performance claims.

These GUI, listening and resource checks are NOT RUN by the agent. Automated build/typecheck and all 16 tests passed, including two mocked audio lifecycle tests.
