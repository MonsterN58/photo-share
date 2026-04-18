param(
  [int]$Port = 3000,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-PortInUse {
  param([int]$PortToCheck)
  try {
    return [bool](Get-NetTCPConnection -LocalPort $PortToCheck -State Listen -ErrorAction SilentlyContinue)
  } catch {
    return $false
  }
}

function Get-AvailablePort {
  param([int]$StartPort)
  for ($candidate = $StartPort; $candidate -le ($StartPort + 20); $candidate++) {
    if (-not (Test-PortInUse -PortToCheck $candidate)) {
      return $candidate
    }
  }
  throw "No available port found from $StartPort to $($StartPort + 20)."
}

function Read-DotEnv {
  param([string]$Path)
  $envMap = @{}
  if (-not (Test-Path $Path)) {
    return $envMap
  }

  Get-Content $Path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $index = $line.IndexOf("=")
    if ($index -le 0) {
      return
    }

    $key = $line.Substring(0, $index).Trim()
    $value = $line.Substring($index + 1).Trim()
    $envMap[$key] = $value
  }

  return $envMap
}

function Test-EnvValue {
  param(
    [hashtable]$EnvMap,
    [string]$Name
  )

  if (-not $EnvMap.ContainsKey($Name)) {
    return $false
  }

  $value = [string]$EnvMap[$Name]
  return -not [string]::IsNullOrWhiteSpace($value) -and -not $value.StartsWith("your_")
}

Write-Host ""
Write-Host "PhotoShare one-click dev startup" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

if (-not (Test-CommandExists "node")) {
  throw "Node.js was not found. Install Node.js first, then run this script again."
}

if (-not (Test-CommandExists "npm")) {
  throw "npm was not found. Install Node.js/npm first, then run this script again."
}

if (-not (Test-Path ".env.local")) {
  if (Test-Path ".env.local.example") {
    Copy-Item ".env.local.example" ".env.local"
    Write-Host "Created .env.local from .env.local.example. Fill it before using protected features." -ForegroundColor Yellow
  } else {
    Write-Host ".env.local was not found." -ForegroundColor Yellow
  }
}

$envMap = Read-DotEnv ".env.local"
$databaseMode = if ($envMap.ContainsKey("DATABASE_MODE")) { [string]$envMap["DATABASE_MODE"] } else { "local" }
$storageMode = if ($envMap.ContainsKey("STORAGE_MODE")) { [string]$envMap["STORAGE_MODE"] } else { "gitee" }

switch ($databaseMode.ToLowerInvariant()) {
  "remote" {
    if ($storageMode.ToLowerInvariant() -ne "github") {
      Write-Host "DATABASE_MODE=remote only takes effect with STORAGE_MODE=github. Current combination will fall back to local SQLite." -ForegroundColor Yellow
    } else {
      $missing = @("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY") |
        Where-Object { -not (Test-EnvValue -EnvMap $envMap -Name $_) }
      if ($missing.Count -gt 0) {
        Write-Host "Warning: missing remote database config: $($missing -join ', ')." -ForegroundColor Yellow
        Write-Host "Remote database mode will not work until these are set." -ForegroundColor Yellow
      }
    }
  }
  "local" {
    Write-Host "Database mode: local SQLite (separate file per storage mode)." -ForegroundColor DarkGray
  }
  default {
    Write-Host "Warning: unsupported DATABASE_MODE '$databaseMode'. Supported values: local, remote." -ForegroundColor Yellow
  }
}

switch ($storageMode.ToLowerInvariant()) {
  "gitee" {
    $missing = @("GITEE_TOKEN", "GITEE_REPO_OWNER", "GITEE_REPO_NAME") |
      Where-Object { -not (Test-EnvValue -EnvMap $envMap -Name $_) }
    if ($missing.Count -gt 0) {
      Write-Host "Warning: missing Gitee image storage config: $($missing -join ', ')." -ForegroundColor Yellow
      Write-Host "Image upload to Gitee will not work until these are set." -ForegroundColor Yellow
    }
  }
  "github" {
    $missing = @("GITHUB_TOKEN", "GITHUB_REPO_OWNER", "GITHUB_REPO_NAME") |
      Where-Object { -not (Test-EnvValue -EnvMap $envMap -Name $_) }
    if ($missing.Count -gt 0) {
      Write-Host "Warning: missing GitHub image storage config: $($missing -join ', ')." -ForegroundColor Yellow
      Write-Host "Image upload to GitHub will not work until these are set." -ForegroundColor Yellow
    }
  }
  "local" {
    Write-Host "Storage mode: local (files will be written under public/uploads by default)." -ForegroundColor DarkGray
  }
  default {
    Write-Host "Warning: unsupported STORAGE_MODE '$storageMode'. Supported values: gitee, github, local." -ForegroundColor Yellow
  }
}

if (-not $SkipInstall -and -not (Test-Path "node_modules")) {
  Write-Host "node_modules not found. Running npm install..." -ForegroundColor Cyan
  npm install
}

$actualPort = Get-AvailablePort -StartPort $Port
if ($actualPort -ne $Port) {
  Write-Host "Port $Port is busy. Using $actualPort instead." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting dev server: http://localhost:$actualPort" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

npm run dev -- -p $actualPort
