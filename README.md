# Stickee

Windows-first Electron sticky notes with independent transparent windows, flexible paper motion and a directional curl.

**Project status:** see the [phase progress tracker](docs/PROGRESS.md), including remaining native checks and the planned main application / note manager.

Use Node.js 22.12+ and npm in PowerShell:

```powershell
Set-Location F:\Projects\Stickee
npm ci
# Only if npm skipped Electron binary installation:
node node_modules/electron/install.js
npm run dev
```

Production build and local launch:

```powershell
npm run build
npm start
```

Quit the previous prototype first. A second instance shows existing notes; it does not replace the running app's code.

- **Ctrl+Alt+N** creates a blank note on the pointer's monitor, ready for typing.
- Right-click the **Stickee tray icon** for Create Note, Show All, Hide All and Quit. Windows may place it under the taskbar hidden-icons arrow. Double-click creates a note.
- Hover/focus a note for **New** and **Hide** controls. Right-click provides editing commands and these actions too.
- Drag the top strip; edit and scroll text in the body. Alt+F4 hides a note. Show All restores it. Quit through the tray to exit.
- First launch opens one blank note. Text, positions, paper variant, orientation and hidden state restore on subsequent launches.

Data is saved under Electron's user-data folder, normally `%APPDATA%\stickee\data\notes.json` in development. `notes.json.bak` holds the previous valid save. Main receives each text input immediately; disk writes wait 250 ms after activity, with immediate flush on blur, hiding and normal quit. Save errors display a message and block normal quit. Force termination can lose the latest unsaved interval.

```powershell
npm run typecheck
npm test
npm run build
```

Optional unpacked executable, not an installer (not tested in this phase):

```powershell
npm run pack:win
& '.\dist\win-unpacked\Stickee Prototype.exe'
```

See [Phase 1 verification](docs/PHASE_1.md) and [native feasibility](docs/FEASIBILITY.md). macOS hit testing is unsupported. Product name remains provisional.
