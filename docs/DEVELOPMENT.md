# Local development

Use Node.js 22.12+ and npm in Windows PowerShell:

```powershell
Set-Location F:\Projects\Stickee
npm ci
# Only if npm skipped Electron binary installation:
node node_modules/electron/install.js
npm run dev
```

Production build and launch:

```powershell
npm run build
npm start
```

Quit the previous instance through the tray before loading main/preload changes. A second launch brings back the existing instance rather than replacing its running code.

Checks:

```powershell
npm run typecheck
npm test
npm run build
```

Optional unpacked Windows executable (not an installer; packaging remains unverified):

```powershell
npm run pack:win
& '.\dist\win-unpacked\Stickee Prototype.exe'
```

Notes live under Electron's user-data folder, normally `%APPDATA%\stickee\data\notes.json` in development, with the previous valid save at `notes.json.bak`. Main receives each input event immediately and debounces disk writes by 250 ms; blur, hide and normal quit flush immediately.

See [progress](PROGRESS.md), [Phase 1 acceptance](PHASE_1.md), and [native feasibility](FEASIBILITY.md) before advancing implementation.
