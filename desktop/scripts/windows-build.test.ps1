# Run with: powershell -NoProfile -File desktop/scripts/windows-build.test.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$desktopRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$tokens = $null
$parseErrors = $null
$tree = [Management.Automation.Language.Parser]::ParseFile((Join-Path $desktopRoot 'build.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }

# Load only the helpers: tests must never trigger a build or touch runtime/dist.
foreach ($name in @('Invoke-Checked', 'Assert-BuildPath', 'Reset-BuildDirectory')) {
    $function = $tree.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $false)
    if (-not $function) { throw "Missing build helper: $name" }
    . ([scriptblock]::Create($function.Extent.Text))
}

function Assert-Throws {
    param([scriptblock]$Action, [string]$Expected)
    try { & $Action } catch {
        if ($_.Exception.Message -notlike "*$Expected*") { throw }
        return
    }
    throw "Expected failure containing: $Expected"
}

Assert-Throws { Invoke-Checked 'node' @('-e', 'process.exit(9)') } 'exit code 9'
$arguments = @('a path with spaces', "a'quote", 'C:\some folder\nested')
$echoed = Invoke-Checked 'node' (@('-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))') + $arguments) | ConvertFrom-Json
if (($echoed | ConvertTo-Json -Compress) -ne ($arguments | ConvertTo-Json -Compress)) {
    throw 'Native command argument boundaries changed.'
}
Assert-Throws { Assert-BuildPath $desktopRoot } 'outside the desktop directory'
Assert-Throws { Assert-BuildPath (Join-Path $desktopRoot '../outside') } 'outside the desktop directory'
Assert-Throws { Assert-BuildPath ($desktopRoot + '-other/file') } 'outside the desktop directory'

$testRoot = Assert-BuildPath (Join-Path $desktopRoot ('target/windows-build-test-' + [guid]::NewGuid().ToString('N')))
$linkedPath = Join-Path $testRoot 'junction'
try {
    Reset-BuildDirectory $testRoot
    $nested = Join-Path $testRoot 'nested folder'
    Reset-BuildDirectory $nested
    Set-Content -LiteralPath (Join-Path $nested 'old.txt') -Value 'stale build'
    Reset-BuildDirectory $nested
    if (@(Get-ChildItem -LiteralPath $nested -Force).Count -ne 0) { throw 'Build output was not emptied.' }
    New-Item -ItemType Junction -Path $linkedPath -Target $nested | Out-Null
    Assert-Throws { Assert-BuildPath (Join-Path $linkedPath 'child') } 'linked build path'
    Assert-Throws { Reset-BuildDirectory $testRoot } 'containing a link'
    # Remove only the junction, never its target or a recursively enumerated path.
    [IO.Directory]::Delete($linkedPath)
    if (-not (Test-Path -LiteralPath $nested)) { throw 'Junction test removed its target.' }
} finally {
    if (Test-Path -LiteralPath $linkedPath) { [IO.Directory]::Delete($linkedPath) }
    Reset-BuildDirectory $testRoot
    Remove-Item -LiteralPath $testRoot
}
Write-Host 'Windows build checks passed: syntax, native failure/quoting, safe paths, cleanup and junction rejection.'
