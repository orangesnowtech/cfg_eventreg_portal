#!/bin/bash
set -euo pipefail

# Creates the secrets Firebase App Hosting reads at runtime.
#
# No credential is embedded in this file. An earlier version hardcoded the
# service account private key and the ZeptoMail API key, which put both in git
# history on a public repo; values now come from a file and the environment so
# there is nothing here to leak.
#
# Prerequisites:
#   1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. gcloud auth login
#   3. Download a service account JSON key from the Firebase console
#      (Project Settings -> Service accounts -> Generate new private key)
#
# Usage:
#   export ZEPTOMAIL_API_KEY='Zoho-enczapikey ...'
#   ./setup-secrets.sh /path/to/service-account.json

PROJECT_ID="cfg-event-regportal"
SERVICE_ACCOUNT_FILE="${1:-${SERVICE_ACCOUNT_FILE:-}}"

if [ -z "$SERVICE_ACCOUNT_FILE" ] || [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
  echo "ERROR: pass the path to your service account JSON key." >&2
  echo "  ./setup-secrets.sh /path/to/service-account.json" >&2
  exit 1
fi

if [ -z "${ZEPTOMAIL_API_KEY:-}" ]; then
  echo "ERROR: set ZEPTOMAIL_API_KEY in your environment first." >&2
  echo "  export ZEPTOMAIL_API_KEY='Zoho-enczapikey ...'" >&2
  exit 1
fi

echo "Creating secrets in Google Secret Manager for project: $PROJECT_ID"
echo "=================================================================="

echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID"

# Create the secret, or add a new version when it already exists. The previous
# version of this script printed "updating..." on conflict but never actually
# updated anything, so a rotated value silently never reached production.
upsert_secret() {
  local name="$1"
  local file="$2"

  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets versions add "$name" --data-file="$file" --project="$PROJECT_ID" >/dev/null
    echo "  $name: new version added"
  else
    gcloud secrets create "$name" \
      --data-file="$file" \
      --project="$PROJECT_ID" \
      --replication-policy="automatic" >/dev/null
    echo "  $name: created"
  fi
}

upsert_from_stdin() {
  local name="$1"
  local tmp
  tmp=$(mktemp)
  cat > "$tmp"
  upsert_secret "$name" "$tmp"
  rm -f "$tmp"
}

echo ""
echo "Firebase Admin SDK credentials..."
# This is the only Firebase credential apphosting.yaml actually wires up.
# The older FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
# secrets are not referenced by the deploy config and are no longer created here.
upsert_secret FIREBASE_SERVICE_ACCOUNT_JSON "$SERVICE_ACCOUNT_FILE"

echo ""
echo "ZeptoMail credentials..."
printf '%s' "$ZEPTOMAIL_API_KEY" | upsert_from_stdin ZEPTOMAIL_API_KEY
printf '%s' "${ZEPTOMAIL_FROM_EMAIL:-noreply@cfgafrica.com}" | upsert_from_stdin ZEPTOMAIL_FROM_EMAIL
printf '%s' "${ZEPTOMAIL_FROM_NAME:-CFG Africa Events}" | upsert_from_stdin ZEPTOMAIL_FROM_NAME

echo ""
echo "Cron shared secret..."
# The value Cloud Scheduler presents to /api/cron/reminders. Generated here so it
# is never checked into the repo. Left alone if it already exists, so re-running
# this script does not break the configured Scheduler job.
if gcloud secrets describe CRON_SECRET --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "  CRON_SECRET: already exists, keeping the existing value"
else
  CRON_SECRET=$(openssl rand -hex 24)
  printf '%s' "$CRON_SECRET" | gcloud secrets create CRON_SECRET \
    --data-file=- \
    --project="$PROJECT_ID" \
    --replication-policy="automatic" >/dev/null
  echo "  CRON_SECRET: created"
  echo "  Value: $CRON_SECRET"
  echo "  Use it as the X-Cron-Secret header on the Cloud Scheduler job (see REMINDERS.md)."
fi

echo ""
echo "=================================================================="
echo "Done. Redeploy App Hosting for new secret versions to take effect."
echo ""
echo "To list secrets:"
echo "  gcloud secrets list --project=$PROJECT_ID"
