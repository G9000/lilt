import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, rmdirSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { writeArtifact, createManifest } from './release.mjs'

// Opt in because bunx may download the pinned CLI. No release credentials are needed.
test('verifies signatures made by the real pinned Tauri CLI', { skip: process.env.LILT_TEST_REAL_SIGNER !== '1' }, t => {
  const scratch = resolve(dirname(fileURLToPath(import.meta.url)), '../target')
  mkdirSync(scratch, { recursive: true })
  const dir = mkdtempSync(join(scratch, 'test-signer-'))
  const key = join(dir, 'ephemeral-test-only.key')
  const version = '0.2.1'
  const files = [key, `${key}.pub`]
  for (const arch of ['aarch64', 'x86_64']) {
    const name = `Lilt-${version}-${arch}`
    files.push(join(dir, `${name}.app.tar.gz`), join(dir, `${name}.app.tar.gz.sig`), join(dir, `${name}.dmg`), join(dir, `release-${arch}.json`))
  }
  t.after(() => {
    // Exact known files only, including the private key even when the CLI or assertions fail.
    for (const file of files) rmSync(file, { force: true })
    rmdirSync(dir)
  })
  const env = { ...process.env }
  for (const name of ['TAURI_SIGNING_PRIVATE_KEY', 'TAURI_SIGNING_PRIVATE_KEY_PATH', 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD', 'TAURI_PRIVATE_KEY', 'TAURI_KEY_PASSWORD', 'LILT_UPDATER_PUBLIC_KEY']) delete env[name]
  function cli(args) {
    const result = spawnSync('bunx', ['@tauri-apps/cli@2.12.4', 'signer', ...args], { env, encoding: 'utf8', timeout: 120_000, windowsHide: true })
    // Never print captured CLI output: key generation may include private key material.
    assert.equal(result.status, 0, `Tauri signer ${args[0]} failed (exit ${result.status}; ${result.error?.code ?? 'see local CLI setup'})`)
  }
  const password = 'ephemeral-test-only-password'
  cli(['generate', '--ci', '--password', password, '--write-keys', key])
  const publicKey = readFileSync(`${key}.pub`, 'utf8').trim()
  for (const arch of ['aarch64', 'x86_64']) {
    const name = `Lilt-${version}-${arch}`
    const archive = join(dir, `${name}.app.tar.gz`)
    writeFileSync(archive, `test-only archive bytes for ${arch}`)
    writeFileSync(join(dir, `${name}.dmg`), 'test-only installer bytes')
    cli(['sign', '--private-key-path', key, '--password', password, '--app-version', version, archive])
    writeArtifact(dir, arch, version, publicKey)
  }
  const manifest = createManifest(dir, version, 'Real signer compatibility fixture.', publicKey)
  assert.equal(manifest.version, version)
  assert.deepEqual(Object.keys(manifest.platforms), ['darwin-aarch64', 'darwin-x86_64'])
  writeFileSync(join(dir, `Lilt-${version}-aarch64.app.tar.gz`), 'altered after signing')
  assert.throws(() => createManifest(dir, version, '', publicKey), /signature verification/)
})
