Param(
  [switch]$NoBuild
)

Write-Host "✅ White-Box Local Bootstrap (Windows)" -ForegroundColor Green
Write-Host ""

function Require-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Missing: $name" -ForegroundColor Red
    Write-Host $hint
    Exit 1
  }
}

Require-Command git "Install Git: https://git-scm.com/downloads"
Require-Command docker "Install Docker Desktop and ensure it's running: https://www.docker.com/products/docker-desktop/"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

function Rand-Base64Url([int]$bytes=32) {
  $rng = New-Object byte[] ($bytes)
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($rng)
  $b64 = [Convert]::ToBase64String($rng)
  $b64 = $b64.Replace('+','-').Replace('/','_').TrimEnd('=')
  return $b64
}

$envText = Get-Content ".env" -Raw
$replacements = @{
  "JWT_SECRET" = (Rand-Base64Url 48)
  "ADMIN_SESSION_SECRET" = (Rand-Base64Url 48)
  "META_WEBHOOK_SECRET" = (Rand-Base64Url 24)
  "PAYFAST_ITN_PASSPHRASE" = (Rand-Base64Url 16)
}

foreach ($k in $replacements.Keys) {
  $v = $replacements[$k]
  if ($envText -match "(?m)^$k=") {
    $envText = [regex]::Replace($envText, "(?m)^$k=.*$", "$k=$v")
  } else {
    $envText += "`n$k=$v`n"
  }
}
Set-Content ".env" $envText -NoNewline
Write-Host "Updated .env secrets."

$adminPw = Read-Host "Set ADMIN password"
$sha = [System.Security.Cryptography.SHA256]::Create()
$hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($adminPw))
$hash = ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""

$envText = Get-Content ".env" -Raw
if ($envText -match "(?m)^ADMIN_PASSWORD_HASH=") {
  $envText = [regex]::Replace($envText, "(?m)^ADMIN_PASSWORD_HASH=.*$", "ADMIN_PASSWORD_HASH=$hash")
} else {
  $envText += "`nADMIN_PASSWORD_HASH=$hash`n"
}
Set-Content ".env" $envText -NoNewline
Write-Host "Set ADMIN_PASSWORD_HASH."

Write-Host ""
Write-Host "Starting Docker stack..." -ForegroundColor Cyan
if ($NoBuild) {
  docker compose -f docker-compose.prod.yml up -d
} else {
  docker compose -f docker-compose.prod.yml up -d --build
}

Write-Host ""
Write-Host "Running DB migrations..." -ForegroundColor Cyan
docker compose -f docker-compose.prod.yml exec -T api pnpm -C packages/db migrate

Write-Host ""
Write-Host "✅ Local stack is up!" -ForegroundColor Green
Write-Host "Store: http://localhost:3000"
Write-Host "Admin: http://localhost:3000/admin"
Write-Host "Next: complete /admin/setup then add products in /admin/products"
