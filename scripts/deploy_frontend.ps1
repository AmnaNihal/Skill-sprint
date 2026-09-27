# Deploy the frontend to Vercel as a prebuilt static site.
#
# Why not the CLI directly on the repo root: the repo contains a FastAPI backend with its own
# Vercel config, which the modern Vercel CLI auto-detects as a monorepo "service" and refuses to
# combine with the frontend's build settings. So we build locally and deploy the `dist/` folder
# from a throwaway directory.
#
# Usage:
#   $env:VERCEL_TOKEN = "<token>"
#   ./scripts/deploy_frontend.ps1
#
# Optional:
#   ./scripts/deploy_frontend.ps1 -ApiBase https://skills-sprint-api.vercel.app -Project skills-sprint -Alias skills-sprint.vercel.app

param(
  [string]$Project = "skills-sprint",
  [string]$ApiBase = "https://skills-sprint-api.vercel.app",
  [string]$Alias = "skills-sprint.vercel.app"
)

$ErrorActionPreference = "Stop"

if (-not $env:VERCEL_TOKEN) {
  throw "VERCEL_TOKEN is not set. Run: `$env:VERCEL_TOKEN = '<token>'"
}

$repo = Split-Path -Parent $PSScriptRoot

Write-Host "Building frontend with VITE_API_BASE=$ApiBase"
$env:VITE_API_BASE = $ApiBase
Push-Location $repo
npm run build
Pop-Location

$web = Join-Path $env:TEMP ("ss-web-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force -Path $web | Out-Null
Copy-Item (Join-Path $repo "dist\*") $web -Recurse -Force

# SPA catch-all rewrite (written without BOM).
$cfg = '{"routes":[{"handle":"filesystem"},{"src":"/(.*)","dest":"/index.html"}]}'
[System.IO.File]::WriteAllText((Join-Path $web "vercel.json"), $cfg, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Deploying $web to Vercel project '$Project'"
Push-Location $web
vercel link --yes --project $Project
vercel deploy --prod --yes
Pop-Location

Write-Host "Done. Frontend: https://$Alias"
