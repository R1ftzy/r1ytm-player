[CmdletBinding()]
param(
  [switch]$NoZip
)

$ErrorActionPreference = 'Stop'

$extension = $PSScriptRoot
$root = Split-Path $extension -Parent
$dist = Join-Path $root 'dist'

$targets = @(
  @{ Name = 'chrome';  Manifest = 'manifest.chrome.json'  },
  @{ Name = 'firefox'; Manifest = 'manifest.firefox.json' }
)

if (Test-Path -LiteralPath $dist) {
  Remove-Item -LiteralPath $dist -Recurse -Force
}
New-Item -ItemType Directory -Path $dist | Out-Null

foreach ($target in $targets) {
  $stage = Join-Path $dist "r1ytm-$($target.Name)"
  New-Item -ItemType Directory -Path $stage | Out-Null

  Copy-Item -LiteralPath (Join-Path $extension 'content.js') -Destination $stage
  Copy-Item -LiteralPath (Join-Path $extension 'icons') -Destination $stage -Recurse
  Copy-Item -LiteralPath (Join-Path $extension $target.Manifest) -Destination (Join-Path $stage 'manifest.json')

  Write-Host "Built $stage"

  if (-not $NoZip) {
    $zip = Join-Path $dist "r1ytm-$($target.Name).zip"
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
    Write-Host "  Packed $zip"
  }
}

Write-Host ''
Write-Host 'Done. Load the chrome folder at chrome://extensions or the firefox folder at about:debugging.'
