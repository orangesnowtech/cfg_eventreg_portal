# Creates the secrets Firebase App Hosting reads at runtime.
#
# No credential is embedded in this file. An earlier version hardcoded the
# service account private key and the ZeptoMail API key, which put both in git
# history on a public repo; values now come from a file and the environment so
# there is nothing here to leak.
#
# Prerequisites:
#   1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. Run: gcloud auth login
#   3. Download a service account JSON key from the Firebase console
#      (Project Settings -> Service accounts -> Generate new private key)
#
# Usage:
#   $env:ZEPTOMAIL_API_KEY = 'Zoho-enczapikey ...'
#   .\setup-secrets.ps1 -ServiceAccountFile C:\path\to\service-account.json

param(
    [Parameter(Mandatory = $true)]
    [string]$ServiceAccountFile
)

$ErrorActionPreference = "Stop"
$PROJECT_ID = "cfg-event-regportal"

if (-not (Test-Path $ServiceAccountFile)) {
    Write-Host "ERROR: service account file not found: $ServiceAccountFile" -ForegroundColor Red
    exit 1
}

if (-not $env:ZEPTOMAIL_API_KEY) {
    Write-Host "ERROR: set ZEPTOMAIL_API_KEY in your environment first." -ForegroundColor Red
    Write-Host "  `$env:ZEPTOMAIL_API_KEY = 'Zoho-enczapikey ...'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Creating secrets in Google Secret Manager for project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

Write-Host "`nEnabling Secret Manager API..." -ForegroundColor Yellow
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Create the secret, or add a new version when it already exists. The previous
# version of this script printed "updating..." on conflict but never actually
# updated anything, so a rotated value silently never reached production.
function Set-Secret {
    param([string]$Name, [string]$File)

    # $LASTEXITCODE, not $?, because $? reflects Out-Null rather than gcloud.
    gcloud secrets describe $Name --project=$PROJECT_ID 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        gcloud secrets versions add $Name --data-file=$File --project=$PROJECT_ID | Out-Null
        Write-Host "  $Name`: new version added"
    }
    else {
        gcloud secrets create $Name --data-file=$File --project=$PROJECT_ID --replication-policy="automatic" | Out-Null
        Write-Host "  $Name`: created"
    }
}

function Set-SecretValue {
    param([string]$Name, [string]$Value)

    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        # Write without a trailing newline or BOM so the stored value is exact.
        [System.IO.File]::WriteAllText($tmp, $Value, (New-Object System.Text.UTF8Encoding $false))
        Set-Secret -Name $Name -File $tmp
    }
    finally {
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`nFirebase Admin SDK credentials..." -ForegroundColor Yellow
# This is the only Firebase credential apphosting.yaml actually wires up.
# The older FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
# secrets are not referenced by the deploy config and are no longer created here.
Set-Secret -Name "FIREBASE_SERVICE_ACCOUNT_JSON" -File $ServiceAccountFile

Write-Host "`nZeptoMail credentials..." -ForegroundColor Yellow
Set-SecretValue -Name "ZEPTOMAIL_API_KEY" -Value $env:ZEPTOMAIL_API_KEY
$fromEmail = if ($env:ZEPTOMAIL_FROM_EMAIL) { $env:ZEPTOMAIL_FROM_EMAIL } else { "noreply@cfgafrica.com" }
$fromName = if ($env:ZEPTOMAIL_FROM_NAME) { $env:ZEPTOMAIL_FROM_NAME } else { "CFG Africa Events" }
Set-SecretValue -Name "ZEPTOMAIL_FROM_EMAIL" -Value $fromEmail
Set-SecretValue -Name "ZEPTOMAIL_FROM_NAME" -Value $fromName

Write-Host "`nCron shared secret..." -ForegroundColor Yellow
# The value Cloud Scheduler presents to /api/cron/reminders. Generated here so it
# is never checked into the repo. Left alone if it already exists, so re-running
# this script does not break the configured Scheduler job.
gcloud secrets describe CRON_SECRET --project=$PROJECT_ID 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  CRON_SECRET: already exists, keeping the existing value"
}
else {
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $CRON_SECRET = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
    Set-SecretValue -Name "CRON_SECRET" -Value $CRON_SECRET
    Write-Host "  Value: $CRON_SECRET"
    Write-Host "  Use it as the X-Cron-Secret header on the Cloud Scheduler job (see REMINDERS.md)."
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "Done. Redeploy App Hosting for new secret versions to take effect." -ForegroundColor Green
Write-Host "`nTo list secrets:"
Write-Host "  gcloud secrets list --project=$PROJECT_ID"
