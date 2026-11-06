# Local, unsigned Windows installer. Run from any directory with PowerShell 5.1 or newer.
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE."
    }
}

function Assert-BuildPath {
    param([string]$Path)
    $fullPath = [IO.Path]::GetFullPath($Path)
    if (-not $fullPath.StartsWith($desktopRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to change a path outside the desktop directory: $fullPath"
    }
    # Reject junctions and symbolic links before recursive operations can follow them.
    $ancestor = $fullPath
    while ($ancestor -and $ancestor -ne $desktopRoot) {
        if (Test-Path -LiteralPath $ancestor) {
            $item = Get-Item -LiteralPath $ancestor -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Refusing to change a linked build path: $ancestor"
            }
        }
        $ancestor = Split-Path -Parent $ancestor
    }
    return $fullPath
}

function Reset-BuildDirectory {
    param([string]$Path)
    $safePath = Assert-BuildPath $Path
    if (Test-Path -LiteralPath $safePath) {
        $linked = Get-ChildItem -LiteralPath $safePath -Recurse -Force |
            Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint } |
            Select-Object -First 1
        if ($linked) { throw "Refusing to remove a directory containing a link: $($linked.FullName)" }
        Remove-Item -LiteralPath $safePath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $safePath -Force | Out-Null
}

if ($env:OS -ne 'Windows_NT' -or -not [Environment]::Is64BitProcess) {
    throw 'Build the Windows x64 installer from a 64-bit PowerShell on Windows.'
}

$desktopRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$repoRoot = Split-Path -Parent $desktopRoot
$buildRoot = Assert-BuildPath (Join-Path $desktopRoot 'target')
$runtimeRoot = Assert-BuildPath (Join-Path $desktopRoot 'runtime')
$outputRoot = Assert-BuildPath (Join-Path $desktopRoot 'dist')
$targetTriple = 'x86_64-pc-windows-msvc'
$tauriCli = '@tauri-apps/cli@2.12.4'

foreach ($command in @('bun', 'node', 'cargo', 'rustc', 'uv')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Missing build tool: $command. See the Windows desktop build instructions in docs/guide.md."
    }
}

