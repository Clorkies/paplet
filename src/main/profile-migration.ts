import { closeSync, fsyncSync, linkSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseData, SCHEMA_VERSION } from './store'

// Try the most recent brand first, then the older prototype profiles.
const legacyProfiles = ['Papelo', 'Papelo Prototype', 'Stickee Prototype', 'stickee']

function readSave(path: string): string | undefined {
 try {
  return readFileSync(path, 'utf8')
 } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
 }
}

function validatePrimary(raw: string) {
 let version: unknown
 try {
  version = JSON.parse(raw)?.schemaVersion
 } catch {
  return false
 }
 if (typeof version === 'number' && version > SCHEMA_VERSION) {
  throw new Error('The previous profile was saved by a newer app version.')
 }
 try {
  parseData(raw)
  return true
 } catch {
  return false
 }
}

export function migrateLegacyProfile(appData: string, destination: string) {
 if (readdirSync(dirname(destination)).some(name => /^notes\.json(?:$|\.bak$|\.corrupt-)/.test(name))) return

 for (const profile of legacyProfiles) {
  const source = join(appData, profile, 'data', 'notes.json')
  const primary = readSave(source)
  const raw = primary !== undefined && validatePrimary(primary) ? primary : readSave(source + '.bak')
  if (raw === undefined) {
   if (primary !== undefined) throw new Error('The previous profile is damaged and has no backup: ' + source)
   continue
  }
  parseData(raw)
  const staging = mkdtempSync(join(dirname(destination), '.profile-migration-'))
  try {
   const candidate = join(staging, 'notes.json')
   writeFileSync(candidate, raw, 'utf8')
   const fd = openSync(candidate, 'r+')
   try { fsyncSync(fd) } finally { closeSync(fd) }
   // Promote a complete file without replacing a destination created in the meantime.
   try {
    linkSync(candidate, destination)
   } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
   }
  } finally {
   rmSync(staging, { recursive: true, force: true })
  }
  return
 }
}
