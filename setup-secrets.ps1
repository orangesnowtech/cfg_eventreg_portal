# PowerShell script to create secrets in Google Secret Manager for Firebase App Hosting
# Run this script after authenticating with gcloud CLI
# Prerequisites:
#   1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. Run: gcloud auth login
#   3. Run: gcloud config set project cfg-event-regportal

$PROJECT_ID = "cfg-event-regportal"

Write-Host "Creating secrets in Google Secret Manager for project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Enable Secret Manager API (if not already enabled)
Write-Host "`nEnabling Secret Manager API..." -ForegroundColor Yellow
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Firebase Admin SDK Secrets
Write-Host "`nCreating FIREBASE_PROJECT_ID secret..." -ForegroundColor Yellow
"cfg-event-regportal" | gcloud secrets create FIREBASE_PROJECT_ID `
  --data-file=- `
  --project=$PROJECT_ID `
  --replication-policy="automatic" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Secret already exists, you can update it manually" -ForegroundColor Gray }

Write-Host "`nCreating FIREBASE_CLIENT_EMAIL secret..." -ForegroundColor Yellow
"firebase-adminsdk-fbsvc@cfg-event-regportal.iam.gserviceaccount.com" | gcloud secrets create FIREBASE_CLIENT_EMAIL `
  --data-file=- `
  --project=$PROJECT_ID `
  --replication-policy="automatic" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Secret already exists, you can update it manually" -ForegroundColor Gray }

Write-Host "`nCreating FIREBASE_PRIVATE_KEY secret..." -ForegroundColor Yellow
@"
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC33jiF0XSSj8f/
vPhb1Exfh4xxkC/T3WanfUqgIgzFFdKtHesVcLRD0/7W8ZdHQy2TPha/+heWVPOF
GAM0dMdQXYadZmuvA0L44/24wY2kVbjaddCI+fKaQ/FHr+6D8FFPTTImzo18jaif
aq23Mx6Yr4mGnpqADJbg+6YU3dCQMTljK+vm1TkV9b5yTUJkjWzOD3cLt5nwaPG4
MME+IlYxHUX0HIzVTSBuVOwx0DPf0g0Ghv/f7FKcE+4mEH3A2+VWLw/huKhxEv0n
20bTuc+mEHvK+nquB5cGptZzefDmbJ9h9yFuoynWfqCFFKqAJZSOX6X8jguL/WXA
W0gAfSuTAgMBAAECggEARSYOrcz7AU+PkM85vBdYbajlmaP3SL+AJsdI9HY5xTkS
1UZmLdcIBGZK9f0/vm42SqTUG3jru/7Q4qIIOoccmk3CHZnyL4yTeFUOC5jHMyGF
9qrONWWC5p9cs3AnzHjpq2BF1zBhJ5GC9AlDsZ1JCXUizH0Db9rMN2qMqFZPZJpq
3NfBv6bhc65gYr2IccWNxnHzQrSRnzXeD+qdatJ7VZML3VFDdm2IOAoZ3mOv+vQj
bsJJKSPp9lW8qwEMxxPoXDPhUWL/Il5qKWIR3qagpIkgj88KNUQLIuxqqnlFYn6J
X090AejVm6GinYD3JdYXQh5X5MIp1oJUovjap5brmQKBgQDq9cIfoZcWpz54ipy2
9qelKKV99FtcYArXCarkwPsiSJrrpVTgsDLk0qD5CDCEqPRzmcTvfeIZMKuHp+dF
c7hKVRFEG+9B93NX1CAT7BND0tYRciSDao8NGgeGCVwubDxmV6ZRa/Fw0y5J1J1R
Mo8CnrdWU/DnNb+NwaZEQMbXrQKBgQDIVToIr3iO8ku/6nleaQwJ5Gwa9znLf/uV
fEaNFrXnSQdJfOqK8SYBLWSuCMZ+25Yf7Dnf/LJPf79+Er6/oLaibf9Lm9zmqdfa
V7pK5qX2JCnWWSF6Ce/AruDWYf6Z5iiUYdXiFF0TkcOrZsb3WTqoU99BqAgWUXuU
nRFAhul4PwKBgQCfkV/Q05EklVhbzOc5arHX/I7Hx5f0WFWETNB+ooDre5uaxaGr
Jn6p4FHqTqGEtqmtiJSygS94JBGaA3GRPVG/SZ58PuxyRHdVAn72iLFcsmcnWflq
NogIQdEyOlEcRe2PI5+UVFaYZRNemMJuToPJJ7kjK8bDf0EkKIueds+T0QKBgBv0
UJHPsnn383wHQwJalDR5LGCi6OytojScz9d2ONHaTesCRFQ5DD2T0P27+b7P82Xm
97h6sYMIZ3c3NGjXC0UlJj+tsyh4wMcWAMfc4YG0UCY578LwygTQIk2oBPgCttzl
vgu7HbXSXER5pf/z8ox0j63AvcgnfKAjProLWV7PAoGAM44TmRsBIbvmJRWFFBWr
WyWfSR8n91pBpOUw4Ub+SKErEnD82Av041j4gDjLA7jpLl+MZQBf9/0KxMBHXVaH
jyTHVE9OQ9aElNlrncKZkTV+Rz50v4tnEbKrhvJf4cinpGCp1qC5KxlRiUXuc0jn
pZ3O457TZo3eDxuKFUQsxXY=
-----END PRIVATE KEY-----
"@ | gcloud secrets create FIREBASE_PRIVATE_KEY `
  --data-file=- `
  --project=$PROJECT_ID `
  --replication-policy="automatic" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Secret already exists, you can update it manually" -ForegroundColor Gray }

# Zeptomail Secrets
Write-Host "`nCreating ZEPTOMAIL_API_KEY secret..." -ForegroundColor Yellow
"Zoho-enczapikey wSsVR612rkakDfsvmGasLr8xmFhTA1uiQEUs3gSjvXX9G/vA8sdtk0OcB1TyHPAWFGFhHDNB8r96yx9T2zpb3th8zF8ACSiF9mqRe1U4J3x17qnvhDzMXWpVmhOPLY0Pwg5rk2BiG8Ak+g==" | gcloud secrets create ZEPTOMAIL_API_KEY `
  --data-file=- `
  --project=$PROJECT_ID `
  --replication-policy="automatic" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Secret already exists, you can update it manually" -ForegroundColor Gray }

Write-Host "`nCreating ZEPTOMAIL_FROM_EMAIL secret..." -ForegroundColor Yellow
"noreply@cfgafrica.com" | gcloud secrets create ZEPTOMAIL_FROM_EMAIL `
  --data-file=- `
  --project=$PROJECT_ID `
  --replication-policy="automatic" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Secret already exists, you can update it manually" -ForegroundColor Gray }

Write-Host "`nCreating ZEPTOMAIL_FROM_NAME secret..." -ForegroundColor Yellow
"CFG Africa Events" | gcloud secrets create ZEPTOMAIL_FROM_NAME `
  --data-file=- `
  --project=$PROJECT_ID `
  --replication-policy="automatic" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Secret already exists, you can update it manually" -ForegroundColor Gray }

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "✅ All secrets created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To verify secrets were created, run:" -ForegroundColor Yellow
Write-Host "  gcloud secrets list --project=$PROJECT_ID" -ForegroundColor White
Write-Host ""
Write-Host "To view a secret value, run:" -ForegroundColor Yellow
Write-Host "  gcloud secrets versions access latest --secret=FIREBASE_PROJECT_ID --project=$PROJECT_ID" -ForegroundColor White
