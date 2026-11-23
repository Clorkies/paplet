# Local development

Use Node.js 22.12+ and npm in Windows PowerShell:

```powershell
Set-Location 'C:\path\to\paplet'
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

Hit-testing diagnostics (shape/tight/ignore modes, native-drag comparison) are hidden from ordinary notes. Enable them for a session:

```powershell
$env:PAPLET_DIAGNOSTICS = '1'; npm run dev
```

Checks:

```powershell
npm run typecheck
npm test
npm run build
```

Optional unpacked Windows executable (not an installer; packaging remains unverified):

```powershell
npm run pack:win
& '.\dist\win-unpacked\Paplet.exe'
```

Notes live under Electron's user-data folder, normally `%APPDATA%\Paplet\data\notes.json` on Windows, with the previous valid save at `notes.json.bak`. Main receives each input event immediately and debounces disk writes by 250 ms; blur, hide and normal quit flush immediately.

On first launch with the default profile, Paplet checks the old packaged profile first and then the old development profile. It copies the first recoverable collection without changing the original. A valid legacy backup can supply the collection when the primary is absent or invalid. A future schema or a damaged collection without a valid backup stops startup. Existing Paplet saves and recovery files take priority. Custom profiles remain separate.

The exact historical profile names are retained in `src/main/profile-migration.ts` and its test fixtures so the existing files can be located.

See [progress](PROGRESS.md), [Phase 1 acceptance](PHASE_1.md), and [native feasibility](FEASIBILITY.md) before advancing implementation.