# Keep caller settings intact, and prevent local builds from acquiring release credentials.
$environmentNames = @(
    'CARGO_TARGET_DIR', 'UV_PYTHON_INSTALL_DIR', 'UV_CACHE_DIR', 'PYTHONPATH', 'PYTHONHOME',
    'PYTHONDONTWRITEBYTECODE', 'PYTHONNOUSERSITE', 'LILT_UPDATER_PUBLIC_KEY',
    'TAURI_SIGNING_PRIVATE_KEY', 'TAURI_SIGNING_PRIVATE_KEY_PATH',
    'TAURI_SIGNING_PRIVATE_KEY_PASSWORD', 'TAURI_CONFIG'
)
$savedEnvironment = @{}
foreach ($name in $environmentNames) {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

Push-Location $desktopRoot
try {
    foreach ($name in @('LILT_UPDATER_PUBLIC_KEY', 'TAURI_SIGNING_PRIVATE_KEY', 'TAURI_SIGNING_PRIVATE_KEY_PATH', 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD', 'TAURI_CONFIG', 'PYTHONHOME', 'PYTHONPATH')) {
        [Environment]::SetEnvironmentVariable($name, $null, 'Process')
    }
    $env:CARGO_TARGET_DIR = $buildRoot
    $env:UV_PYTHON_INSTALL_DIR = Assert-BuildPath (Join-Path $buildRoot 'python')
    $env:UV_CACHE_DIR = Assert-BuildPath (Join-Path $buildRoot 'uv-cache')
    $env:PYTHONDONTWRITEBYTECODE = '1'
    $env:PYTHONNOUSERSITE = '1'
    New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null

    $version = (Invoke-Checked 'node' @('scripts/release.mjs', 'version', $repoRoot) | Out-String).Trim()
    $pythonVersion = (Get-Content -LiteralPath (Join-Path $repoRoot 'analysis/.python-version') -Raw).Trim()
    $pythonRequest = "cpython-$pythonVersion-windows-x86_64-none"

    Write-Host '==> Web app'
    Push-Location $repoRoot
    try { Invoke-Checked 'bun' @('install', '--frozen-lockfile') } finally { Pop-Location }
    $webOutput = Assert-BuildPath (Join-Path $buildRoot 'web')
    Reset-BuildDirectory $webOutput
    Push-Location (Join-Path $repoRoot 'web')
    try {
        Invoke-Checked 'bun' @('run', 'typecheck')
        $webPackage = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
        if ($webPackage.scripts.PSObject.Properties.Name -contains 'build:desktop-styles') {
            Invoke-Checked 'bun' @('run', 'build:desktop-styles')
        }
        Invoke-Checked 'bun' @('x', 'vite', 'build', '--outDir', $webOutput, '--emptyOutDir')
    } finally { Pop-Location }

    Write-Host '==> Windows server'
    $serverTarget = Assert-BuildPath (Join-Path $buildRoot 'server')
    Invoke-Checked 'cargo' @('build', '--locked', '--release', '--manifest-path', (Join-Path $repoRoot 'server/Cargo.toml'), '--target', $targetTriple, '--target-dir', $serverTarget)

    Write-Host '==> Runtime: server, web app, courses, Python and measuring helper'
    Reset-BuildDirectory $runtimeRoot
    Copy-Item -LiteralPath (Join-Path $serverTarget "$targetTriple/release/lilt.exe") -Destination (Join-Path $runtimeRoot 'lilt.exe')
    Copy-Item -LiteralPath $webOutput -Destination (Join-Path $runtimeRoot 'web') -Recurse
    Copy-Item -LiteralPath (Join-Path $repoRoot 'content') -Destination (Join-Path $runtimeRoot 'content') -Recurse

    Invoke-Checked 'uv' @('python', 'install', $pythonRequest, '--no-bin', '--no-registry')
    $managedPython = (Invoke-Checked 'uv' @('python', 'find', '--managed-python', '--no-project', $pythonRequest) | Out-String).Trim()
    $pythonSource = (Invoke-Checked $managedPython @('-I', '-c', 'import sys; print(sys.base_prefix)') | Out-String).Trim()
    Copy-Item -LiteralPath $pythonSource -Destination (Join-Path $runtimeRoot 'python') -Recurse
    $bundledPython = Join-Path $runtimeRoot 'python/python.exe'
    if (-not (Test-Path -LiteralPath $bundledPython -PathType Leaf)) {
        throw 'The managed Windows Python distribution must contain python.exe at its root.'
    }
    $requirements = Assert-BuildPath (Join-Path $buildRoot 'windows-requirements.txt')
    Invoke-Checked 'uv' @('export', '--project', (Join-Path $repoRoot 'analysis'), '--locked', '--no-dev', '--no-emit-project', '--output-file', $requirements)
    $analysisOutput = Join-Path $runtimeRoot 'analysis'
    Invoke-Checked 'uv' @('pip', 'install', '--python', $bundledPython, '--target', $analysisOutput, '--require-hashes', '--only-binary', ':all:', '--link-mode', 'copy', '-r', $requirements)
    Copy-Item -LiteralPath (Join-Path $repoRoot 'analysis/lilt_analysis') -Destination (Join-Path $analysisOutput 'lilt_analysis') -Recurse
    $env:PYTHONPATH = $analysisOutput
    Invoke-Checked $bundledPython @('-s', '-c', 'import lilt_analysis, parselmouth, av, numpy; import struct; assert struct.calcsize(''P'') == 8')

    Write-Host '==> Windows installer (local, unsigned)'
    $bundleOutput = Assert-BuildPath (Join-Path $buildRoot "$targetTriple/release/bundle/nsis")
    # A failed build must never publish an old installer as the new result.
    Reset-BuildDirectory $bundleOutput
    Invoke-Checked 'bun' @('x', $tauriCli, 'build', '--target', $targetTriple, '--bundles', 'nsis', '--config', 'tauri.windows-bundle.conf.json', '--', '--locked')
    $installer = Join-Path $bundleOutput "Lilt_${version}_x64-setup.exe"
    if (-not (Test-Path -LiteralPath $installer -PathType Leaf) -or (Get-Item -LiteralPath $installer).Length -eq 0) {
        throw "The build did not produce the expected installer: $installer"
    }
    New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
    $destination = Assert-BuildPath (Join-Path $outputRoot "Lilt-$version-x64-setup.exe")
    Copy-Item -LiteralPath $installer -Destination $destination -Force
    Write-Host "Done: $destination"
} finally {
    Pop-Location
    foreach ($name in $environmentNames) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
    }
}
