import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateKeyPairSync, sign, createHash } from 'node:crypto'
import { checkEnvironment, checkVersions, createManifest, writeArtifact, validateArchiveEntries } from './release.mjs'

const version = '0.2.1'
const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const keyId = Buffer.alloc(8, 7)
const key = Buffer.concat([Buffer.from('Ed'), keyId, publicKey.export({ type: 'spki', format: 'der' }).subarray(-32)])
const publicText = Buffer.from(`untrusted comment: test key\n${key.toString('base64')}\n`).toString('base64')
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'lilt-release-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  for (const arch of ['aarch64', 'x86_64']) {
    const name = `Lilt-${version}-${arch}`
    const archive = Buffer.from(`complete fixture app for ${arch}`)
    writeFileSync(join(dir, `${name}.app.tar.gz`), archive)
    writeFileSync(join(dir, `${name}.dmg`), 'fixture dmg')
    const sig = sign(null, createHash('blake2b512').update(archive).digest(), privateKey)
    const comment = `timestamp:1\tfile:${name}.app.tar.gz\tversion:${version}`
    const global = sign(null, Buffer.concat([sig, Buffer.from(comment)]), privateKey)
    const signature = Buffer.from(`untrusted comment: signature\n${Buffer.concat([Buffer.from('ED'), keyId, sig]).toString('base64')}\ntrusted comment: ${comment}\n${global.toString('base64')}\n`).toString('base64')
    writeFileSync(join(dir, `${name}.app.tar.gz.sig`), signature)
    writeArtifact(dir, arch, version, publicText)
  }
  return dir
}
test('manifest binds both architectures to verified archives and versioned HTTPS URLs', t => {
  const manifest = createManifest(fixture(t), version, 'A quiet update.', publicText)
  assert.equal(manifest.version, version)
  assert.equal(manifest.notes, 'A quiet update.')
  assert.deepEqual(Object.keys(manifest.platforms), ['darwin-aarch64', 'darwin-x86_64'])
  assert.equal(manifest.platforms['darwin-aarch64'].url, 'https://github.com/G9000/lilt/releases/download/v0.2.1/Lilt-0.2.1-aarch64.app.tar.gz')
})
test('rejects a missing Intel build', t => {
  const dir = fixture(t)
  rmSync(join(dir, 'release-x86_64.json'))
  assert.throws(() => createManifest(dir, version, '', publicText), /ENOENT/)
})
test('rejects changed archive bytes even with a well formed signature', t => {
  const dir = fixture(t)
  writeFileSync(join(dir, `Lilt-${version}-aarch64.app.tar.gz`), 'tampered')
  assert.throws(() => createManifest(dir, version, '', publicText), /signature/)
})
test('rejects missing signature files', t => {
  const dir = fixture(t)
  rmSync(join(dir, `Lilt-${version}-aarch64.app.tar.gz.sig`))
  assert.throws(() => createManifest(dir, version, '', publicText), /ENOENT/)
})
test('rejects a modified installer after packaging', t => {
  const dir = fixture(t)
  writeFileSync(join(dir, `Lilt-${version}-aarch64.dmg`), 'different installer')
  assert.throws(() => createManifest(dir, version, '', publicText), /checksum/)
})
test('rejects a relabeled signed version and an altered trusted comment', t => {
  const dir = fixture(t)
  const path = join(dir, `Lilt-${version}-aarch64.app.tar.gz.sig`)
  const original = Buffer.from(readFileSync(path, 'utf8'), 'base64').toString('utf8')
  writeFileSync(path, Buffer.from(original.replace(`version:${version}`, 'version:0.2.2')).toString('base64'))
  assert.throws(() => writeArtifact(dir, 'aarch64', version, publicText), /version/)
  writeFileSync(path, Buffer.from(original.replace('timestamp:1', 'timestamp:2')).toString('base64'))
  assert.throws(() => writeArtifact(dir, 'aarch64', version, publicText), /signature verification/)
})
test('rejects a different updater public key', t => {
  const dir = fixture(t)
  const otherKey = Buffer.from(key)
  otherKey[10] ^= 1
  const otherPublicText = Buffer.from(`untrusted comment: other key\n${otherKey.toString('base64')}\n`).toString('base64')
  assert.throws(() => createManifest(dir, version, '', otherPublicText), /signature verification/)
})
test('rejects mismatched version metadata and absent installers', t => {
  const dir = fixture(t)
  assert.throws(() => createManifest(dir, '0.2.2', '', publicText), /version/)
  rmSync(join(dir, `Lilt-${version}-aarch64.dmg`))
  assert.throws(() => createManifest(dir, version, '', publicText), /ENOENT/)
})
test('rejects missing secrets and permits an explicitly empty key password', () => {
  assert.throws(() => checkEnvironment({}), /LILT_UPDATER_PUBLIC_KEY/)
  const env = Object.fromEntries(['LILT_UPDATER_PUBLIC_KEY', 'TAURI_SIGNING_PRIVATE_KEY', 'APPLE_SIGNING_IDENTITY', 'APPLE_ID', 'APPLE_PASSWORD', 'APPLE_TEAM_ID'].map(k => [k, k === 'APPLE_SIGNING_IDENTITY' ? 'Developer ID Application: Example (TEAM)' : 'present']))
  assert.throws(() => checkEnvironment(env), /TAURI_SIGNING_PRIVATE_KEY_PASSWORD/)
  env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
  assert.doesNotThrow(() => checkEnvironment(env))
  env.APPLE_SIGNING_IDENTITY = '-'
  assert.throws(() => checkEnvironment(env), /Developer ID/)
})
test('version comes from Tauri and must match Cargo and the displayed release', t => {
  const dir = mkdtempSync(join(tmpdir(), 'lilt-version-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir, 'desktop'))
  mkdirSync(join(dir, 'web/src'), { recursive: true })
  writeFileSync(join(dir, 'desktop/tauri.conf.json'), JSON.stringify({ version }))
  writeFileSync(join(dir, 'desktop/Cargo.toml'), `[package]\nversion = "${version}"\n`)
  writeFileSync(join(dir, 'web/src/release.ts'), `export const RELEASES = [{ version: '${version}' }]`)
  assert.equal(checkVersions(dir), version)
  writeFileSync(join(dir, 'desktop/Cargo.toml'), '[package]\nversion = "0.1.0"\n')
  assert.throws(() => checkVersions(dir), /version/)
})
test('archive completeness rejects missing runtime and paths outside the app', () => {
  const paths = ['Lilt.app/Contents/MacOS/lilt-desktop', 'Lilt.app/Contents/Info.plist', 'Lilt.app/Contents/Resources/runtime/lilt', 'Lilt.app/Contents/Resources/runtime/web/index.html', 'Lilt.app/Contents/Resources/runtime/content/courses/voice/README.md', 'Lilt.app/Contents/Resources/runtime/python/bin/python3', 'Lilt.app/Contents/Resources/runtime/analysis/lilt_analysis/__init__.py']
  assert.doesNotThrow(() => validateArchiveEntries(paths))
  assert.throws(() => validateArchiveEntries(paths.filter(p => !p.includes('/python/'))), /python/)
  assert.throws(() => validateArchiveEntries([...paths, '../escape']), /outside/)
})
