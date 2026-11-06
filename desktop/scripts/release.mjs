import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, createPublicKey, verify } from 'node:crypto'

const architectures = ['aarch64', 'x86_64']
const repository = 'https://github.com/G9000/lilt'
const read = path => readFileSync(path, 'utf8')
function requireVersion(version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error('A stable three-part release version is required')
}
export function checkVersions(root) {
  const version = JSON.parse(read(join(root, 'desktop/tauri.conf.json'))).version
  requireVersion(version)
  const cargo = read(join(root, 'desktop/Cargo.toml')).match(/\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m)?.[1]
  const displayed = read(join(root, 'web/src/release.ts')).match(/version:\s*["']([^"']+)["']/)?.[1]
  if (cargo !== version || displayed !== version) throw new Error(`Desktop version mismatch: Tauri ${version}, Cargo ${cargo}, displayed ${displayed}`)
  return version
}
export function checkEnvironment(env) {
  for (const name of ['LILT_UPDATER_PUBLIC_KEY', 'TAURI_SIGNING_PRIVATE_KEY', 'APPLE_SIGNING_IDENTITY', 'APPLE_ID', 'APPLE_PASSWORD', 'APPLE_TEAM_ID']) {
    if (!env[name]?.trim()) throw new Error(`Release requires ${name}`)
  }
  if (!Object.hasOwn(env, 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD')) throw new Error('Release requires TAURI_SIGNING_PRIVATE_KEY_PASSWORD (set an empty string for an unencrypted key)')
  if (!env.APPLE_SIGNING_IDENTITY.startsWith('Developer ID Application:')) throw new Error('Release requires a Developer ID Application signing identity')
}
function decodeBase64(value, description) {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || Buffer.from(value, 'base64').toString('base64') !== value) throw new Error(`Invalid ${description}`)
  return Buffer.from(value, 'base64')
}
function verifySignature(path, signature, publicText, version) {
  const keyLines = decodeBase64(publicText.trim(), 'public key').toString('utf8').trim().split(/\r?\n/)
  const key = decodeBase64(keyLines[1], 'public key')
  const lines = decodeBase64(signature, 'signature').toString('utf8').trim().split(/\r?\n/)
  const signed = decodeBase64(lines[1], 'signature')
  if (key.length !== 42 || key.subarray(0, 2).toString() !== 'Ed' || signed.length !== 74 || signed.subarray(0, 2).toString() !== 'ED' || !signed.subarray(2, 10).equals(key.subarray(2, 10))) throw new Error('Updater signature does not match the public key or supported minisign format')
  if (lines.length !== 4 || !lines[2].startsWith('trusted comment: ')) throw new Error('Missing trusted signature comment')
  const comment = lines[2].slice('trusted comment: '.length)
  const versions = comment.split('\t').filter(field => field.startsWith('version:'))
  if (versions.length !== 1 || versions[0] !== `version:${version}`) throw new Error('Updater signature version does not match release version')
  const publicKey = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), key.subarray(10)]), type: 'spki', format: 'der' })
  const signatureBytes = signed.subarray(10)
  const hash = createHash('blake2b512').update(readFileSync(path)).digest()
  if (!verify(null, hash, publicKey, signatureBytes) || !verify(null, Buffer.concat([signatureBytes, Buffer.from(comment)]), publicKey, decodeBase64(lines[3], 'global signature'))) throw new Error('Updater signature verification failed')
}
function nonemptyFile(path) {
  const stat = statSync(path)
  if (!stat.isFile() || stat.size === 0) throw new Error(`Missing or empty release file: ${path}`)
}
function digest(path) { return createHash('sha256').update(readFileSync(path)).digest('hex') }
export function writeArtifact(dir, arch, version, publicText) {
  requireVersion(version)
  if (!architectures.includes(arch)) throw new Error('Unsupported release architecture')
  const name = `Lilt-${version}-${arch}`
  const archive = `${name}.app.tar.gz`
  const dmg = `${name}.dmg`
  for (const file of [archive, `${archive}.sig`, dmg]) nonemptyFile(join(dir, file))
  const signature = read(join(dir, `${archive}.sig`)).trim()
  verifySignature(join(dir, archive), signature, publicText, version)
  const artifact = { version, arch, archive, dmg, signature, archiveSha256: digest(join(dir, archive)), dmgSha256: digest(join(dir, dmg)) }
  writeFileSync(join(dir, `release-${arch}.json`), `${JSON.stringify(artifact, null, 2)}\n`)
  return artifact
}
export function createManifest(dir, version, notes, publicText) {
  requireVersion(version)
  const platforms = {}
  for (const arch of architectures) {
    const artifact = JSON.parse(read(join(dir, `release-${arch}.json`)))
    if (artifact.version !== version || artifact.arch !== arch) throw new Error(`Release version or architecture mismatch for ${arch}`)
    const name = `Lilt-${version}-${arch}`
    if (artifact.archive !== `${name}.app.tar.gz` || artifact.dmg !== `${name}.dmg`) throw new Error('Unexpected release artifact filename')
    for (const file of [artifact.archive, `${artifact.archive}.sig`, artifact.dmg]) nonemptyFile(join(dir, file))
    const signature = read(join(dir, `${artifact.archive}.sig`)).trim()
    if (signature !== artifact.signature) throw new Error('Release signature metadata mismatch')
    verifySignature(join(dir, artifact.archive), signature, publicText, version)
    if (digest(join(dir, artifact.archive)) !== artifact.archiveSha256 || digest(join(dir, artifact.dmg)) !== artifact.dmgSha256) throw new Error('Release file checksum mismatch')
    platforms[`darwin-${arch}`] = { signature, url: `${repository}/releases/download/v${version}/${artifact.archive}` }
  }
  return { version, notes, pub_date: new Date().toISOString(), platforms }
}
export function validateArchiveEntries(entries) {
  const normalized = entries.map(entry => entry.replace(/^\.\//, '')).filter(Boolean)
  for (const entry of normalized) {
    if (!(entry === 'Lilt.app' || entry.startsWith('Lilt.app/')) || entry.split('/').includes('..')) throw new Error('Archive contains a path outside Lilt.app')
  }
  for (const suffix of ['Contents/Info.plist', 'Contents/MacOS/lilt-desktop', 'Contents/Resources/runtime/lilt', 'Contents/Resources/runtime/web/index.html', 'Contents/Resources/runtime/python/bin/python3', 'Contents/Resources/runtime/analysis/lilt_analysis/__init__.py']) {
    if (!normalized.includes(`Lilt.app/${suffix}`)) throw new Error(`Incomplete update archive: missing ${suffix}`)
  }
  if (!normalized.some(path => path.startsWith('Lilt.app/Contents/Resources/runtime/content/courses/voice/'))) throw new Error('Incomplete update archive: missing voice course')
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2)
    if (command === 'preflight') checkEnvironment(process.env)
    else if (command === 'version') console.log(checkVersions(resolve(args[0] ?? '.')))
    else if (command === 'artifact') writeArtifact(args[0], args[1], args[2], process.env.LILT_UPDATER_PUBLIC_KEY)
    else if (command === 'archive') validateArchiveEntries(read(args[0]).split(/\r?\n/))
    else if (command === 'manifest') {
      const manifest = createManifest(args[0], args[1], read(args[2]), process.env.LILT_UPDATER_PUBLIC_KEY)
      writeFileSync(join(args[0], 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    } else throw new Error('Usage: release.mjs preflight | version ROOT | artifact DIR ARCH VERSION | archive LIST | manifest DIR VERSION NOTES_FILE')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
