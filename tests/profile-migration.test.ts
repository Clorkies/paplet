import { afterEach, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { migrateLegacyProfile } from '../src/main/profile-migration'
import { NoteStore, type SavedData } from '../src/main/store'

const roots: string[] = []
afterEach(() => {
 for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function profiles(legacyName = 'Stickee Prototype') {
 const root = mkdtempSync(join(tmpdir(), 'paplet-migration-'))
 roots.push(root)
 const previous = new NoteStore(join(root, legacyName, 'data'))
 const current = new NoteStore(join(root, 'Paplet', 'data'))
 return { previous, current, migrate: () => migrateLegacyProfile(root, current.path) }
}

const collection: SavedData = {
 schemaVersion: 5,
 notes: [{ id: 'one', text: 'Keep me', color: 'yellow', angle: 0, x: 15, y: 40, hidden: true, deletedAt: 50,
  ink: [{ color: 'graphite', width: 2, points: [10, 15] }] }],
 sets: [{ id: 'set', name: 'Ideas', noteIds: ['one'] }],
 settings: { sound: false, defaultColor: 'mint' }
}

it.each(['Papelo', 'Papelo Prototype', 'Stickee Prototype', 'stickee'])('copies the complete %s profile once and preserves the original', name => {
 const { previous, current, migrate } = profiles(name)
 previous.save(collection)
 migrate()
 expect(current.load()).toEqual(collection)
 expect(readFileSync(current.path)).toEqual(readFileSync(previous.path))
 const updated = { ...collection, settings: { sound: true } }
 current.save(updated)
 migrate()
 expect(current.load()).toEqual(updated)
 expect(previous.load()).toEqual(collection)
})

it('uses a valid legacy backup without modifying a damaged primary or consuming staging remnants', () => {
 const { previous, current, migrate } = profiles()
 writeFileSync(previous.path, '{')
 writeFileSync(previous.path + '.bak', JSON.stringify(collection))
 mkdirSync(join(dirname(current.path), '.profile-migration-interrupted'))
 migrate()
 expect(current.load()).toEqual(collection)
 expect(readFileSync(previous.path, 'utf8')).toBe('{')
})

it('stops on a future or unrecoverable save without creating new data', () => {
 const { previous, current, migrate } = profiles()
 writeFileSync(previous.path, '{"schemaVersion":6}')
 writeFileSync(previous.path + '.bak', JSON.stringify(collection))
 expect(migrate).toThrow('newer app version')
 expect(existsSync(current.path)).toBe(false)
 writeFileSync(previous.path, '{')
 writeFileSync(previous.path + '.bak', '{')
 expect(migrate).toThrow()
 expect(existsSync(current.path)).toBe(false)
})

it('preserves a destination with a recovery backup', () => {
 const { previous, current, migrate } = profiles()
 previous.save(collection)
 const backup = { ...collection, notes: [], sets: [] }
 writeFileSync(current.path + '.bak', JSON.stringify(backup))
 migrate()
 expect(existsSync(current.path)).toBe(false)
 expect(current.load()).toEqual(backup)
})
